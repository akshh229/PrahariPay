from datetime import timedelta
from typing import List, Optional
import uuid

from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.core.time import utcnow
from app.db.models import TransactionRecord, BudgetThreshold
from app.models.spend import (
    SpendCategory,
    SpendSummary,
    SpendAlert,
    CategoryBreakdown,
)


def categorize_transaction(
    tx_description: str, merchant_id: str = None
) -> SpendCategory:
    """
    Assign a category to a transaction based on description or merchant rules.
    Simple keyword matching for MVP.
    """
    desc = tx_description.upper() if tx_description else ""

    if any(k in desc for k in ["FOOD", "RESTAURANT", "GROCERY", "CAFE", "DINNER"]):
        return SpendCategory.FOOD
    if any(k in desc for k in ["UBER", "OLA", "METRO", "FUEL", "PETROL", "USER_TRAVEL"]):
        return SpendCategory.TRANSPORT
    if any(k in desc for k in ["BILL", "ELECTRICITY", "RECHARGE", "WIFI", "POWER"]):
        return SpendCategory.UTILITIES
    if any(k in desc for k in ["MOVIE", "NETFLIX", "GAME", "ENTERTAINMENT"]):
        return SpendCategory.ENTERTAINMENT
    if any(k in desc for k in ["PHARMACY", "DOCTOR", "HOSPITAL", "MEDICINE"]):
        return SpendCategory.HEALTH
    if any(k in desc for k in ["TRANSFER", "SEND", "P2P"]):
        return SpendCategory.TRANSFER

    return SpendCategory.OTHER


def compute_spend_summary(
    db: Session, user_id: str, period: str = "monthly"
) -> SpendSummary:
    """
    Aggregate spend for a user over a given period (daily/weekly/monthly).
    """
    now = utcnow()
    
    if period == "daily":
        start_date = now - timedelta(days=1)
        prev_start = start_date - timedelta(days=1)
    elif period == "weekly":
        start_date = now - timedelta(weeks=1)
        prev_start = start_date - timedelta(weeks=1)
    else:  # monthly
        start_date = now - timedelta(days=30)
        prev_start = start_date - timedelta(days=30)

    # Current period totals by category
    current_stats = (
        db.query(
            TransactionRecord.category,
            func.sum(TransactionRecord.amount).label("total"),
        )
        .filter(
            TransactionRecord.sender_id == user_id,
            TransactionRecord.timestamp >= start_date,
        )
        .group_by(TransactionRecord.category)
        .all()
    )

    total_amount = sum((stat.total or 0) for stat in current_stats)

    # Previous period total for trend calculation
    prev_total = (
        db.query(func.sum(TransactionRecord.amount))
        .filter(
            TransactionRecord.sender_id == user_id,
            TransactionRecord.timestamp >= prev_start,
            TransactionRecord.timestamp < start_date,
        )
        .scalar()
        or 0.0
    )

    # Calculate trend percentage
    if prev_total > 0:
        trend_pct = ((total_amount - prev_total) / prev_total) * 100
    else:
        trend_pct = 100.0 if total_amount > 0 else 0.0

    trend_direction = "flat"
    if trend_pct > 0.1:
        trend_direction = "up"
    elif trend_pct < -0.1:
        trend_direction = "down"

    # Fetch budget limits
    budgets = (
        db.query(BudgetThreshold)
        .filter(BudgetThreshold.user_id == user_id)
        .all()
    )
    budget_map = {b.category: b.monthly_limit for b in budgets}

    # Build category breakdown
    breakdown = []
    for cat, amount in current_stats:
        cat_enum = SpendCategory(cat) if cat else SpendCategory.OTHER
        pct = (amount / total_amount * 100) if total_amount > 0 else 0
        breakdown.append(
            CategoryBreakdown(
                category=cat_enum,
                amount=amount,
                percentage=round(pct, 1),
                budget_limit=budget_map.get(cat_enum),
            )
        )

    # Sort breakdown by amount desc
    breakdown.sort(key=lambda x: x.amount, reverse=True)

    return SpendSummary(
        period=period,
        total_amount=total_amount,
        trend_pct=round(trend_pct, 1),
        trend_direction=trend_direction,
        breakdown=breakdown,
    )


def generate_alerts(db: Session, user_id: str) -> List[SpendAlert]:
    """
    Generate alerts for budget breaches and anomalous spending.
    """
    alerts = []
    
    # Check Budget Breaches (Monthly)
    month_start = utcnow() - timedelta(days=30)
    
    cat_totals = (
        db.query(
            TransactionRecord.category,
            func.sum(TransactionRecord.amount).label("total"),
        )
        .filter(
            TransactionRecord.sender_id == user_id,
            TransactionRecord.timestamp >= month_start,
        )
        .group_by(TransactionRecord.category)
        .all()
    )
    
    budgets = (
        db.query(BudgetThreshold)
        .filter(BudgetThreshold.user_id == user_id, BudgetThreshold.alert_enabled == True)
        .all()
    )
    budget_map = {b.category: b.monthly_limit for b in budgets}

    for cat_name, total in cat_totals:
        if not cat_name:
            continue
            
        limit = budget_map.get(cat_name)
        if limit and total > limit:
            alerts.append(
                SpendAlert(
                    id=str(uuid.uuid4()),
                    type="BUDGET",
                    severity="high",
                    message=f"You exceeded your {cat_name} budget of ₹{limit}. Current spend: ₹{total}.",
                    created_at=utcnow().isoformat(),
                    category=SpendCategory(cat_name),
                )
            )
        elif limit and total > (limit * 0.85):
            alerts.append(
                SpendAlert(
                    id=str(uuid.uuid4()),
                    type="BUDGET",
                    severity="medium",
                    message=f"You are nearing your {cat_name} budget (85% used).",
                    created_at=utcnow().isoformat(),
                    category=SpendCategory(cat_name),
                )
            )

    return alerts
