"""
PrahariPay Ledger API
Retrieve transaction history for a user.
"""

import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_optional_user
from app.db.database import get_db
from app.db.models import TransactionRecord, User

router = APIRouter()


@router.get("/ledger/{user_id}")
async def get_ledger(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Return all transactions where user_id is sender or receiver."""
    rows = (
        db.query(TransactionRecord)
        .filter(
            (TransactionRecord.sender_id == user_id)
            | (TransactionRecord.receiver_id == user_id)
        )
        .order_by(TransactionRecord.timestamp.desc())
        .all()
    )

    transactions = []
    for r in rows:
        transactions.append(
            {
                "transaction_id": r.transaction_id,
                "sender_id": r.sender_id,
                "receiver_id": r.receiver_id,
                "merchant_id": r.merchant_id,
                "invoice_id": r.invoice_id,
                "amount": r.amount,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "token_id": r.token_id,
                "risk_score": r.risk_score,
                "classification": r.classification,
                "risk_flags": json.loads(r.risk_flags) if r.risk_flags else [],
                "synced": r.synced,
            }
        )

    return {"user_id": user_id, "transactions": transactions}
