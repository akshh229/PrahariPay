"""
PrahariPay ORM Models
SQLAlchemy models for all database tables.
"""

import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)

from app.db.database import Base
from app.core.time import utcnow


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    public_key = Column(Text, nullable=True)
    balance = Column(Float, default=100000.0)
    offline_credit_limit = Column(Float, default=2000.0)
    trust_score = Column(Float, default=1.0)
    is_merchant = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)


class TransactionRecord(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(String, unique=True, nullable=False, index=True)
    sender_id = Column(String, nullable=False, index=True)
    receiver_id = Column(String, nullable=False, index=True)
    merchant_id = Column(String, nullable=True, index=True)
    invoice_id = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    token_id = Column(String, nullable=False, index=True)
    signature = Column(Text, nullable=False)
    propagated_to_peers = Column(Integer, default=0)
    synced = Column(Boolean, default=False)
    risk_score = Column(Float, nullable=True)
    classification = Column(String, nullable=True)
    risk_flags = Column(Text, nullable=True)  # JSON list of flags
    category = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=utcnow)


class BudgetThreshold(Base):
    __tablename__ = "budget_thresholds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False)
    monthly_limit = Column(Float, nullable=False)
    alert_enabled = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=utcnow)


class SpendSnapshot(Base):
    __tablename__ = "spend_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)
    period_type = Column(String, nullable=False)  # DAILY, WEEKLY, MONTHLY
    period_start = Column(DateTime, nullable=False)
    category = Column(String, nullable=False)
    total_amount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utcnow)


class UsedToken(Base):
    """Tracks every token_id that has been spent — prevents double-spending."""

    __tablename__ = "used_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token_id = Column(String, unique=True, nullable=False, index=True)
    transaction_id = Column(String, nullable=False)
    used_at = Column(DateTime, default=utcnow)


class Guardian(Base):
    __tablename__ = "guardians"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)
    guardian_id = Column(String, nullable=False, index=True)
    guardian_name = Column(String, nullable=True)
    status = Column(String, default="active")  # active | revoked
    created_at = Column(DateTime, default=utcnow)


class RecoveryRequest(Base):
    __tablename__ = "recovery_requests"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, nullable=False, index=True)
    status = Column(String, default="pending")  # pending | approved | rejected | expired
    approvals = Column(Integer, default=0)
    required_approvals = Column(Integer, default=3)
    new_public_key = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    expires_at = Column(DateTime, nullable=True)


class RecoveryApproval(Base):
    __tablename__ = "recovery_approvals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recovery_id = Column(
        String, ForeignKey("recovery_requests.id"), nullable=False, index=True
    )
    guardian_id = Column(String, nullable=False)
    approved_at = Column(DateTime, default=utcnow)


class GossipMessage(Base):
    """Stores gossip-relayed transaction copies for redundancy."""

    __tablename__ = "gossip_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    message_id = Column(String, unique=True, nullable=False, index=True)
    transaction_id = Column(String, nullable=False, index=True)
    source_peer_id = Column(String, nullable=False)
    payload = Column(Text, nullable=False)  # JSON-serialized transaction
    hops = Column(Integer, default=0)
    received_at = Column(DateTime, default=utcnow)


class LoanApplication(Base):
    __tablename__ = "loan_applications"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, nullable=False, index=True)
    partner = Column(String, nullable=False, index=True)
    requested_amount = Column(Float, nullable=False)
    requested_tenor_months = Column(Integer, nullable=False)
    confidence_score = Column(Integer, nullable=False)
    confidence_band = Column(String, nullable=False)
    lookback_period_months = Column(Integer, nullable=False, default=6)
    status = Column(String, nullable=False, default="PENDING_BANK", index=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
