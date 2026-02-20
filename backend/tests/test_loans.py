"""Tests for Apna Rashi loan application endpoint."""

from app.db.models import LoanApplication


def test_apply_apnarashi_requires_merchant(client, auth_header):
    response = client.post(
        "/api/v1/loans/apply-apnarashi",
        json={
            "requested_amount": 100000,
            "requested_tenor_months": 6,
            "consent": True,
        },
        headers=auth_header,
    )
    assert response.status_code == 403


def test_apply_apnarashi_requires_consent(client, merchant_header):
    response = client.post(
        "/api/v1/loans/apply-apnarashi",
        json={
            "requested_amount": 100000,
            "requested_tenor_months": 6,
            "consent": False,
        },
        headers=merchant_header,
    )
    assert response.status_code == 400


def test_apply_apnarashi_creates_application(client, db_session, merchant_user, merchant_header):
    response = client.post(
        "/api/v1/loans/apply-apnarashi",
        json={
            "requested_amount": 125000,
            "requested_tenor_months": 9,
            "consent": True,
        },
        headers=merchant_header,
    )
    assert response.status_code == 200
    payload = response.json()

    assert payload["application_id"]
    assert payload["status"] == "PENDING_BANK"
    assert 0 <= payload["confidence_score"] <= 100
    assert payload["confidence_band"] in ["HIGH", "MEDIUM", "LOW", "INSUFFICIENT_DATA"]
    assert payload["lookback_period_months"] == 6

    saved = (
        db_session.query(LoanApplication)
        .filter(LoanApplication.id == payload["application_id"])
        .first()
    )
    assert saved is not None
    assert saved.user_id == merchant_user["user_id"]
    assert saved.partner == "APNA_RASHI_BANK"
    assert saved.requested_amount == 125000
    assert saved.requested_tenor_months == 9
    assert saved.status == "PENDING_BANK"


def test_list_loan_applications_requires_merchant(client, auth_header):
    response = client.get("/api/v1/loans/applications", headers=auth_header)
    assert response.status_code == 403


def test_list_loan_applications_returns_latest_first(client, merchant_header):
    first = client.post(
        "/api/v1/loans/apply-apnarashi",
        json={
            "requested_amount": 50000,
            "requested_tenor_months": 3,
            "consent": True,
        },
        headers=merchant_header,
    )
    assert first.status_code == 200

    second = client.post(
        "/api/v1/loans/apply-apnarashi",
        json={
            "requested_amount": 80000,
            "requested_tenor_months": 6,
            "consent": True,
        },
        headers=merchant_header,
    )
    assert second.status_code == 200

    listed = client.get("/api/v1/loans/applications", headers=merchant_header)
    assert listed.status_code == 200
    body = listed.json()

    assert body["total"] == 2
    assert len(body["applications"]) == 2
    assert body["applications"][0]["application_id"] == second.json()["application_id"]
    assert body["applications"][1]["application_id"] == first.json()["application_id"]


def test_apnarashi_callback_updates_status(client, merchant_header):
    created = client.post(
        "/api/v1/loans/apply-apnarashi",
        json={
            "requested_amount": 90000,
            "requested_tenor_months": 6,
            "consent": True,
        },
        headers=merchant_header,
    )
    assert created.status_code == 200
    app_id = created.json()["application_id"]

    updated = client.post(
        "/api/v1/loans/apnarashi-callback",
        json={
            "application_id": app_id,
            "status": "APPROVED",
        },
        headers={"x-partner-token": "apna-rashi-dev-token"},
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["application_id"] == app_id
    assert body["status"] == "APPROVED"


def test_apnarashi_callback_requires_partner_token(client):
    response = client.post(
        "/api/v1/loans/apnarashi-callback",
        json={
            "application_id": "missing-id",
            "status": "REJECTED",
        },
        headers={"x-partner-token": "wrong-token"},
    )
    assert response.status_code == 401