from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class Transaction(BaseModel):
    """Schema for incoming transactions from mobile clients."""

    transaction_id: UUID
    sender_id: str
    receiver_id: str
    merchant_id: Optional[str] = None
    invoice_id: Optional[str] = None
    amount: float = Field(..., gt=0)
    timestamp: datetime
    token_id: UUID
    signature: str
    propagated_to_peers: int = 0
    synced: bool = False


class TransactionResult(BaseModel):
    """Schema returned after reconciliation."""

    transaction_id: UUID
    risk_score: float
    classification: str
    risk_flags: List[str] = []
    synced: bool = True


class TransactionDetail(BaseModel):
    """Full transaction detail for ledger / merchant views."""

    transaction_id: str
    sender_id: str
    receiver_id: str
    merchant_id: Optional[str] = None
    invoice_id: Optional[str] = None
    amount: float
    timestamp: datetime
    token_id: str
    signature: str
    propagated_to_peers: int = 0
    synced: bool = False
    risk_score: Optional[float] = None
    classification: Optional[str] = None
    risk_flags: Optional[List[str]] = None
