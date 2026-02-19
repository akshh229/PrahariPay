from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.database import get_db
from app.db.models import BudgetThreshold
from app.models.spend import SpendAnalysisResponse, SpendAlert, SpendSummary, SpendCategory

from app.services.spend_analyzer import (
    compute_spend_summary,
    generate_alerts,
)

router = APIRouter()


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

