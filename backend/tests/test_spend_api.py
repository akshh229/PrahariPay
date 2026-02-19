import pytest
from app.db.models import TransactionRecord, BudgetThreshold
from app.models.spend import SpendCategory
from app.core.time import utcnow

class TestSpendAPI:
    def test_get_analyze(self, client, db_session):
        user_id = "user_api_test"
        # Add data
        tx = TransactionRecord(
            transaction_id="tx_api",
            sender_id=user_id,
            receiver_id="rec",
            amount=100.0,
            timestamp=utcnow(),
            token_id="tok",
            signature="sig",
            category=SpendCategory.FOOD.value,
            synced=True
        )
        db_session.add(tx)
        db_session.commit()

        resp = client.get(f"/api/v1/spend/analyze/{user_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "summary" in data
        assert "alerts" in data
        assert data["summary"]["total_amount"] == 100.0
        assert len(data["summary"]["breakdown"]) == 1
        assert data["summary"]["breakdown"][0]["category"] == "FOOD"

    def test_get_summary_invalid_period(self, client):
        resp = client.get("/api/v1/spend/summary/user1?period=yearly")
        assert resp.status_code == 400

    def test_get_alerts(self, client, db_session):
        user_id = "user_alert_api"
        # Budget
        budget = BudgetThreshold(
            user_id=user_id,
            category="FOOD",
            monthly_limit=50.0
        )
        db_session.add(budget)
        tx = TransactionRecord(
            transaction_id="tx_alert_api",
            sender_id=user_id,
            receiver_id="rec",
            amount=60.0,
            timestamp=utcnow(),
            token_id="tok_alert",
            signature="sig",
            category="FOOD",
            synced=True
        )
        db_session.add(tx)
        db_session.commit()

        resp = client.get(f"/api/v1/spend/alerts/{user_id}")
        assert resp.status_code == 200
        alerts = resp.json()
        assert len(alerts) == 1
        assert alerts[0]["type"] == "BUDGET"
