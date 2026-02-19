"""
Tests for Gossip Protocol — message relay, deduplication, reconstruction, stats.
"""

import json
import uuid

import pytest


def make_gossip_payload(**overrides):
    tx_id = str(uuid.uuid4())
    defaults = {
        "message_id": str(uuid.uuid4()),
        "transaction_id": tx_id,
        "source_peer_id": "peer_001",
        "payload": json.dumps(
            {
                "transaction_id": tx_id,
                "sender_id": "user_001",
                "receiver_id": "merchant_001",
                "amount": 500.0,
                "timestamp": "2026-02-17T12:00:00",
            }
        ),
        "hops": 1,
    }
    defaults.update(overrides)
    return defaults


class TestGossipSubmission:
    def test_submit_gossip_accepted(self, client):
        payload = make_gossip_payload()
        resp = client.post("/api/v1/gossip", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "accepted"
        assert data["propagated"] is True

    def test_submit_duplicate_gossip(self, client):
        payload = make_gossip_payload()
        client.post("/api/v1/gossip", json=payload)
        resp = client.post("/api/v1/gossip", json=payload)
        assert resp.json()["status"] == "duplicate"
        assert resp.json()["propagated"] is False

    def test_submit_max_hops_exceeded(self, client):
        payload = make_gossip_payload(hops=10)
        resp = client.post("/api/v1/gossip", json=payload)
        assert resp.json()["status"] == "rejected"

    def test_multiple_peers_same_tx(self, client):
        tx_id = str(uuid.uuid4())
        tx_data = json.dumps({"transaction_id": tx_id, "amount": 100})

        for i in range(3):
            payload = make_gossip_payload(
                message_id=str(uuid.uuid4()),
                transaction_id=tx_id,
                source_peer_id=f"peer_{i}",
                payload=tx_data,
                hops=i + 1,
            )
            resp = client.post("/api/v1/gossip", json=payload)
            assert resp.status_code == 200


class TestGossipReconstruction:
    def test_reconstruct_existing_tx(self, client):
        tx_id = str(uuid.uuid4())
        tx_data = {
            "transaction_id": tx_id,
            "sender_id": "user_001",
            "amount": 500.0,
        }
        payload = make_gossip_payload(
            transaction_id=tx_id,
            payload=json.dumps(tx_data),
        )
        client.post("/api/v1/gossip", json=payload)

        resp = client.get(f"/api/v1/gossip/reconstruct/{tx_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["gossip_copies"] >= 1
        assert data["transaction"]["transaction_id"] == tx_id

    def test_reconstruct_nonexistent_tx(self, client):
        resp = client.get(
            f"/api/v1/gossip/reconstruct/{str(uuid.uuid4())}"
        )
        assert resp.status_code == 404


class TestGossipStats:
    def test_stats_empty(self, client):
        resp = client.get("/api/v1/gossip/stats")
        assert resp.status_code == 200
        assert resp.json()["total_messages"] == 0

    def test_stats_after_messages(self, client):
        for _ in range(3):
            client.post("/api/v1/gossip", json=make_gossip_payload())

        resp = client.get("/api/v1/gossip/stats")
        data = resp.json()
        assert data["total_messages"] == 3
        assert data["unique_transactions"] == 3
