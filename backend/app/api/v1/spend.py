from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import BudgetThreshold, LoanApplication, User
from app.models.loan import (
    ApnaRashiLoanApplicationRequest,
    ApnaRashiLoanApplicationResponse,
    ApnaRashiLoanStatusUpdateRequest,
    ConfidenceBand,
    LoanApplicationListItem,
    LoanApplicationListResponse,
)
from app.models.spend import (
    SpendAnalysisResponse,
    SpendAlert,
    SpendSummary,
    SpendCategory,
    ConfidenceScoreResponse,
    AIInsightsResponse,
)

from app.services.spend_analyzer import (
    compute_spend_summary,
    compute_confidence_score,
    generate_alerts,
    generate_ai_insights,
    seed_demo_transactions_for_user,
)
from app.core.time import utcnow

router = APIRouter()

LOOKBACK_MONTHS = 6
APNA_RASHI_PARTNER = "APNA_RASHI_BANK"


def _normalize_confidence_score(raw_score: int) -> int:
    normalized = round(((raw_score - 300) / 600) * 100)
    return max(0, min(100, normalized))


def _to_confidence_band(raw_band: str, is_insufficient_data: bool) -> ConfidenceBand:
    if is_insufficient_data:
        return ConfidenceBand.INSUFFICIENT_DATA

    band_map = {
        "Excellent": ConfidenceBand.HIGH,
        "Good": ConfidenceBand.HIGH,
        "Fair": ConfidenceBand.MEDIUM,
        "Poor": ConfidenceBand.LOW,
    }
    return band_map.get(raw_band, ConfidenceBand.MEDIUM)


@router.get("/analyze/{user_id}", response_model=SpendAnalysisResponse)
async def get_spend_analysis(user_id: str, db: Session = Depends(get_db)):
    """
    Get full spend analysis: summary, category breakdown, and alerts.
    """
    summary = compute_spend_summary(db, user_id, period="monthly")
    alerts = generate_alerts(db, user_id)
    return SpendAnalysisResponse(summary=summary, alerts=alerts)


@router.get("/summary/{user_id}", response_model=SpendSummary)
async def get_spend_summary(
    user_id: str, period: str = "monthly", db: Session = Depends(get_db)
):
    """
    Get spend summary for a specific period (daily, weekly, monthly).
    """
    if period not in ["daily", "weekly", "monthly"]:
        raise HTTPException(
            status_code=400, detail="Period must be daily, weekly, or monthly"
        )
    return compute_spend_summary(db, user_id, period)


class BudgetSetRequest(BaseModel):
    category: SpendCategory
    monthly_limit: float


@router.post("/budget/{user_id}")
async def set_budget(
    user_id: str, budget: BudgetSetRequest, db: Session = Depends(get_db)
):
    """
    Set or update a monthly budget limit for a category.
    """
    existing = (
        db.query(BudgetThreshold)
        .filter(
            BudgetThreshold.user_id == user_id,
            BudgetThreshold.category == budget.category.value,
        )
        .first()
    )

    if existing:
        existing.monthly_limit = budget.monthly_limit
        existing.updated_at = datetime.utcnow()
    else:
        new_budget = BudgetThreshold(
            user_id=user_id,
            category=budget.category.value,
            monthly_limit=budget.monthly_limit,
        )
        db.add(new_budget)

    db.commit()
    return {
        "status": "success",
        "message": f"Budget for {budget.category.value} set to {budget.monthly_limit}",
    }


@router.get("/alerts/{user_id}", response_model=List[SpendAlert])
async def get_spend_alerts(user_id: str, db: Session = Depends(get_db)):
    """
    Get active budget alerts and spend anomalies.
    """
    return generate_alerts(db, user_id)


@router.get("/insights/{user_id}", response_model=AIInsightsResponse)
async def get_ai_insights(
    user_id: str,
    period: str = "monthly",
    db: Session = Depends(get_db),
):
    """
    Get AI-driven insights for a user's spending patterns.
    """
    if period not in ["daily", "weekly", "monthly"]:
        raise HTTPException(
            status_code=400, detail="Period must be daily, weekly, or monthly"
        )
    insights = generate_ai_insights(db, user_id, period=period)
    return AIInsightsResponse(
        user_id=user_id,
        generated_at=utcnow().isoformat(),
        insights=insights,
        total=len(insights),
    )


@router.get("/credit-score/{user_id}", response_model=ConfidenceScoreResponse)
async def get_credit_score(
    user_id: str,
    lookback_months: int = 6,
    db: Session = Depends(get_db),
):
    """
    Get lender-facing confidence score for a user based on spend behavior.
    """
    if lookback_months < 3 or lookback_months > 24:
        raise HTTPException(
            status_code=400,
            detail="lookback_months must be between 3 and 24",
        )

    return ConfidenceScoreResponse(
        user_id=user_id,
        lookback_months=lookback_months,
        generated_at=utcnow().isoformat(),
        credit_score=compute_confidence_score(db, user_id, lookback_months=lookback_months),
    )


@router.post("/seed-demo/{user_id}")
async def seed_demo_activity(
    user_id: str,
    count: int = 24,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Seed demo transactions for the authenticated user.
    Self-access only.
    """
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    if count < 5 or count > 200:
        raise HTTPException(status_code=400, detail="count must be between 5 and 200")

    created = seed_demo_transactions_for_user(db, user_id=user_id, count=count)
    return {
        "status": "success",
        "user_id": user_id,
        "created_count": created,
    }


@router.post("/loan/apply-apnarashi", response_model=ApnaRashiLoanApplicationResponse)
async def apply_apna_rashi_loan_from_spend(
    body: ApnaRashiLoanApplicationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_merchant:
        raise HTTPException(status_code=403, detail="Only merchants can apply for loans")

    if not body.consent:
        raise HTTPException(
            status_code=400,
            detail="Consent is required to share confidence score and cash-flow summary",
        )

    confidence = compute_confidence_score(db, current_user.id, LOOKBACK_MONTHS)
    normalized_score = _normalize_confidence_score(confidence.score)
    normalized_band = _to_confidence_band(confidence.band, confidence.is_insufficient_data)

    application = LoanApplication(
        user_id=current_user.id,
        partner=APNA_RASHI_PARTNER,
        requested_amount=float(body.requested_amount),
        requested_tenor_months=body.requested_tenor_months,
        confidence_score=normalized_score,
        confidence_band=normalized_band.value,
        lookback_period_months=LOOKBACK_MONTHS,
        status="PENDING_BANK",
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    return ApnaRashiLoanApplicationResponse(
        application_id=application.id,
        status=application.status,
        confidence_score=application.confidence_score,
        confidence_band=ConfidenceBand(application.confidence_band),
        lookback_period_months=application.lookback_period_months,
    )


@router.get("/loan/applications", response_model=LoanApplicationListResponse)
async def list_loan_applications_from_spend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_merchant:
        raise HTTPException(status_code=403, detail="Only merchants can view loan applications")

    rows = (
        db.query(LoanApplication)
        .filter(LoanApplication.user_id == current_user.id)
        .order_by(LoanApplication.created_at.desc())
        .all()
    )

    items = [
        LoanApplicationListItem(
            application_id=row.id,
            partner=row.partner,
            requested_amount=row.requested_amount,
            requested_tenor_months=row.requested_tenor_months,
            confidence_score=row.confidence_score,
            confidence_band=ConfidenceBand(row.confidence_band),
            status=row.status,
            created_at=row.created_at.isoformat() if row.created_at else "",
        )
        for row in rows
    ]

    return LoanApplicationListResponse(applications=items, total=len(items))


@router.post("/loan/apnarashi-callback", response_model=ApnaRashiLoanApplicationResponse)
async def apna_rashi_callback_from_spend(
    body: ApnaRashiLoanStatusUpdateRequest,
    db: Session = Depends(get_db),
    partner_token: str | None = Header(default=None, alias="x-partner-token"),
):
    if partner_token != settings.APNA_RASHI_CALLBACK_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid partner token")

    row = (
        db.query(LoanApplication)
        .filter(
            LoanApplication.id == body.application_id,
            LoanApplication.partner == APNA_RASHI_PARTNER,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Loan application not found")

    row.status = body.status
    row.updated_at = utcnow()
    db.commit()
    db.refresh(row)

    return ApnaRashiLoanApplicationResponse(
        application_id=row.id,
        status=row.status,
        confidence_score=row.confidence_score,
        confidence_band=ConfidenceBand(row.confidence_band),
        lookback_period_months=row.lookback_period_months,
    )

