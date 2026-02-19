"""
PrahariPay Gossip Service
Implements the gossip-style transaction propagation layer.

Peers relay transactions to the backend (acting as a central gossip hub).
The backend stores copies for redundancy and can reconstruct lost data.
"""

import json
import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import GossipMessage, TransactionRecord


def receive_gossip(
    db: Session,
    message_id: str,
    transaction_id: str,
    source_peer_id: str,
    payload: str,
    hops: int = 0,
) -> dict:
    """
    Receive a gossip message from a peer.
    Returns status indicating if the message was new or a duplicate.
    """
    # Reject if hops exceed maximum
    if hops > settings.MAX_GOSSIP_HOPS:
        return {
            "status": "rejected",
            "message_id": message_id,
            "propagated": False,
            "hops": hops,
            "reason": "max hops exceeded",
        }

    # Check for duplicate message
    existing = (
        db.query(GossipMessage)
        .filter(GossipMessage.message_id == message_id)
        .first()
    )
    if existing:
        return {
            "status": "duplicate",
            "message_id": message_id,
            "propagated": False,
            "hops": existing.hops,
        }

    # Store the gossip message
    msg = GossipMessage(
        message_id=message_id,
        transaction_id=transaction_id,
        source_peer_id=source_peer_id,
        payload=payload,
        hops=hops,
    )
    db.add(msg)

    # Update propagation count on the transaction if it exists
    tx_record = (
        db.query(TransactionRecord)
        .filter(TransactionRecord.transaction_id == transaction_id)
        .first()
    )
    if tx_record:
        tx_record.propagated_to_peers = (tx_record.propagated_to_peers or 0) + 1

    db.commit()
    db.refresh(msg)

    return {
        "status": "accepted",
        "message_id": message_id,
        "propagated": True,
        "hops": hops,
    }


def reconstruct_transaction(db: Session, transaction_id: str) -> dict | None:
    """
    Attempt to reconstruct a transaction from gossip messages.
    Used when a device is lost or transaction data is missing.
    """
    messages = (
        db.query(GossipMessage)
        .filter(GossipMessage.transaction_id == transaction_id)
        .order_by(GossipMessage.received_at.asc())
        .all()
    )
    if not messages:
        return None

    # Use the earliest message as the canonical copy
    try:
        tx_data = json.loads(messages[0].payload)
    except json.JSONDecodeError:
        return None

    return {
        "transaction": tx_data,
        "gossip_copies": len(messages),
        "sources": list({m.source_peer_id for m in messages}),
        "first_seen": messages[0].received_at.isoformat(),
    }


def get_gossip_stats(db: Session) -> dict:
    """Return aggregate gossip statistics."""
    total = db.query(GossipMessage).count()
    unique_txs = (
        db.query(func.count(func.distinct(GossipMessage.transaction_id))).scalar() or 0
    )
    avg_hops = db.query(func.avg(GossipMessage.hops)).scalar()

    # Count distinct source peers as active_peers
    active_peers = (
        db.query(func.count(func.distinct(GossipMessage.source_peer_id))).scalar() or 0
    )

    return {
        "total_messages": total,
        "unique_transactions": unique_txs,
        "avg_hops": round(float(avg_hops), 2) if avg_hops else None,
        "active_peers": active_peers,
    }


def generate_message_id() -> str:
    return str(uuid.uuid4())
