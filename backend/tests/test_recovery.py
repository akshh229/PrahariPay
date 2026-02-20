"""
Tests for Guardian Recovery — registration, initiation, approval, quorum.
"""

import pytest


def register_user(client, username, password="testpass123"):
    resp = client.post(
        "/api/v1/auth/register",
        json={"username": username, "password": password},
    )
    assert resp.status_code == 201
    return resp.json()


class TestGuardianRegistration:
    def test_register_guardians(self, client):
        owner = register_user(client, "owner")
        g1 = register_user(client, "guardian1")
        g2 = register_user(client, "guardian2")
        g3 = register_user(client, "guardian3")

        header = {"Authorization": f"Bearer {owner['access_token']}"}
        resp = client.post(
            "/api/v1/register-guardians",
            json={"guardian_ids": [g1["user_id"], g2["user_id"], g3["user_id"]]},
            headers=header,
        )
        assert resp.status_code == 200
        assert resp.json()["count"] == 3

    def test_cannot_register_self_as_guardian(self, client):
        owner = register_user(client, "owner")
        header = {"Authorization": f"Bearer {owner['access_token']}"}
        resp = client.post(
            "/api/v1/register-guardians",
            json={"guardian_ids": [owner["user_id"]]},
            headers=header,
        )
        assert resp.status_code == 400

    def test_cannot_register_nonexistent_guardian(self, client):
        owner = register_user(client, "owner")
        header = {"Authorization": f"Bearer {owner['access_token']}"}
        resp = client.post(
            "/api/v1/register-guardians",
            json={"guardian_ids": ["nonexistent_id"]},
            headers=header,
        )
        assert resp.status_code == 400

    def test_list_guardians(self, client):
        owner = register_user(client, "owner")
        g1 = register_user(client, "guardian1")
        header = {"Authorization": f"Bearer {owner['access_token']}"}

        client.post(
            "/api/v1/register-guardians",
            json={"guardian_ids": [g1["user_id"]]},
            headers=header,
        )

        resp = client.get("/api/v1/guardians", headers=header)
        assert resp.status_code == 200
        assert resp.json()["count"] == 1

    def test_register_guardian_by_username(self, client):
        """Users can register guardians using their username."""
        owner = register_user(client, "owner")
        register_user(client, "myguardian")
        header = {"Authorization": f"Bearer {owner['access_token']}"}

        resp = client.post(
            "/api/v1/register-guardians",
            json={"guardian_ids": ["myguardian"]},
            headers=header,
        )
        assert resp.status_code == 200
        assert resp.json()["count"] == 1

    def test_register_guardian_by_ppay_handle(self, client):
        """Users can register guardians using the user@ppay handle."""
        owner = register_user(client, "owner")
        register_user(client, "budak")
        header = {"Authorization": f"Bearer {owner['access_token']}"}

        resp = client.post(
            "/api/v1/register-guardians",
            json={"guardian_ids": ["budak@ppay"]},
            headers=header,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 1
        assert data["guardians"][0]["guardian_name"] == "budak"


class TestRecoveryFlow:
    def _setup_recovery(self, client):
        """Helper: create owner + 3 guardians, register them."""
        owner = register_user(client, "owner")
        guardians = []
        for i in range(3):
            g = register_user(client, f"guardian{i}")
            guardians.append(g)

        header = {"Authorization": f"Bearer {owner['access_token']}"}
        client.post(
            "/api/v1/register-guardians",
            json={"guardian_ids": [g["user_id"] for g in guardians]},
            headers=header,
        )
        return owner, guardians

    def test_initiate_recovery(self, client):
        owner, guardians = self._setup_recovery(client)

        resp = client.post(
            "/api/v1/initiate-recovery",
            json={"user_id": owner["user_id"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "pending"
        assert data["approvals"] == 0
        assert data["required_approvals"] == 3

    def test_initiate_recovery_no_guardians(self, client):
        owner = register_user(client, "loner")
        resp = client.post(
            "/api/v1/initiate-recovery",
            json={"user_id": owner["user_id"]},
        )
        assert resp.status_code == 400

    def test_approve_recovery_single(self, client):
        owner, guardians = self._setup_recovery(client)

        # Initiate
        init_resp = client.post(
            "/api/v1/initiate-recovery",
            json={"user_id": owner["user_id"]},
        )
        recovery_id = init_resp.json()["recovery_id"]

        # First guardian approves
        g_header = {"Authorization": f"Bearer {guardians[0]['access_token']}"}
        resp = client.post(
            "/api/v1/approve-recovery",
            json={"recovery_id": recovery_id},
            headers=g_header,
        )
        assert resp.status_code == 200
        assert resp.json()["approvals"] == 1
        assert resp.json()["status"] == "pending"

    def test_full_quorum_approves_recovery(self, client):
        owner, guardians = self._setup_recovery(client)

        init_resp = client.post(
            "/api/v1/initiate-recovery",
            json={"user_id": owner["user_id"]},
        )
        recovery_id = init_resp.json()["recovery_id"]

        # All 3 guardians approve
        for g in guardians:
            g_header = {"Authorization": f"Bearer {g['access_token']}"}
            resp = client.post(
                "/api/v1/approve-recovery",
                json={"recovery_id": recovery_id},
                headers=g_header,
            )

        assert resp.json()["status"] == "approved"
        assert resp.json()["approvals"] == 3

    def test_duplicate_approval_rejected(self, client):
        owner, guardians = self._setup_recovery(client)

        init_resp = client.post(
            "/api/v1/initiate-recovery",
            json={"user_id": owner["user_id"]},
        )
        recovery_id = init_resp.json()["recovery_id"]

        g_header = {"Authorization": f"Bearer {guardians[0]['access_token']}"}
        client.post(
            "/api/v1/approve-recovery",
            json={"recovery_id": recovery_id},
            headers=g_header,
        )
        # Same guardian tries again
        resp = client.post(
            "/api/v1/approve-recovery",
            json={"recovery_id": recovery_id},
            headers=g_header,
        )
        assert resp.status_code == 400

    def test_recovery_status_endpoint(self, client):
        owner, guardians = self._setup_recovery(client)

        init_resp = client.post(
            "/api/v1/initiate-recovery",
            json={"user_id": owner["user_id"]},
        )
        recovery_id = init_resp.json()["recovery_id"]

        resp = client.get(f"/api/v1/recovery/{recovery_id}")
        assert resp.status_code == 200
        assert resp.json()["recovery_id"] == recovery_id

    def test_pending_recoveries_for_guardian(self, client):
        owner, guardians = self._setup_recovery(client)

        client.post(
            "/api/v1/initiate-recovery",
            json={"user_id": owner["user_id"]},
        )

        g_header = {"Authorization": f"Bearer {guardians[0]['access_token']}"}
        resp = client.get("/api/v1/pending-recoveries", headers=g_header)
        assert resp.status_code == 200
        assert len(resp.json()["pending"]) == 1
