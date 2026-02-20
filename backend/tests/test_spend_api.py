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

    def test_get_credit_score_no_auth_ok(self, client):
        """credit-score endpoint does not require auth."""
        resp = client.get("/api/v1/spend/credit-score/user1")
        assert resp.status_code == 200

    def test_get_credit_score_any_user_ok(self, client):
        """credit-score endpoint is accessible for any user_id."""
        resp = client.get("/api/v1/spend/credit-score/some_other_user")
        assert resp.status_code == 200

    def test_get_credit_score_success(self, client, db_session, registered_user):
        user_id = registered_user["user_id"]

        tx1 = TransactionRecord(
            transaction_id="tx_cs_1",
            sender_id=user_id,
            receiver_id="merchant_1",
            amount=500.0,
            timestamp=utcnow(),
            token_id="tok_cs_1",
            signature="sig",
            category=SpendCategory.FOOD.value,
            synced=True,
            risk_score=0.2,
        )
        tx2 = TransactionRecord(
            transaction_id="tx_cs_2",
            sender_id="payer_1",
            receiver_id=user_id,
            amount=2500.0,
            timestamp=utcnow(),
            token_id="tok_cs_2",
            signature="sig",
            category=SpendCategory.TRANSFER.value,
            synced=True,
        )
        tx3 = TransactionRecord(
            transaction_id="tx_cs_3",
            sender_id=user_id,
            receiver_id="merchant_2",
            amount=450.0,
            timestamp=utcnow(),
            token_id="tok_cs_3",
            signature="sig",
            category=SpendCategory.UTILITIES.value,
            synced=True,
            risk_score=0.1,
        )
        tx4 = TransactionRecord(
            transaction_id="tx_cs_4",
            sender_id=user_id,
            receiver_id="merchant_3",
            amount=300.0,
            timestamp=utcnow(),
            token_id="tok_cs_4",
            signature="sig",
            category=SpendCategory.ENTERTAINMENT.value,
            synced=True,
            risk_score=0.1,
        )
        tx5 = TransactionRecord(
            transaction_id="tx_cs_5",
            sender_id=user_id,
            receiver_id="merchant_4",
            amount=350.0,
            timestamp=utcnow(),
            token_id="tok_cs_5",
            signature="sig",
            category=SpendCategory.HEALTH.value,
            synced=True,
            risk_score=0.1,
        )
        tx6 = TransactionRecord(
            transaction_id="tx_cs_6",
            sender_id=user_id,
            receiver_id="merchant_5",
            amount=250.0,
            timestamp=utcnow(),
            token_id="tok_cs_6",
            signature="sig",
            category=SpendCategory.TRANSPORT.value,
            synced=True,
            risk_score=0.1,
        )
        tx7 = TransactionRecord(
            transaction_id="tx_cs_7",
            sender_id="payer_2",
            receiver_id=user_id,
            amount=2200.0,
            timestamp=utcnow(),
            token_id="tok_cs_7",
            signature="sig",
            category=SpendCategory.TRANSFER.value,
            synced=True,
        )

        db_session.add_all([tx1, tx2, tx3, tx4, tx5, tx6, tx7])
        db_session.commit()

        resp = client.get(
            f"/api/v1/spend/credit-score/{user_id}?lookback_months=6",
            headers={"Authorization": f"Bearer {registered_user['access_token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == user_id
        assert data["lookback_months"] == 6
        assert "credit_score" in data
        assert "score" in data["credit_score"]
        assert "factors" in data["credit_score"]

    def test_get_credit_score_invalid_lookback(self, client, registered_user):
        user_id = registered_user["user_id"]
        resp = client.get(
            f"/api/v1/spend/credit-score/{user_id}?lookback_months=2",
            headers={"Authorization": f"Bearer {registered_user['access_token']}"},
        )
        assert resp.status_code == 400
        assert "lookback_months" in resp.json()["detail"]

    def test_get_credit_score_insufficient_data(self, client, registered_user):
        user_id = registered_user["user_id"]
        resp = client.get(
            f"/api/v1/spend/credit-score/{user_id}?lookback_months=6",
            headers={"Authorization": f"Bearer {registered_user['access_token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["credit_score"]["is_insufficient_data"] is True
        assert data["credit_score"]["band"] == "Insufficient Data"

    def test_seed_demo_activity_for_authenticated_user(self, client, registered_user):
        user_id = registered_user["user_id"]
        headers = {"Authorization": f"Bearer {registered_user['access_token']}"}

        seed_resp = client.post(f"/api/v1/spend/seed-demo/{user_id}?count=12", headers=headers)
        assert seed_resp.status_code == 200
        body = seed_resp.json()
        assert body["status"] == "success"
        assert body["created_count"] == 12

        summary_resp = client.get(f"/api/v1/spend/summary/{user_id}?period=monthly")
        assert summary_resp.status_code == 200
        summary = summary_resp.json()
        assert summary["total_amount"] > 0


class TestAIInsightsAPI:
    """Tests for GET /api/v1/spend/insights/{user_id}"""

    def test_get_insights_empty_user(self, client):
        """A user with no transactions should still get a valid response (fallback insight)."""
        resp = client.get("/api/v1/spend/insights/no_tx_user?period=monthly")
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == "no_tx_user"
        assert data["total"] >= 1
        # at least the fallback "All Clear" insight
        assert any(i["type"] == "positive" for i in data["insights"])

    def test_get_insights_invalid_period(self, client):
        resp = client.get("/api/v1/spend/insights/user1?period=yearly")
        assert resp.status_code == 400

    def test_get_insights_with_transactions(self, client, db_session):
        """A user with transactions gets trend / spend-related insights."""
        user_id = "insight_test_user"
        now = utcnow()
        from datetime import timedelta

        # add 8 outgoing transactions across current period
        for i in range(8):
            db_session.add(TransactionRecord(
                transaction_id=f"ins_tx_{i}",
                sender_id=user_id,
                receiver_id=f"merchant_{i % 3}",
                amount=500.0 + i * 100,
                timestamp=now - timedelta(days=i * 3),
                token_id=f"tok_{i}",
                signature="sig",
                category=SpendCategory.FOOD.value if i < 4 else SpendCategory.TRANSPORT.value,
                synced=True,
                risk_score=0.1,
                classification="normal",
            ))
        # add 3 incoming transactions
        for i in range(3):
            db_session.add(TransactionRecord(
                transaction_id=f"ins_in_{i}",
                sender_id=f"income_{i}",
                receiver_id=user_id,
                amount=3000.0,
                timestamp=now - timedelta(days=i * 5),
                token_id=f"tok_in_{i}",
                signature="sig",
                category=SpendCategory.TRANSFER.value,
                synced=True,
                risk_score=0.05,
                classification="normal",
            ))
        db_session.commit()

        resp = client.get(f"/api/v1/spend/insights/{user_id}?period=monthly")
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == user_id
        assert data["total"] >= 1
        # Should have at least a trend type insight
        types = {i["type"] for i in data["insights"]}
        assert len(types) >= 1

    def test_insights_contain_high_risk_warning(self, client, db_session):
        """High-risk transactions should produce an anomaly insight."""
        user_id = "risky_insight_user"
        now = utcnow()
        from datetime import timedelta

        for i in range(6):
            db_session.add(TransactionRecord(
                transaction_id=f"risk_tx_{i}",
                sender_id=user_id,
                receiver_id="bad_merchant",
                amount=1000.0,
                timestamp=now - timedelta(days=i * 2),
                token_id=f"rtok_{i}",
                signature="sig",
                category=SpendCategory.OTHER.value,
                synced=True,
                risk_score=0.85 if i < 3 else 0.1,
                classification="high_risk" if i < 3 else "normal",
            ))
        db_session.commit()

        resp = client.get(f"/api/v1/spend/insights/{user_id}?period=monthly")
        assert resp.status_code == 200
        data = resp.json()
        # Should contain a high-risk anomaly
        anomalies = [i for i in data["insights"] if i["type"] == "anomaly" and "risk" in i["title"].lower()]
        assert len(anomalies) >= 1
        assert anomalies[0]["severity"] == "high"
        assert anomalies[0]["actionable"] is True

    def test_insights_response_model_fields(self, client, db_session):
        """Check all expected fields are present in each insight."""
        user_id = "field_check_user"
        now = utcnow()
        db_session.add(TransactionRecord(
            transaction_id="field_tx",
            sender_id=user_id,
            receiver_id="merch",
            amount=500.0,
            timestamp=now,
            token_id="ftok",
            signature="sig",
            category=SpendCategory.FOOD.value,
            synced=True,
        ))
        db_session.commit()

        resp = client.get(f"/api/v1/spend/insights/{user_id}?period=monthly")
        assert resp.status_code == 200
        data = resp.json()
        required_fields = {"id", "type", "severity", "title", "message", "icon", "actionable", "created_at"}
        for insight in data["insights"]:
            assert required_fields.issubset(insight.keys()), f"Missing fields: {required_fields - insight.keys()}"
