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


class ConfidenceFactor(BaseModel):
    name: str
    score: int
    impact: str  # positive, negative, neutral
    description: str


class CreditScoreForLenders(BaseModel):
    score: int
    band: str
    summary: str
    factors: List[ConfidenceFactor]
    utilization_pct: float
    on_time_payment_ratio: float
    income_stability_ratio: float
    savings_buffer_ratio: float
    txn_history_months: int
    recommended_limit: Optional[float] = None
    risk_level: str
    is_insufficient_data: bool = False


class ConfidenceScoreResponse(BaseModel):
    user_id: str
    lookback_months: int
    generated_at: str
    credit_score: CreditScoreForLenders


# ── AI Insights ──────────────────────────────────────────────────────


class AIInsightType(str, Enum):
    ANOMALY = "anomaly"
    BUDGET = "budget"
    PREDICTION = "prediction"
    POSITIVE = "positive"
    RECURRING = "recurring"
    SAVINGS = "savings"
    CATEGORY_SHIFT = "category_shift"
    TREND = "trend"


class AIInsightSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    INFO = "info"


class AIInsight(BaseModel):
    id: str
    type: AIInsightType
    severity: AIInsightSeverity
    title: str
    message: str
    icon: str
    category: Optional[SpendCategory] = None
    amount: Optional[float] = None
    pct_change: Optional[float] = None
    actionable: bool = False
    created_at: str


class AIInsightsResponse(BaseModel):
    user_id: str
    generated_at: str
    insights: List[AIInsight]
    total: int
