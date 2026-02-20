"""
Tests for Sync API — transaction submission and AI reconciliation.
"""

import uuid

import pytest

from app.core.time import utcnow


def make_transaction(**overrides):
    """Helper to build a valid transaction payload."""
    defaults = {
        "transaction_id": str(uuid.uuid4()),
        "sender_id": "user_001",
        "receiver_id": "merchant_001",
        "merchant_id": "merchant_001",
        "invoice_id": "INV-001",
        "amount": 500.0,
        "timestamp": utcnow().isoformat(),
        "token_id": str(uuid.uuid4()),
        "signature": "simulated_sig_" + str(int(utcnow().timestamp())),
        "propagated_to_peers": 1,
        "synced": False,
    }
    defaults.update(overrides)
    return defaults


class TestSync:
    def test_sync_single_transaction(self, client):
        tx = make_transaction()
        resp = client.post("/api/v1/sync", json=[tx])
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "synced"
        assert len(data["results"]) == 1
        result = data["results"][0]
        assert "risk_score" in result
        assert "classification" in result
        assert result["synced"] is True

    def test_sync_multiple_transactions(self, client):
        txs = [make_transaction() for _ in range(3)]
        resp = client.post("/api/v1/sync", json=txs)
        assert resp.status_code == 200
        assert len(resp.json()["results"]) == 3

    def test_sync_high_amount_flagged(self, client):
        tx = make_transaction(amount=10000.0)
        resp = client.post("/api/v1/sync", json=[tx])
        result = resp.json()["results"][0]
        assert result["risk_score"] > 0
        assert "HIGH_AMOUNT" in result["risk_flags"]

    def test_sync_duplicate_token_flagged(self, client):
        token = str(uuid.uuid4())
        tx1 = make_transaction(token_id=token)
        tx2 = make_transaction(token_id=token)

        # First sync
        client.post("/api/v1/sync", json=[tx1])

        # Second sync with same token
        resp = client.post("/api/v1/sync", json=[tx2])
        result = resp.json()["results"][0]
        assert "DUPLICATE_TOKEN" in result["risk_flags"]
        assert result["risk_score"] >= 0.5

    def test_sync_duplicate_transaction_id_is_idempotent(self, client):
        tx_id = str(uuid.uuid4())
        tx = make_transaction(transaction_id=tx_id)

        first = client.post("/api/v1/sync", json=[tx])
        assert first.status_code == 200

        second = client.post("/api/v1/sync", json=[tx])
        assert second.status_code == 200
        second_result = second.json()["results"][0]
        assert second_result["transaction_id"] == tx_id
        assert second_result["synced"] is True

    def test_sync_valid_low_amount(self, client):
        tx = make_transaction(amount=100.0, propagated_to_peers=3)
        resp = client.post("/api/v1/sync", json=[tx])
        result = resp.json()["results"][0]
        assert result["classification"] == "Valid"

    def test_sync_empty_list(self, client):
        resp = client.post("/api/v1/sync", json=[])
        assert resp.status_code == 200
        assert resp.json()["results"] == []

    def test_synced_tx_appears_in_ledger(self, client):
        tx = make_transaction(sender_id="user_abc", receiver_id="merchant_xyz")
        client.post("/api/v1/sync", json=[tx])

        resp = client.get("/api/v1/ledger/user_abc")
        assert resp.status_code == 200
        txs = resp.json()["transactions"]
        assert len(txs) >= 1
        assert txs[0]["transaction_id"] == tx["transaction_id"]

    def test_synced_tx_appears_in_merchant(self, client):
        tx = make_transaction(
            receiver_id="merchant_xyz", merchant_id="merchant_xyz"
        )
        client.post("/api/v1/sync", json=[tx])

        resp = client.get("/api/v1/merchant/merchant_xyz/transactions")
        assert resp.status_code == 200
        txs = resp.json()["transactions"]
        assert len(txs) >= 1
