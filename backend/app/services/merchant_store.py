"""
PrahariPay Merchant Store
Database-backed merchant transaction queries.
"""

import json

from sqlalchemy.orm import Session

from app.db.models import TransactionRecord


def get_transactions(merchant_id: str, db: Session) -> list[dict]:
    """Return all transactions for a merchant, most recent first."""
    rows = (
        db.query(TransactionRecord)
        .filter(
            (TransactionRecord.merchant_id == merchant_id)
            | (TransactionRecord.receiver_id == merchant_id)
        )
        .order_by(TransactionRecord.timestamp.desc())
        .all()
    )
    results = []
    for r in rows:
        results.append(
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
    return results


def get_transaction_summary(merchant_id: str, db: Session) -> dict:
    """Aggregate stats for a merchant."""
    from sqlalchemy import func

    base = db.query(TransactionRecord).filter(
        (TransactionRecord.merchant_id == merchant_id)
        | (TransactionRecord.receiver_id == merchant_id)
    )
    total_count = base.count()
    total_amount = (
        base.with_entities(func.coalesce(func.sum(TransactionRecord.amount), 0)).scalar()
    )
    flagged = base.filter(TransactionRecord.classification != "Valid").count()

    return {
        "merchant_id": merchant_id,
        "total_transactions": total_count,
        "total_amount": round(float(total_amount), 2),
        "flagged_transactions": flagged,
    }
