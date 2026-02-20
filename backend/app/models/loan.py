from enum import Enum
from typing import Literal

from pydantic import BaseModel, conint


class ConfidenceBand(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class ApnaRashiLoanApplicationRequest(BaseModel):
    requested_amount: conint(gt=0)
    requested_tenor_months: conint(gt=0, le=24)
    consent: bool


class ApnaRashiLoanApplicationResponse(BaseModel):
    application_id: str
    status: Literal["PENDING_BANK", "APPROVED", "REJECTED", "CANCELLED"]
    confidence_score: int
    confidence_band: ConfidenceBand
    lookback_period_months: int


class LoanApplicationListItem(BaseModel):
    application_id: str
    partner: str
    requested_amount: float
    requested_tenor_months: int
    confidence_score: int
    confidence_band: ConfidenceBand
    status: Literal["PENDING_BANK", "APPROVED", "REJECTED", "CANCELLED"]
    created_at: str


class LoanApplicationListResponse(BaseModel):
    applications: list[LoanApplicationListItem]
    total: int


class ApnaRashiLoanStatusUpdateRequest(BaseModel):
    application_id: str
    status: Literal["PENDING_BANK", "APPROVED", "REJECTED", "CANCELLED"]