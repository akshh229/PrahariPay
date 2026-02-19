"""
Pydantic schemas for gossip protocol.
"""

from typing import Optional

from pydantic import BaseModel


class GossipPayload(BaseModel):
    message_id: str
    transaction_id: str
    source_peer_id: str
    payload: str  # JSON-serialized transaction data
    hops: int = 0


class GossipResponse(BaseModel):
    status: str
    message_id: str
    propagated: bool
    hops: int


class GossipStats(BaseModel):
    total_messages: int
    unique_transactions: int
    avg_hops: Optional[float] = None
