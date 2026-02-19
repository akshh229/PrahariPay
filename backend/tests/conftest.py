"""
PrahariPay Test Configuration
Shared fixtures for all test modules.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base, get_db
from app.main import app

SQLALCHEMY_TEST_URL = "sqlite:///./test_praharipay.db"

engine = create_engine(
    SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine
)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient with overridden DB dependency."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def registered_user(client):
    """Register a test user and return (user_data, tokens)."""
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "username": "testuser",
            "password": "testpass123",
            "is_merchant": False,
        },
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture
def merchant_user(client):
    """Register a merchant user."""
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "username": "merchant_001",
            "password": "merchantpass",
            "is_merchant": True,
        },
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture
def auth_header(registered_user):
    """Authorization header for the test user."""
    return {"Authorization": f"Bearer {registered_user['access_token']}"}


@pytest.fixture
def merchant_header(merchant_user):
    """Authorization header for the merchant."""
    return {"Authorization": f"Bearer {merchant_user['access_token']}"}
