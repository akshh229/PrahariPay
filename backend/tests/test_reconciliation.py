"""
Tests for the Reconciliation Engine — risk scoring, classification, token tracking.
"""

import uuid
from datetime import timedelta

import pytest

from app.core.config import settings
from app.core.time import utcnow
from app.db.models import TransactionRecord, UsedToken
from app.models.transaction import Transaction
from app.services.reconciliation import (
    calculate_risk_score,
    classify_risk,
    reconcile_transaction,
)


def make_tx(**overrides) -> Transaction:
    defaults = {
        "transaction_id": uuid.uuid4(),
        "sender_id": "user_001",
        "receiver_id": "merchant_001",
        "amount": 500.0,
        "timestamp": utcnow(),
        "token_id": uuid.uuid4(),
        "signature": "simulated_sig_test",
        "propagated_to_peers": 2,
        "synced": False,
    }
    defaults.update(overrides)
    return Transaction(**defaults)


class TestClassifyRisk:
    def test_valid(self):
        assert classify_risk(0.1) == "Valid"

    def test_honest_conflict(self):
        assert classify_risk(0.4) == "Likely Honest Conflict"

    def test_suspicious(self):
        assert classify_risk(0.7) == "Suspicious"

    def test_fraud(self):
        assert classify_risk(0.9) == "Likely Fraud"

    def test_boundary_valid(self):
        assert classify_risk(0.29) == "Valid"

    def test_boundary_conflict(self):
        assert classify_risk(0.3) == "Likely Honest Conflict"


class TestRiskScoring:
    def test_low_amount_no_flags(self, db_session):
        tx = make_tx(amount=100.0, propagated_to_peers=3)
        score, flags = calculate_risk_score(tx, db_session)
        assert score < 0.3
        assert "HIGH_AMOUNT" not in flags

    def test_high_amount_flag(self, db_session):
        tx = make_tx(amount=10000.0)
        score, flags = calculate_risk_score(tx, db_session)
        assert "HIGH_AMOUNT" in flags
        assert score >= 0.2

    def test_duplicate_token_flag(self, db_session):
        token = uuid.uuid4()
        # Pre-register a token
        used = UsedToken(
            token_id=str(token), transaction_id="old_tx"
        )
        db_session.add(used)
        db_session.commit()

        tx = make_tx(token_id=token)
        score, flags = calculate_risk_score(tx, db_session)
        assert "DUPLICATE_TOKEN" in flags
        assert score >= 0.5

    def test_no_peer_propagation_flag(self, db_session):
        tx = make_tx(propagated_to_peers=0)
        score, flags = calculate_risk_score(tx, db_session)
        assert "NO_PEER_PROPAGATION" in flags

    def test_burst_detection(self, db_session):
        now = utcnow()
        sender = "burst_user"
        # Insert 5 recent transactions
        for i in range(5):
            rec = TransactionRecord(
                transaction_id=str(uuid.uuid4()),
                sender_id=sender,
                receiver_id="merchant_001",
                amount=100.0,
                timestamp=now - timedelta(seconds=60 * i),
                token_id=str(uuid.uuid4()),
                signature="sig",
                synced=True,
            )
            db_session.add(rec)
        db_session.commit()

        tx = make_tx(sender_id=sender, timestamp=now)
        score, flags = calculate_risk_score(tx, db_session)
        assert "BURST_DETECTED" in flags

    def test_circular_transaction_flag(self, db_session):
        now = utcnow()
        # Insert A→B
        rec = TransactionRecord(
            transaction_id=str(uuid.uuid4()),
            sender_id="merchant_001",
            receiver_id="user_001",
            amount=1000.0,
            timestamp=now - timedelta(seconds=60),
            token_id=str(uuid.uuid4()),
            signature="sig",
            synced=True,
        )
        db_session.add(rec)
        db_session.commit()

        # Now test B→A
        tx = make_tx(
            sender_id="user_001",
            receiver_id="merchant_001",
            timestamp=now,
        )
        score, flags = calculate_risk_score(tx, db_session)
        assert "CIRCULAR_TRANSACTION" in flags

    def test_score_capped_at_one(self, db_session):
        """Even with many flags, score should not exceed 1.0."""
        token = uuid.uuid4()
        used = UsedToken(token_id=str(token), transaction_id="old")
        db_session.add(used)
        db_session.commit()

        tx = make_tx(
            amount=99999.0,
            token_id=token,
            propagated_to_peers=0,
        )
        score, flags = calculate_risk_score(tx, db_session)
        assert score <= 1.0


class TestReconcileTransaction:
    def test_reconcile_stores_in_db(self, db_session):
        tx = make_tx()
        result = reconcile_transaction(tx, db_session)
        assert result["synced"] is True

        # Verify in DB
        stored = (
            db_session.query(TransactionRecord)
            .filter(
                TransactionRecord.transaction_id
                == str(tx.transaction_id)
            )
            .first()
        )
        assert stored is not None
        assert stored.risk_score is not None
        assert stored.classification is not None

    def test_reconcile_registers_token(self, db_session):
        token = uuid.uuid4()
        tx = make_tx(token_id=token)
        reconcile_transaction(tx, db_session)

        used = (
            db_session.query(UsedToken)
            .filter(UsedToken.token_id == str(token))
            .first()
        )
        assert used is not None

    def test_reconcile_duplicate_token_not_re_registered(self, db_session):
        token = uuid.uuid4()
        # First pass
        tx1 = make_tx(token_id=token)
        reconcile_transaction(tx1, db_session)

        # Second pass (same token, different tx)
        tx2 = make_tx(token_id=token)
        result = reconcile_transaction(tx2, db_session)
        assert "DUPLICATE_TOKEN" in result["risk_flags"]

        count = (
            db_session.query(UsedToken)
            .filter(UsedToken.token_id == str(token))
            .count()
        )
        assert count == 1  # Not re-registered
