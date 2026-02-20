import pytest
from datetime import timedelta

from app.core.time import utcnow
from app.db.models import TransactionRecord, BudgetThreshold
from app.services.spend_analyzer import (
    categorize_transaction,
    compute_confidence_score,
    compute_spend_summary,
    generate_alerts,
    generate_ai_insights,
)
from app.models.spend import SpendCategory

def test_categorize_transaction():
    assert categorize_transaction("Uber Ride") == SpendCategory.TRANSPORT
    assert categorize_transaction("Dinner at Chilies") == SpendCategory.FOOD
    assert categorize_transaction("Monthly Electricity Bill") == SpendCategory.UTILITIES
    assert categorize_transaction("Netflix Subscription") == SpendCategory.ENTERTAINMENT
    assert categorize_transaction("Apollo Pharmacy") == SpendCategory.HEALTH
    assert categorize_transaction("Transfer to Bob") == SpendCategory.TRANSFER
    assert categorize_transaction("Unknown Vendor") == SpendCategory.OTHER

class TestSpendAnalyzer:
    def test_compute_spend_summary_empty(self, db_session):
        summary = compute_spend_summary(db_session, "user_new", "monthly")
        assert summary.total_amount == 0.0
        assert summary.trend_direction == "flat"
        assert len(summary.breakdown) == 0

    def test_compute_spend_summary_with_data(self, db_session):
        user_id = "user_spend_test"
        
        # Add some transactions
        tx1 = TransactionRecord(
            transaction_id="tx1",
            sender_id=user_id,
            receiver_id="rec1",
            amount=500.0,
            timestamp=utcnow(),
            token_id="tok1",
            signature="sig",
            category=SpendCategory.FOOD.value
        )
        tx2 = TransactionRecord(
            transaction_id="tx2",
            sender_id=user_id,
            receiver_id="rec2",
            amount=200.0,
            timestamp=utcnow(),
            token_id="tok2",
            signature="sig",
            category=SpendCategory.TRANSPORT.value
        )
        db_session.add(tx1)
        db_session.add(tx2)
        db_session.commit()
        
        summary = compute_spend_summary(db_session, user_id, "monthly")
        assert summary.total_amount == 700.0
        assert len(summary.breakdown) == 2
        assert summary.breakdown[0].category == SpendCategory.FOOD
        assert summary.breakdown[0].percentage == round(500/700 * 100, 1)

    def test_generate_alerts(self, db_session):
        user_id = "user_alert_test"
        
        # Set a budget of 100 for FOOD
        budget = BudgetThreshold(
            user_id=user_id,
            category=SpendCategory.FOOD.value,
            monthly_limit=100.0
        )
        db_session.add(budget)
        
        # Spend 200 on FOOD
        tx = TransactionRecord(
            transaction_id="tx_alert",
            sender_id=user_id,
            receiver_id="rec",
            amount=200.0,
            timestamp=utcnow(),
            token_id="tok_alert",
            signature="sig",
            category=SpendCategory.FOOD.value
        )
        db_session.add(tx)
        db_session.commit()
        
        alerts = generate_alerts(db_session, user_id)
        assert len(alerts) == 1
        assert alerts[0].type == "BUDGET"
        assert alerts[0].severity == "high"
        assert "exceeded" in alerts[0].message

    def test_compute_confidence_score_excellent_band(self, db_session):
        user_id = "user_conf_excellent"
        now = utcnow()

        rows = []
        tx_index = 0
        for month in range(6):
            ts = now - timedelta(days=30 * month + 2)

            rows.append(
                TransactionRecord(
                    transaction_id=f"tx_inc_exc_{month}",
                    sender_id=f"employer_{month}",
                    receiver_id=user_id,
                    amount=6000.0,
                    timestamp=ts,
                    token_id=f"tok_inc_exc_{month}",
                    signature="sig",
                    category=SpendCategory.TRANSFER.value,
                    synced=True,
                )
            )

            for amount in (950.0, 900.0):
                tx_index += 1
                rows.append(
                    TransactionRecord(
                        transaction_id=f"tx_out_exc_{tx_index}",
                        sender_id=user_id,
                        receiver_id=f"merchant_exc_{tx_index}",
                        amount=amount,
                        timestamp=ts,
                        token_id=f"tok_out_exc_{tx_index}",
                        signature="sig",
                        category=SpendCategory.FOOD.value,
                        synced=True,
                        risk_score=0.1,
                        classification="normal",
                    )
                )

        db_session.add_all(rows)
        db_session.commit()

        score = compute_confidence_score(db_session, user_id, lookback_months=6)
        assert score.is_insufficient_data is False
        assert score.band == "Excellent"
        assert score.score >= 780

    def test_compute_confidence_score_poor_band(self, db_session):
        user_id = "user_conf_poor"
        now = utcnow()

        monthly_income = [400.0, 0.0, 1400.0, 100.0, 0.0, 600.0]
        rows = []
        tx_index = 0

        for month in range(6):
            ts = now - timedelta(days=30 * month + 2)
            income = monthly_income[month]
            if income > 0:
                rows.append(
                    TransactionRecord(
                        transaction_id=f"tx_inc_poor_{month}",
                        sender_id=f"payer_{month}",
                        receiver_id=user_id,
                        amount=income,
                        timestamp=ts,
                        token_id=f"tok_inc_poor_{month}",
                        signature="sig",
                        category=SpendCategory.TRANSFER.value,
                        synced=True,
                    )
                )

            for amount in (750.0, 650.0):
                tx_index += 1
                rows.append(
                    TransactionRecord(
                        transaction_id=f"tx_out_poor_{tx_index}",
                        sender_id=user_id,
                        receiver_id=f"merchant_poor_{tx_index}",
                        amount=amount,
                        timestamp=ts,
                        token_id=f"tok_out_poor_{tx_index}",
                        signature="sig",
                        category=SpendCategory.UTILITIES.value,
                        synced=True,
                        risk_score=0.86,
                        classification="high_risk",
                    )
                )

        db_session.add_all(rows)
        db_session.commit()

        score = compute_confidence_score(db_session, user_id, lookback_months=6)
        assert score.is_insufficient_data is False
        assert score.band == "Poor"
        assert score.score < 620


class TestAIInsightsService:
    """Unit tests for generate_ai_insights."""

    def test_empty_user_returns_fallback(self, db_session):
        insights = generate_ai_insights(db_session, "no_data_user", period="monthly")
        assert len(insights) >= 1
        assert insights[0].type == "positive"
        assert insights[0].title == "All Clear"

    def test_trend_insight_generated(self, db_session):
        """Current-period transactions should produce a trend insight."""
        user_id = "trend_insight_user"
        now = utcnow()
        for i in range(5):
            db_session.add(TransactionRecord(
                transaction_id=f"trend_tx_{i}",
                sender_id=user_id,
                receiver_id="merchant_a",
                amount=600.0,
                timestamp=now - timedelta(days=i * 3),
                token_id=f"trend_tok_{i}",
                signature="sig",
                category=SpendCategory.FOOD.value,
                synced=True,
            ))
        db_session.commit()

        insights = generate_ai_insights(db_session, user_id, period="monthly")
        types = {i.type for i in insights}
        assert "trend" in types or "positive" in types

    def test_risky_transactions_generate_anomaly(self, db_session):
        user_id = "risky_ai_user"
        now = utcnow()
        for i in range(4):
            db_session.add(TransactionRecord(
                transaction_id=f"risky_ai_{i}",
                sender_id=user_id,
                receiver_id="shady_merchant",
                amount=800.0,
                timestamp=now - timedelta(days=i),
                token_id=f"risky_tok_{i}",
                signature="sig",
                category=SpendCategory.OTHER.value,
                synced=True,
                risk_score=0.9,
                classification="high_risk",
            ))
        db_session.commit()

        insights = generate_ai_insights(db_session, user_id, period="monthly")
        anomalies = [i for i in insights if i.type == "anomaly"]
        assert len(anomalies) >= 1
        assert anomalies[0].severity == "high"

    def test_recurring_payment_detection(self, db_session):
        user_id = "recurring_user"
        now = utcnow()
        # 4 payments to same receiver
        for i in range(4):
            db_session.add(TransactionRecord(
                transaction_id=f"recur_tx_{i}",
                sender_id=user_id,
                receiver_id="netflix_sub",
                amount=199.0,
                timestamp=now - timedelta(days=i * 7),
                token_id=f"recur_tok_{i}",
                signature="sig",
                category=SpendCategory.ENTERTAINMENT.value,
                synced=True,
            ))
        db_session.commit()

        insights = generate_ai_insights(db_session, user_id, period="monthly")
        recurring = [i for i in insights if i.type == "recurring"]
        assert len(recurring) >= 1
        assert "netflix_sub" in recurring[0].message.lower()

    def test_savings_insight(self, db_session):
        user_id = "saver_user"
        now = utcnow()
        # High income, low spending
        db_session.add(TransactionRecord(
            transaction_id="saver_in",
            sender_id="employer",
            receiver_id=user_id,
            amount=50000.0,
            timestamp=now - timedelta(days=5),
            token_id="saver_tok_in",
            signature="sig",
            category=SpendCategory.TRANSFER.value,
            synced=True,
        ))
        for i in range(3):
            db_session.add(TransactionRecord(
                transaction_id=f"saver_out_{i}",
                sender_id=user_id,
                receiver_id=f"shop_{i}",
                amount=1000.0,
                timestamp=now - timedelta(days=i * 3),
                token_id=f"saver_tok_out_{i}",
                signature="sig",
                category=SpendCategory.FOOD.value,
                synced=True,
            ))
        db_session.commit()

        insights = generate_ai_insights(db_session, user_id, period="monthly")
        savings = [i for i in insights if i.type == "savings"]
        assert len(savings) >= 1
        assert "saved" in savings[0].message.lower() or "savings" in savings[0].message.lower()

    def test_insights_sorted_by_severity(self, db_session):
        """High-severity insights should come before low/info."""
        user_id = "sort_user"
        now = utcnow()
        # Mix of risky + normal
        for i in range(6):
            db_session.add(TransactionRecord(
                transaction_id=f"sort_tx_{i}",
                sender_id=user_id,
                receiver_id="merch",
                amount=500.0,
                timestamp=now - timedelta(days=i),
                token_id=f"sort_tok_{i}",
                signature="sig",
                category=SpendCategory.FOOD.value,
                synced=True,
                risk_score=0.9 if i == 0 else 0.1,
                classification="high_risk" if i == 0 else "normal",
            ))
        db_session.commit()

        insights = generate_ai_insights(db_session, user_id, period="monthly")
        severity_order = {"high": 0, "medium": 1, "low": 2, "info": 3}
        prev_rank = -1
        for i in insights:
            rank = severity_order.get(i.severity, 9)
            assert rank >= prev_rank, f"Insights not sorted: {i.severity} after rank {prev_rank}"
            prev_rank = rank
