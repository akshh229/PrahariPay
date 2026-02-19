import pytest

from app.core.time import utcnow
from app.db.models import TransactionRecord, BudgetThreshold
from app.services.spend_analyzer import (
    categorize_transaction,
    compute_spend_summary,
    generate_alerts,
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
