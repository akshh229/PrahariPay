"""
PrahariPay AI / Anomaly Detection Engine
Pattern-based anomaly detection for transaction streams.
Upgrade path → ML models (TensorFlow Lite / federated learning).
"""

from collections import defaultdict
from datetime import timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import TransactionRecord


def detect_anomalies(db: Session, window_hours: int = 24) -> list[dict]:
    """
    Run all anomaly detectors over the recent transaction window.
    Returns a list of anomaly reports.
    """
    anomalies: list[dict] = []

    anomalies.extend(detect_collusion_patterns(db, window_hours))
    anomalies.extend(detect_circular_loops(db, window_hours))
    anomalies.extend(detect_burst_abuse(db, window_hours))

    return anomalies


# ─── Collusion Detection ────────────────────────────────────────────


def detect_collusion_patterns(
    db: Session, window_hours: int = 24
) -> list[dict]:
    """
    Detect pairs of users with suspiciously high reciprocal transaction counts.
    Pattern: A→B and B→A both with many transactions in a short window.
    """
    from datetime import datetime

    cutoff = datetime.utcnow() - timedelta(hours=window_hours)

    # Get all sender→receiver pairs with counts in the window
    pairs = (
        db.query(
            TransactionRecord.sender_id,
            TransactionRecord.receiver_id,
            func.count(TransactionRecord.id).label("tx_count"),
            func.sum(TransactionRecord.amount).label("total_amount"),
        )
        .filter(TransactionRecord.timestamp >= cutoff)
        .group_by(TransactionRecord.sender_id, TransactionRecord.receiver_id)
        .having(func.count(TransactionRecord.id) >= 3)
        .all()
    )

    # Build a lookup: (A,B) → count
    pair_map: dict[tuple[str, str], dict] = {}
    for sender, receiver, count, total in pairs:
        pair_map[(sender, receiver)] = {"count": count, "total": float(total or 0)}

    anomalies = []
    checked: set[tuple[str, str]] = set()

    for (a, b), fwd in pair_map.items():
        if (a, b) in checked or (b, a) in checked:
            continue
        rev = pair_map.get((b, a))
        if rev and fwd["count"] >= 3 and rev["count"] >= 3:
            anomalies.append(
                {
                    "type": "COLLUSION",
                    "users": [a, b],
                    "forward_txs": fwd["count"],
                    "reverse_txs": rev["count"],
                    "forward_amount": fwd["total"],
                    "reverse_amount": rev["total"],
                    "severity": "high",
                }
            )
            checked.add((a, b))

    return anomalies


# ─── Circular Loop Detection ────────────────────────────────────────


def detect_circular_loops(
    db: Session, window_hours: int = 24
) -> list[dict]:
    """
    Detect circular transaction chains: A→B→C→A within the time window.
    Uses a simple depth-limited graph traversal.
    """
    from datetime import datetime

    cutoff = datetime.utcnow() - timedelta(hours=window_hours)

    edges = (
        db.query(TransactionRecord.sender_id, TransactionRecord.receiver_id)
        .filter(TransactionRecord.timestamp >= cutoff)
        .distinct()
        .all()
    )

    # Build adjacency list
    graph: dict[str, set[str]] = defaultdict(set)
    for sender, receiver in edges:
        graph[sender].add(receiver)

    anomalies = []
    visited_cycles: set[tuple] = set()

    for start in graph:
        # BFS up to depth 4
        stack = [(start, [start])]
        while stack:
            node, path = stack.pop()
            for neighbor in graph.get(node, set()):
                if neighbor == start and len(path) >= 3:
                    cycle = tuple(sorted(path))
                    if cycle not in visited_cycles:
                        visited_cycles.add(cycle)
                        anomalies.append(
                            {
                                "type": "CIRCULAR_LOOP",
                                "path": path + [start],
                                "depth": len(path),
                                "severity": "medium"
                                if len(path) == 3
                                else "high",
                            }
                        )
                elif neighbor not in path and len(path) < 4:
                    stack.append((neighbor, path + [neighbor]))

    return anomalies


# ─── Burst Abuse ────────────────────────────────────────────────────


def detect_burst_abuse(
    db: Session, window_hours: int = 24
) -> list[dict]:
    """
    Detect users with abnormally high transaction frequency.
    """
    from datetime import datetime

    cutoff = datetime.utcnow() - timedelta(hours=window_hours)

    user_counts = (
        db.query(
            TransactionRecord.sender_id,
            func.count(TransactionRecord.id).label("tx_count"),
            func.sum(TransactionRecord.amount).label("total_amount"),
        )
        .filter(TransactionRecord.timestamp >= cutoff)
        .group_by(TransactionRecord.sender_id)
        .having(func.count(TransactionRecord.id) >= 10)
        .all()
    )

    anomalies = []
    for user_id, count, total in user_counts:
        anomalies.append(
            {
                "type": "BURST_ABUSE",
                "user_id": user_id,
                "transaction_count": count,
                "total_amount": float(total or 0),
                "severity": "high" if count >= 20 else "medium",
            }
        )

    return anomalies


# ─── Trust Score Calculation ─────────────────────────────────────────


def calculate_trust_adjustment(user_id: str, db: Session) -> float:
    """
    Calculate a trust score adjustment based on the user's recent history.
    Positive = trustworthy, negative = risky.
    """
    from datetime import datetime

    cutoff = datetime.utcnow() - timedelta(hours=168)  # 7 days

    recent_txs = (
        db.query(TransactionRecord)
        .filter(
            TransactionRecord.sender_id == user_id,
            TransactionRecord.timestamp >= cutoff,
        )
        .all()
    )

    if not recent_txs:
        return 0.0

    valid_count = sum(1 for t in recent_txs if t.classification == "Valid")
    fraud_count = sum(
        1 for t in recent_txs if t.classification == "Likely Fraud"
    )
    suspicious_count = sum(
        1 for t in recent_txs if t.classification == "Suspicious"
    )
    total = len(recent_txs)

    adjustment = (valid_count / total) * 0.05
    adjustment -= (fraud_count / total) * 0.3
    adjustment -= (suspicious_count / total) * 0.1

    return round(adjustment, 4)
