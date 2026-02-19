"""
Tests for Auth API — registration, login, token refresh, profile, key generation.
"""

import pytest


class TestRegistration:
    def test_register_success(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            json={"username": "alice", "password": "password123"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["username"] == "alice"
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user_id" in data

    def test_register_duplicate_username(self, client):
        client.post(
            "/api/v1/auth/register",
            json={"username": "alice", "password": "password123"},
        )
        resp = client.post(
            "/api/v1/auth/register",
            json={"username": "alice", "password": "otherpass"},
        )
        assert resp.status_code == 409

    def test_register_short_password(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            json={"username": "bob", "password": "short"},
        )
        assert resp.status_code == 422

    def test_register_merchant(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "username": "shop_owner",
                "password": "password123",
                "is_merchant": True,
            },
        )
        assert resp.status_code == 201


class TestLogin:
    def test_login_success(self, client):
        client.post(
            "/api/v1/auth/register",
            json={"username": "alice", "password": "password123"},
        )
        resp = client.post(
            "/api/v1/auth/login",
            json={"username": "alice", "password": "password123"},
        )
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_login_wrong_password(self, client):
        client.post(
            "/api/v1/auth/register",
            json={"username": "alice", "password": "password123"},
        )
        resp = client.post(
            "/api/v1/auth/login",
            json={"username": "alice", "password": "wrong"},
        )
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post(
            "/api/v1/auth/login",
            json={"username": "ghost", "password": "password123"},
        )
        assert resp.status_code == 401


class TestTokenRefresh:
    def test_refresh_token(self, client, registered_user):
        resp = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": registered_user["refresh_token"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user_id"] == registered_user["user_id"]

    def test_refresh_with_access_token_fails(self, client, registered_user):
        resp = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": registered_user["access_token"]},
        )
        assert resp.status_code == 401


class TestProfile:
    def test_get_profile(self, client, registered_user, auth_header):
        resp = client.get("/api/v1/auth/profile", headers=auth_header)
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "testuser"
        assert data["balance"] == 10000.0
        assert data["trust_score"] == 1.0

    def test_profile_without_auth(self, client):
        resp = client.get("/api/v1/auth/profile")
        assert resp.status_code in (401, 403)


class TestKeyGeneration:
    def test_generate_keys(self, client, auth_header):
        resp = client.post("/api/v1/auth/generate-keys", headers=auth_header)
        assert resp.status_code == 200
        data = resp.json()
        assert "-----BEGIN PUBLIC KEY-----" in data["public_key"]
        assert "-----BEGIN PRIVATE KEY-----" in data["private_key"]

        # Verify profile now has public key
        profile = client.get(
            "/api/v1/auth/profile", headers=auth_header
        ).json()
        assert profile["public_key"] is not None
