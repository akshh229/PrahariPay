from datetime import timedelta
from typing import List, Optional
import uuid
import random
from statistics import pstdev

from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.core.time import utcnow
from app.db.models import TransactionRecord, BudgetThreshold
from app.models.spend import (
    SpendCategory,
    SpendSummary,
    SpendAlert,
    CategoryBreakdown,
    ConfidenceFactor,
    CreditScoreForLenders,
    AIInsight,
    AIInsightType,
    AIInsightSeverity,
)


def categorize_transaction(
    tx_description: str | None,
    merchant_id: str | None = None,
    receiver_id: str | None = None,
) -> SpendCategory:
    """
    Assign a category to a transaction based on description or merchant rules.
    Simple keyword matching for MVP.
    """
    combined = " ".join(
        [part for part in [tx_description, merchant_id, receiver_id] if part]
    ).upper()

    if any(k in combined for k in ["FOOD", "RESTAURANT", "GROCERY", "CAFE", "DINNER", "SWIGGY", "ZOMATO"]):
        return SpendCategory.FOOD
    if any(k in combined for k in ["UBER", "OLA", "METRO", "FUEL", "PETROL", "USER_TRAVEL", "CAB", "TAXI"]):
        return SpendCategory.TRANSPORT
    if any(k in combined for k in ["BILL", "ELECTRICITY", "RECHARGE", "WIFI", "POWER", "WATER", "GAS", "RENT"]):
        return SpendCategory.UTILITIES
    if any(k in combined for k in ["MOVIE", "NETFLIX", "GAME", "ENTERTAINMENT", "PRIME", "SPOTIFY"]):
        return SpendCategory.ENTERTAINMENT
    if any(k in combined for k in ["PHARMACY", "DOCTOR", "HOSPITAL", "MEDICINE", "CLINIC"]):
        return SpendCategory.HEALTH
    if any(k in combined for k in ["TRANSFER", "SEND", "P2P", "UPI", "PAYMENT", "@PPAY"]):
        return SpendCategory.TRANSFER

    if not merchant_id and receiver_id:
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


def compute_confidence_score(
    db: Session, user_id: str, lookback_months: int = 6
) -> CreditScoreForLenders:
    """
    Compute a lender-facing confidence score from transactional behavior.
    Score range: 300 - 900.
    """
    now = utcnow()
    start_date = now - timedelta(days=30 * lookback_months)

    outgoing = (
        db.query(TransactionRecord)
        .filter(
            TransactionRecord.sender_id == user_id,
            TransactionRecord.timestamp >= start_date,
        )
        .all()
    )
    incoming = (
        db.query(TransactionRecord)
        .filter(
            TransactionRecord.receiver_id == user_id,
            TransactionRecord.timestamp >= start_date,
        )
        .all()
    )

    all_rows = outgoing + incoming
    history_months = len({(tx.timestamp.year, tx.timestamp.month) for tx in all_rows if tx.timestamp})

    if len(outgoing) < 5 or history_months < 2:
        return CreditScoreForLenders(
            score=0,
            band="Insufficient Data",
            summary="Not enough transaction history to compute a reliable confidence score.",
            factors=[
                ConfidenceFactor(
                    name="Transaction History",
                    score=min(100, len(outgoing) * 10),
                    impact="neutral",
                    description="At least 5 outgoing transactions across 2+ months are required.",
                )
            ],
            utilization_pct=0.0,
            on_time_payment_ratio=0.0,
            income_stability_ratio=0.0,
            savings_buffer_ratio=0.0,
            txn_history_months=history_months,
            recommended_limit=None,
            risk_level="unknown",
            is_insufficient_data=True,
        )

    monthly_income = [0.0 for _ in range(lookback_months)]
    for tx in incoming:
        if not tx.timestamp:
            continue
        month_delta = (now.year - tx.timestamp.year) * 12 + (now.month - tx.timestamp.month)
        if 0 <= month_delta < lookback_months:
            index = lookback_months - 1 - month_delta
            monthly_income[index] += tx.amount

    total_outgoing = sum(tx.amount for tx in outgoing)
    total_incoming = sum(tx.amount for tx in incoming)
    avg_monthly_outgoing = total_outgoing / lookback_months
    avg_monthly_income = total_incoming / lookback_months if total_incoming > 0 else 0.0

    utilization_pct = (
        min(100.0, (avg_monthly_outgoing / max(avg_monthly_income, 1.0)) * 100.0)
        if avg_monthly_outgoing > 0
        else 0.0
    )

    risky_count = sum(
        1
        for tx in outgoing
        if (tx.risk_score is not None and tx.risk_score >= 0.7)
        or (tx.classification is not None and tx.classification.lower() in ["fraud", "high_risk"])
    )
    on_time_payment_ratio = max(0.0, ((len(outgoing) - risky_count) / max(len(outgoing), 1)) * 100.0)

    if avg_monthly_income > 0:
        volatility_pct = (pstdev(monthly_income) / avg_monthly_income) * 100.0
        income_stability_ratio = max(0.0, min(100.0, 100.0 - volatility_pct))
    else:
        income_stability_ratio = 0.0

    savings_buffer_ratio = (
        max(0.0, min(100.0, ((avg_monthly_income - avg_monthly_outgoing) / avg_monthly_income) * 100.0))
        if avg_monthly_income > 0
        else 0.0
    )

    healthy_utilization = max(0.0, 100.0 - utilization_pct)
    weighted_raw = (
        on_time_payment_ratio * 0.35
        + income_stability_ratio * 0.25
        + savings_buffer_ratio * 0.25
        + healthy_utilization * 0.15
    )
    score = int(round(300 + (weighted_raw / 100.0) * 600))
    score = max(300, min(900, score))

    if score >= 780:
        band = "Excellent"
        risk_level = "low"
    elif score >= 700:
        band = "Good"
        risk_level = "low-medium"
    elif score >= 620:
        band = "Fair"
        risk_level = "medium"
    else:
        band = "Poor"
        risk_level = "high"

    recommended_multiplier = {
        "Excellent": 2.5,
        "Good": 2.0,
        "Fair": 1.2,
        "Poor": 0.7,
    }[band]
    recommended_limit = round(avg_monthly_income * recommended_multiplier, 2) if avg_monthly_income > 0 else 0.0

    factors = [
        ConfidenceFactor(
            name="On-Time Payment Behavior",
            score=round(on_time_payment_ratio),
            impact="positive" if on_time_payment_ratio >= 80 else "negative",
            description=f"{len(outgoing) - risky_count} of {len(outgoing)} outgoing transactions were low-risk.",
        ),
        ConfidenceFactor(
            name="Spending Utilization",
            score=round(healthy_utilization),
            impact="positive" if utilization_pct <= 70 else "negative",
            description=f"Average utilization is {utilization_pct:.1f}% of monthly incoming flow.",
        ),
        ConfidenceFactor(
            name="Income Stability",
            score=round(income_stability_ratio),
            impact="positive" if income_stability_ratio >= 60 else "neutral",
            description="Measures month-to-month consistency of incoming transactions.",
        ),
        ConfidenceFactor(
            name="Savings Buffer",
            score=round(savings_buffer_ratio),
            impact="positive" if savings_buffer_ratio >= 20 else "negative",
            description="Compares average incoming and outgoing monthly flows.",
        ),
    ]

    summary = (
        f"{band} confidence profile with {on_time_payment_ratio:.1f}% low-risk payment behavior "
        f"and {income_stability_ratio:.1f}% income stability over {history_months} months."
    )

    return CreditScoreForLenders(
        score=score,
        band=band,
        summary=summary,
        factors=factors,
        utilization_pct=round(utilization_pct, 1),
        on_time_payment_ratio=round(on_time_payment_ratio, 1),
        income_stability_ratio=round(income_stability_ratio, 1),
        savings_buffer_ratio=round(savings_buffer_ratio, 1),
        txn_history_months=history_months,
        recommended_limit=recommended_limit,
        risk_level=risk_level,
        is_insufficient_data=False,
    )


def generate_ai_insights(
    db: Session, user_id: str, period: str = "monthly"
) -> List[AIInsight]:
    """
    Analyse a user's transaction history and generate rich AI-driven insights.
    Insight categories:
      - Anomaly:        Unusual spend spikes in a category
      - Budget:         Budget breach / near-breach warnings
      - Prediction:     Velocity-based overspend forecasts
      - Positive:       Good habits (spending down, low risk)
      - Recurring:      Repeated payments detected
      - Savings:        Savings-opportunity identification
      - Category shift: Major category-mix changes period-over-period
      - Trend:          Overall spending direction
    """
    now = utcnow()
    insights: List[AIInsight] = []

    # ── time windows ────────────────────────────────────────────────
    if period == "daily":
        span = timedelta(days=1)
    elif period == "weekly":
        span = timedelta(weeks=1)
    else:
        span = timedelta(days=30)

    cur_start = now - span
    prev_start = cur_start - span

    # ── query current & previous period transactions ────────────────
    cur_txs = (
        db.query(TransactionRecord)
        .filter(
            TransactionRecord.sender_id == user_id,
            TransactionRecord.timestamp >= cur_start,
        )
        .all()
    )
    prev_txs = (
        db.query(TransactionRecord)
        .filter(
            TransactionRecord.sender_id == user_id,
            TransactionRecord.timestamp >= prev_start,
            TransactionRecord.timestamp < cur_start,
        )
        .all()
    )
    incoming_txs = (
        db.query(TransactionRecord)
        .filter(
            TransactionRecord.receiver_id == user_id,
            TransactionRecord.timestamp >= cur_start,
        )
        .all()
    )

    # ── aggregate helpers ────────────────────────────────────────────
    def by_category(txs):
        cats: dict[str, float] = {}
        for tx in txs:
            c = tx.category or SpendCategory.OTHER.value
            cats[c] = cats.get(c, 0) + tx.amount
        return cats

    cur_cats = by_category(cur_txs)
    prev_cats = by_category(prev_txs)

    cur_total = sum(cur_cats.values())
    prev_total = sum(prev_cats.values())
    incoming_total = sum(tx.amount for tx in incoming_txs)

    seq = 0

    def _id():
        nonlocal seq
        seq += 1
        return f"ai_{uuid.uuid4().hex[:12]}"

    # ── 1. Overall Trend ────────────────────────────────────────────
    if prev_total > 0:
        trend_pct = ((cur_total - prev_total) / prev_total) * 100
    elif cur_total > 0:
        trend_pct = 100.0
    else:
        trend_pct = 0.0

    if cur_total > 0 or prev_total > 0:
        if trend_pct < -5:
            insights.append(
                AIInsight(
                    id=_id(),
                    type=AIInsightType.POSITIVE,
                    severity=AIInsightSeverity.INFO,
                    title="Spending Down",
                    message=f"Overall spending decreased by {abs(trend_pct):.1f}% compared to the previous period. Keep it up!",
                    icon="trending_down",
                    pct_change=round(trend_pct, 1),
                    created_at=now.isoformat(),
                )
            )
        elif trend_pct > 10:
            insights.append(
                AIInsight(
                    id=_id(),
                    type=AIInsightType.TREND,
                    severity=AIInsightSeverity.MEDIUM,
                    title="Spending Spike",
                    message=f"Your spending jumped {trend_pct:.1f}% this period. Review your recent transactions.",
                    icon="trending_up",
                    pct_change=round(trend_pct, 1),
                    actionable=True,
                    created_at=now.isoformat(),
                )
            )
        else:
            insights.append(
                AIInsight(
                    id=_id(),
                    type=AIInsightType.TREND,
                    severity=AIInsightSeverity.INFO,
                    title="Spend Trend Stable",
                    message=f"Spending is roughly in line with the previous period ({trend_pct:+.1f}%).",
                    icon="balance",
                    pct_change=round(trend_pct, 1),
                    created_at=now.isoformat(),
                )
            )

    # ── 2. Category Anomalies ───────────────────────────────────────
    for cat, cur_amt in cur_cats.items():
        prev_amt = prev_cats.get(cat, 0)
        if prev_amt > 0 and cur_amt > prev_amt * 1.5 and cur_amt > 200:
            cat_pct = ((cur_amt - prev_amt) / prev_amt) * 100
            cat_label = cat.replace("_", " ").title()
            insights.append(
                AIInsight(
                    id=_id(),
                    type=AIInsightType.ANOMALY,
                    severity=AIInsightSeverity.HIGH if cat_pct > 100 else AIInsightSeverity.MEDIUM,
                    title=f"Spike in {cat_label}",
                    message=f"{cat_label} spending surged {cat_pct:.0f}% (₹{prev_amt:.0f} → ₹{cur_amt:.0f}). Check for unusual charges.",
                    icon="warning",
                    category=SpendCategory(cat) if cat in SpendCategory.__members__ else None,
                    amount=round(cur_amt, 2),
                    pct_change=round(cat_pct, 1),
                    actionable=True,
                    created_at=now.isoformat(),
                )
            )

    # ── 3. Budget Alerts ────────────────────────────────────────────
    budgets = (
        db.query(BudgetThreshold)
        .filter(BudgetThreshold.user_id == user_id, BudgetThreshold.alert_enabled == True)
        .all()
    )
    budget_map = {b.category: b.monthly_limit for b in budgets}

    for cat, amt in cur_cats.items():
        limit = budget_map.get(cat)
        if limit and amt > limit:
            overshoot = amt - limit
            insights.append(
                AIInsight(
                    id=_id(),
                    type=AIInsightType.BUDGET,
                    severity=AIInsightSeverity.HIGH,
                    title=f"Budget Exceeded",
                    message=f"You exceeded your {cat.replace('_', ' ').title()} budget by ₹{overshoot:.0f} (limit ₹{limit:.0f}).",
                    icon="error",
                    category=SpendCategory(cat) if cat in SpendCategory.__members__ else None,
                    amount=round(overshoot, 2),
                    actionable=True,
                    created_at=now.isoformat(),
                )
            )
        elif limit and amt > limit * 0.85:
            pct_used = (amt / limit) * 100
            insights.append(
                AIInsight(
                    id=_id(),
                    type=AIInsightType.BUDGET,
                    severity=AIInsightSeverity.MEDIUM,
                    title="Nearing Budget",
                    message=f"{cat.replace('_', ' ').title()} is at {pct_used:.0f}% of its ₹{limit:.0f} limit.",
                    icon="data_usage",
                    category=SpendCategory(cat) if cat in SpendCategory.__members__ else None,
                    amount=round(amt, 2),
                    created_at=now.isoformat(),
                )
            )

    # ── 4. Velocity-Based Overspend Prediction ──────────────────────
    if period == "monthly" and cur_total > 0:
        days_elapsed = max(1, (now - cur_start).days)
        daily_velocity = cur_total / days_elapsed
        projected_monthly = daily_velocity * 30
        if incoming_total > 0 and projected_monthly > incoming_total * 1.1:
            excess = projected_monthly - incoming_total
            insights.append(
                AIInsight(
                    id=_id(),
                    type=AIInsightType.PREDICTION,
                    severity=AIInsightSeverity.HIGH,
                    title="Overspend Forecast",
                    message=f"At your current pace (₹{daily_velocity:.0f}/day), projected monthly spend is ₹{projected_monthly:.0f} — exceeding your income by ₹{excess:.0f}.",
                    icon="speed",
                    amount=round(projected_monthly, 2),
                    actionable=True,
                    created_at=now.isoformat(),
                )
            )
        elif prev_total > 0 and projected_monthly > prev_total * 1.2:
            insights.append(
                AIInsight(
                    id=_id(),
                    type=AIInsightType.PREDICTION,
                    severity=AIInsightSeverity.MEDIUM,
                    title="Higher Spend Projected",
                    message=f"You're on track to spend ₹{projected_monthly:.0f} this month, 20%+ above last period.",
                    icon="speed",
                    amount=round(projected_monthly, 2),
                    created_at=now.isoformat(),
                )
            )

    # ── 5. Recurring Payment Detection ──────────────────────────────
    receiver_counts: dict[str, int] = {}
    receiver_amounts: dict[str, float] = {}
    for tx in cur_txs:
        rid = tx.receiver_id or "unknown"
        receiver_counts[rid] = receiver_counts.get(rid, 0) + 1
        receiver_amounts[rid] = receiver_amounts.get(rid, 0) + tx.amount

    for rid, count in receiver_counts.items():
        if count >= 3:
            avg_each = receiver_amounts[rid] / count
            short_id = rid[:12] if len(rid) > 12 else rid
            insights.append(
                AIInsight(
                    id=_id(),
                    type=AIInsightType.RECURRING,
                    severity=AIInsightSeverity.INFO,
                    title="Recurring Payment",
                    message=f"You've sent {count} payments (avg ₹{avg_each:.0f}) to {short_id}. Is this a subscription?",
                    icon="autorenew",
                    amount=round(receiver_amounts[rid], 2),
                    created_at=now.isoformat(),
                )
            )

    # ── 6. Savings Opportunities ────────────────────────────────────
    if incoming_total > 0 and cur_total > 0:
        savings_ratio = (incoming_total - cur_total) / incoming_total
        if savings_ratio >= 0.3:
            insights.append(
                AIInsight(
                    id=_id(),
                    type=AIInsightType.SAVINGS,
                    severity=AIInsightSeverity.INFO,
                    title="Great Savings!",
                    message=f"You saved {savings_ratio * 100:.0f}% of your income this period. Consider investing the surplus.",
                    icon="savings",
                    pct_change=round(savings_ratio * 100, 1),
                    created_at=now.isoformat(),
                )
            )
        elif savings_ratio < 0.05 and savings_ratio >= 0:
            insights.append(
                AIInsight(
                    id=_id(),
                    type=AIInsightType.SAVINGS,
                    severity=AIInsightSeverity.MEDIUM,
                    title="Low Savings Buffer",
                    message=f"Only {savings_ratio * 100:.1f}% of income saved. Try reducing discretionary spending.",
                    icon="savings",
                    pct_change=round(savings_ratio * 100, 1),
                    actionable=True,
                    created_at=now.isoformat(),
                )
            )

    # ── 7. Category Shift Detection ─────────────────────────────────
    if prev_total > 0 and cur_total > 0:
        all_cats = set(list(cur_cats.keys()) + list(prev_cats.keys()))
        for cat in all_cats:
            cur_share = (cur_cats.get(cat, 0) / cur_total) * 100
            prev_share = (prev_cats.get(cat, 0) / prev_total) * 100
            shift = cur_share - prev_share
            if abs(shift) >= 15 and cur_cats.get(cat, 0) > 100:
                direction = "increased" if shift > 0 else "decreased"
                cat_label = cat.replace("_", " ").title()
                insights.append(
                    AIInsight(
                        id=_id(),
                        type=AIInsightType.CATEGORY_SHIFT,
                        severity=AIInsightSeverity.LOW,
                        title=f"{cat_label} Share Shift",
                        message=f"{cat_label} share {direction} by {abs(shift):.0f} points ({prev_share:.0f}% → {cur_share:.0f}%).",
                        icon="swap_horiz",
                        category=SpendCategory(cat) if cat in SpendCategory.__members__ else None,
                        pct_change=round(shift, 1),
                        created_at=now.isoformat(),
                    )
                )

    # ── 8. Risk-Flagged Transaction Warning ─────────────────────────
    risky_txs = [
        tx for tx in cur_txs
        if (tx.risk_score is not None and tx.risk_score >= 0.7)
        or (tx.classification and tx.classification.lower() in ["fraud", "high_risk"])
    ]
    if risky_txs:
        risky_total = sum(tx.amount for tx in risky_txs)
        insights.append(
            AIInsight(
                id=_id(),
                type=AIInsightType.ANOMALY,
                severity=AIInsightSeverity.HIGH,
                title="High-Risk Transactions",
                message=f"{len(risky_txs)} transaction(s) totalling ₹{risky_total:.0f} were flagged as high-risk. Review them immediately.",
                icon="gpp_bad",
                amount=round(risky_total, 2),
                actionable=True,
                created_at=now.isoformat(),
            )
        )

    # ── 9. Positive: Low-risk behaviour ─────────────────────────────
    if len(cur_txs) >= 5 and not risky_txs:
        insights.append(
            AIInsight(
                id=_id(),
                type=AIInsightType.POSITIVE,
                severity=AIInsightSeverity.INFO,
                title="Clean Transaction History",
                message=f"All {len(cur_txs)} transactions this period are low-risk. Your payment behaviour is excellent.",
                icon="verified",
                created_at=now.isoformat(),
            )
        )

    # ── Fallback: no insights ───────────────────────────────────────
    if not insights:
        insights.append(
            AIInsight(
                id=_id(),
                type=AIInsightType.POSITIVE,
                severity=AIInsightSeverity.INFO,
                title="All Clear",
                message="No anomalies detected. Your spending is within normal patterns.",
                icon="check_circle",
                created_at=now.isoformat(),
            )
        )

    # sort: high severity first, then medium, then low/info
    severity_order = {"high": 0, "medium": 1, "low": 2, "info": 3}
    insights.sort(key=lambda i: severity_order.get(i.severity, 9))

    return insights


def seed_demo_transactions_for_user(
    db: Session,
    user_id: str,
    count: int = 24,
    lookback_days: int = 60,
) -> int:
    """Create realistic demo incoming/outgoing transactions for one user."""
    rng = random.Random(f"seed::{user_id}")
    now = utcnow()

    categories = [
        SpendCategory.FOOD.value,
        SpendCategory.TRANSPORT.value,
        SpendCategory.UTILITIES.value,
        SpendCategory.ENTERTAINMENT.value,
        SpendCategory.HEALTH.value,
        SpendCategory.TRANSFER.value,
        SpendCategory.OTHER.value,
    ]

    to_create: List[TransactionRecord] = []
    for idx in range(count):
        is_incoming = (idx % 3 == 0)
        tx_time = now - timedelta(days=rng.randint(1, lookback_days), minutes=rng.randint(0, 1439))

        if is_incoming:
            amount = round(rng.uniform(1200.0, 6500.0), 2)
            sender = f"income_source_{rng.randint(1, 6)}"
            receiver = user_id
            category = SpendCategory.TRANSFER.value
            risk_score = round(rng.uniform(0.02, 0.35), 2)
            classification = "normal"
        else:
            amount = round(rng.uniform(120.0, 2400.0), 2)
            sender = user_id
            receiver = f"merchant_demo_{rng.randint(1, 14)}"
            category = rng.choice(categories)
            risk_score = round(rng.uniform(0.02, 0.75), 2)
            classification = "high_risk" if risk_score >= 0.72 else "normal"

        to_create.append(
            TransactionRecord(
                transaction_id=f"seed_tx_{uuid.uuid4().hex[:16]}",
                sender_id=sender,
                receiver_id=receiver,
                merchant_id="merchant_001",
                invoice_id=None,
                amount=amount,
                timestamp=tx_time,
                token_id=f"seed_tok_{uuid.uuid4().hex[:14]}",
                signature="seed_signature",
                propagated_to_peers=rng.randint(1, 5),
                synced=True,
                risk_score=risk_score,
                classification=classification,
                risk_flags='[]',
                category=category,
            )
        )

    db.add_all(to_create)
    db.commit()
    return len(to_create)
