"""
PrahariPay Merchant API
Merchant-facing endpoints for transaction views and summaries.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_optional_user
from app.db.database import get_db
from app.db.models import User
from app.services.merchant_store import get_transaction_summary, get_transactions

router = APIRouter()


@router.get("/{merchant_id}/transactions")
async def read_merchant_transactions(
    merchant_id: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Get all transactions received by a merchant."""
    transactions = get_transactions(merchant_id, db)
    return {"merchant_id": merchant_id, "transactions": transactions}


@router.get("/{merchant_id}/summary")
async def read_merchant_summary(
    merchant_id: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Get aggregate transaction summary for a merchant."""
    summary = get_transaction_summary(merchant_id, db)
    return summary
