from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.time import utcnow
from app.db.database import get_db
from app.db.models import LoanApplication, User
from app.models.loan import (
    ApnaRashiLoanApplicationRequest,
    ApnaRashiLoanApplicationResponse,
    ApnaRashiLoanStatusUpdateRequest,
    ConfidenceBand,
    LoanApplicationListItem,
    LoanApplicationListResponse,
)
from app.services.spend_analyzer import compute_confidence_score

router = APIRouter()

LOOKBACK_MONTHS = 6
APNA_RASHI_PARTNER = "APNA_RASHI_BANK"


def _normalize_confidence_score(raw_score: int) -> int:
    """Convert legacy lender score (300-900) to normalized 0-100."""
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


@router.post("/apply-apnarashi", response_model=ApnaRashiLoanApplicationResponse)
async def apply_apna_rashi_loan(
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


@router.get("/applications", response_model=LoanApplicationListResponse)
async def list_loan_applications(
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


@router.post("/apnarashi-callback", response_model=ApnaRashiLoanApplicationResponse)
async def apna_rashi_callback(
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