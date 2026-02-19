"""
PrahariPay Sync API
Receives offline transactions from mobile clients, runs AI reconciliation.
Backward-compatible: works with or without JWT auth.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_optional_user
from app.db.database import get_db
from app.db.models import User
from app.models.transaction import Transaction
from app.services.reconciliation import reconcile_transaction

router = APIRouter()


@router.post("/sync")
async def sync_transactions(
    transactions: list[Transaction],
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """
    Sync a batch of offline transactions.
    Each transaction is scored by the AI reconciliation engine,
    stored in the database, and the token is marked as used.
    """
    results = []
    for tx in transactions:
        analysis = reconcile_transaction(tx, db)
        results.append(analysis)

    return {"status": "synced", "results": results}
