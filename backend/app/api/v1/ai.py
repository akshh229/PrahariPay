"""
PrahariPay AI Anomaly Detection API
Exposes collusion, circular loop, burst abuse detection and trust scores.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.ai import calculate_trust_adjustment, detect_anomalies
from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User

router = APIRouter()


@router.get("/anomalies")
async def get_anomalies(
    window_hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run all anomaly detectors over the recent transaction window."""
    anomalies = detect_anomalies(db, window_hours)
    return {
        "window_hours": window_hours,
        "anomalies": anomalies,
        "total": len(anomalies),
    }


@router.get("/trust-score/{user_id}")
async def get_trust_score(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate trust score adjustment for a user based on recent history."""
    adjustment = calculate_trust_adjustment(user_id, db)
    return {
        "user_id": user_id,
        "adjustment": adjustment,
    }
