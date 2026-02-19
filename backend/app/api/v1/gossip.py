"""
PrahariPay Gossip API
Receives gossip messages from peers and provides reconstruction/stats.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.gossip import GossipPayload, GossipResponse, GossipStats
from app.services.gossip_service import (
    generate_message_id,
    get_gossip_stats,
    receive_gossip,
    reconstruct_transaction,
)

router = APIRouter()


@router.post("/gossip", response_model=GossipResponse)
async def submit_gossip(body: GossipPayload, db: Session = Depends(get_db)):
    """Receive a gossip-relayed transaction from a peer."""
    result = receive_gossip(
        db=db,
        message_id=body.message_id,
        transaction_id=body.transaction_id,
        source_peer_id=body.source_peer_id,
        payload=body.payload,
        hops=body.hops,
    )
    return GossipResponse(
        status=result["status"],
        message_id=result["message_id"],
        propagated=result["propagated"],
        hops=result["hops"],
    )


@router.get("/gossip/reconstruct/{transaction_id}")
async def reconstruct(transaction_id: str, db: Session = Depends(get_db)):
    """Attempt to reconstruct a transaction from gossip redundancy."""
    result = reconstruct_transaction(db, transaction_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="No gossip data found for this transaction",
        )
    return result


@router.get("/gossip/stats", response_model=GossipStats)
async def gossip_stats(db: Session = Depends(get_db)):
    """Return aggregate gossip network statistics."""
    stats = get_gossip_stats(db)
    return GossipStats(**stats)
