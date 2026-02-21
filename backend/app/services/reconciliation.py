"""
PrahariPay Reconciliation Engine
Real risk scoring with duplicate-token detection, burst analysis,
velocity checks, circular-transaction detection, and signature verification.
"""

import json
from datetime import timedelta

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.security import verify_signature
from app.db.models import TransactionRecord, UsedToken, User
from app.services.spend_analyzer import categorize_transaction


def calculate_risk_score(transaction, db: Session) -> tuple[float, list[str]]:
    """
    Calculate a composite risk score for a transaction.
    Returns (score, list_of_flags).
    """
    risk_score = 0.0
    flags: list[str] = []

    token_str = str(transaction.token_id)

    # ── 1. Duplicate Token Detection (DOUBLE-SPEND) ──────────────
    existing_token = (
        db.query(UsedToken).filter(UsedToken.token_id == token_str).first()
    )
    if existing_token:
        risk_score += 0.5
        flags.append("DUPLICATE_TOKEN")

    # ── 2. High Amount ───────────────────────────────────────────
    if transaction.amount > settings.HIGH_AMOUNT_THRESHOLD:
        risk_score += 0.2
        flags.append("HIGH_AMOUNT")

    # ── 3. Burst Detection ───────────────────────────────────────
    window_start = transaction.timestamp - timedelta(
        seconds=settings.BURST_WINDOW_SECONDS
    )
    recent_count = (
        db.query(TransactionRecord)
        .filter(
            TransactionRecord.sender_id == transaction.sender_id,
            TransactionRecord.timestamp >= window_start,
            TransactionRecord.timestamp <= transaction.timestamp,
        )
        .count()
    )
    if recent_count >= settings.BURST_THRESHOLD:
        risk_score += 0.25
        flags.append("BURST_DETECTED")

    # ── 4. Velocity Check (total amount in time window) ──────────
    vel_start = transaction.timestamp - timedelta(
        seconds=settings.VELOCITY_WINDOW_SECONDS
    )
    from sqlalchemy import func

    recent_total = (
        db.query(func.coalesce(func.sum(TransactionRecord.amount), 0))
        .filter(
            TransactionRecord.sender_id == transaction.sender_id,
            TransactionRecord.timestamp >= vel_start,
        )
        .scalar()
    )
    if (recent_total + transaction.amount) > settings.VELOCITY_AMOUNT_THRESHOLD:
        risk_score += 0.2
        flags.append("VELOCITY_EXCEEDED")

    # ── 5. Low Peer Propagation ──────────────────────────────────
    if transaction.propagated_to_peers == 0:
        risk_score += 0.1
        flags.append("NO_PEER_PROPAGATION")

    # ── 6. Circular Transaction Detection (A→B→A) ────────────────
    circular = (
        db.query(TransactionRecord)
        .filter(
            TransactionRecord.sender_id == transaction.receiver_id,
            TransactionRecord.receiver_id == transaction.sender_id,
            TransactionRecord.timestamp >= window_start,
        )
        .first()
    )
    if circular:
        risk_score += 0.2
        flags.append("CIRCULAR_TRANSACTION")

    # ── 7. Signature Verification ────────────────────────────────
    sender = (
        db.query(User).filter(User.id == transaction.sender_id).first()
    )
    if sender and sender.public_key:
        sign_data = f"{transaction.transaction_id}:{transaction.sender_id}:{transaction.receiver_id}:{transaction.amount}:{transaction.timestamp.isoformat()}"
        if not verify_signature(
            sender.public_key, sign_data, transaction.signature
        ):
            risk_score += 0.3
            flags.append("INVALID_SIGNATURE")
    elif transaction.signature.startswith("simulated_sig_"):
        # Tolerate simulated sigs in MVP — minor flag only
        flags.append("SIMULATED_SIGNATURE")

    # Cap at 1.0
    risk_score = min(risk_score, 1.0)
    return risk_score, flags


def classify_risk(score: float) -> str:
    if score < 0.3:
        return "Valid"
    elif score < 0.6:
        return "Likely Honest Conflict"
    elif score < 0.8:
        return "Suspicious"
    else:
        return "Likely Fraud"


def reconcile_transaction(transaction, db: Session) -> dict:
    """
    Full reconciliation pipeline for a single transaction.
    - Score risk
    - Classify
    - Register the token as used (if not duplicate)
    - Store in DB
    """
    existing_tx = (
        db.query(TransactionRecord)
        .filter(TransactionRecord.transaction_id == str(transaction.transaction_id))
        .first()
    )
    if existing_tx is not None:
        parsed_flags: list[str] = []
        if existing_tx.risk_flags:
            try:
                loaded = json.loads(existing_tx.risk_flags)
                if isinstance(loaded, list):
                    parsed_flags = [str(x) for x in loaded]
            except (TypeError, ValueError):
                parsed_flags = []

        return {
            "transaction_id": transaction.transaction_id,
            "risk_score": round(float(existing_tx.risk_score or 0.0), 4),
            "classification": existing_tx.classification or "Valid",
            "risk_flags": parsed_flags,
            "synced": True,
        }

    score, flags = calculate_risk_score(transaction, db)
    classification = classify_risk(score)

    token_str = str(transaction.token_id)

    # Register token as used (if not already)
    if "DUPLICATE_TOKEN" not in flags:
        used = UsedToken(
            token_id=token_str,
            transaction_id=str(transaction.transaction_id),
        )
        db.add(used)

    # Categorize transaction (AI Spend Analyzer)
    # Using invoice_id as proxy for description if available
    category = categorize_transaction(
        transaction.invoice_id,
        transaction.merchant_id,
        transaction.receiver_id,
    )

    # Persist the transaction
    tx_record = TransactionRecord(
        transaction_id=str(transaction.transaction_id),
        sender_id=transaction.sender_id,
        receiver_id=transaction.receiver_id,
        merchant_id=transaction.merchant_id,
        invoice_id=transaction.invoice_id,
        amount=transaction.amount,
        timestamp=transaction.timestamp,
        token_id=token_str,
        signature=transaction.signature,
        propagated_to_peers=transaction.propagated_to_peers,
        synced=True,
        risk_score=score,
        classification=classification,
        risk_flags=json.dumps(flags),
        category=category.value,
    )
    db.add(tx_record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing_tx = (
            db.query(TransactionRecord)
            .filter(TransactionRecord.transaction_id == str(transaction.transaction_id))
            .first()
        )
        if existing_tx is not None:
            parsed_flags: list[str] = []
            if existing_tx.risk_flags:
                try:
                    loaded = json.loads(existing_tx.risk_flags)
                    if isinstance(loaded, list):
                        parsed_flags = [str(x) for x in loaded]
                except (TypeError, ValueError):
                    parsed_flags = []

            return {
                "transaction_id": transaction.transaction_id,
                "risk_score": round(float(existing_tx.risk_score or 0.0), 4),
                "classification": existing_tx.classification or "Valid",
                "risk_flags": parsed_flags,
                "synced": True,
            }
        raise

    # Adjust sender trust score based on risk
    sender = (
        db.query(User).filter(User.id == transaction.sender_id).first()
    )
    if sender:
        if classification == "Likely Fraud":
            sender.trust_score = max(0.0, sender.trust_score - 0.2)
        elif classification == "Suspicious":
            sender.trust_score = max(0.0, sender.trust_score - 0.05)
        elif classification == "Valid":
            sender.trust_score = min(1.0, sender.trust_score + 0.01)
        db.commit()

    return {
        "transaction_id": transaction.transaction_id,
        "risk_score": round(score, 4),
        "classification": classification,
        "risk_flags": flags,
        "synced": True,
    }
