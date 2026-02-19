from enum import Enum
from typing import List, Optional
from pydantic import BaseModel

class SpendCategory(str, Enum):
    FOOD = "FOOD"
    TRANSPORT = "TRANSPORT"
    UTILITIES = "UTILITIES"
    ENTERTAINMENT = "ENTERTAINMENT"
    HEALTH = "HEALTH"
    TRANSFER = "TRANSFER"
    OTHER = "OTHER"

class CategoryBreakdown(BaseModel):
    category: SpendCategory
    amount: float
    percentage: float
    budget_limit: Optional[float] = None

class SpendSummary(BaseModel):
    period: str  # daily, weekly, monthly
    total_amount: float
    currency: str = "INR"
    trend_pct: float
    trend_direction: str  # up, down, flat
    breakdown: List[CategoryBreakdown]

class SpendAlert(BaseModel):
    id: str
    type: str  # ANOMALY, BUDGET, PREDICTION
    severity: str  # low, medium, high
    message: str
    created_at: str
    category: Optional[SpendCategory] = None

class SpendAnalysisResponse(BaseModel):
    summary: SpendSummary
    alerts: List[SpendAlert]
