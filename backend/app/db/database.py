"""
PrahariPay Database Engine
SQLAlchemy setup with SQLite (swappable to PostgreSQL via DATABASE_URL).
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import timedelta
import random
import uuid
import json

from app.core.config import settings
from app.core.security import get_password_hash
from app.core.time import utcnow

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=(
        {"check_same_thread": False}
        if settings.DATABASE_URL.startswith("sqlite")
        else {}
    ),
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Yield a database session for FastAPI dependency injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Called once on app startup."""
    import app.db.models  # noqa: F401 — ensure models are registered

    Base.metadata.create_all(bind=engine)
    _apply_sqlite_compat_migrations()
    demo_user_ids = _seed_demo_users()
    _seed_demo_transactions(demo_user_ids)


def _apply_sqlite_compat_migrations():
    """Backfill columns for existing SQLite DBs without full migration tooling."""
    if not settings.DATABASE_URL.startswith("sqlite"):
        return

    expected_columns = {
        "transactions": {
            "risk_flags": "TEXT",
            "category": "VARCHAR",
            "created_at": "DATETIME",
        }
    }

    with engine.begin() as conn:
        for table_name, columns in expected_columns.items():
            existing = {
                row[1]
                for row in conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
            }

            for column_name, column_type in columns.items():
                if column_name in existing:
                    continue
                conn.execute(
                    text(
                        f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
                    )
                )

        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_transactions_sender_timestamp "
                "ON transactions (sender_id, timestamp)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_transactions_merchant_timestamp "
                "ON transactions (merchant_id, timestamp)"
            )
        )


def _seed_demo_users() -> list[str]:
    """Ensure demo users exist with known credentials and return their IDs."""
    if not settings.DEMO_SEED_ENABLED:
        return []

    from app.db.models import User

    demo_users = [
        {"username": "demo_merchant", "password": "demo1234", "is_merchant": True},
        {"username": "demo_alice", "password": "demo1234", "is_merchant": False},
        {"username": "demo_bob", "password": "demo1234", "is_merchant": False},
        {"username": "demo_charlie", "password": "demo1234", "is_merchant": False},
        {"username": "demo_diana", "password": "demo1234", "is_merchant": False},
    ]

    session = SessionLocal()
    try:
        user_ids: list[str] = []
        for item in demo_users:
            existing = session.query(User).filter(User.username == item["username"]).first()
            if existing:
                user_ids.append(existing.id)
                continue

            created = User(
                username=item["username"],
                hashed_password=get_password_hash(item["password"]),
                is_merchant=item["is_merchant"],
                balance=10000.0,
                offline_credit_limit=2000.0,
                trust_score=1.0,
            )
            session.add(created)
            session.flush()
            user_ids.append(created.id)

        session.commit()
        return user_ids
    finally:
        session.close()


def _seed_demo_transactions(demo_user_ids: list[str]):
    """Seed demo transactions for local/dev UX with realistic activity."""
    if not settings.DEMO_SEED_ENABLED or not demo_user_ids:
        return

    from app.db.models import TransactionRecord

    session = SessionLocal()
    try:
        demo_existing_count = (
            session.query(TransactionRecord)
            .filter(
                (TransactionRecord.sender_id.in_(demo_user_ids))
                | (TransactionRecord.receiver_id.in_(demo_user_ids))
            )
            .count()
        )
        if demo_existing_count >= 120:
            return

        rng = random.Random(42)
        now = utcnow()
        demo_categories = [
            "FOOD",
            "TRANSPORT",
            "UTILITIES",
            "ENTERTAINMENT",
            "HEALTH",
            "TRANSFER",
            "OTHER",
        ]

        rows = []
        for day_offset in range(1, 91):
            day_tx_count = rng.randint(1, 3)
            tx_day = now - timedelta(days=day_offset)
            for _ in range(day_tx_count):
                sender = rng.choice(demo_user_ids)
                receiver_choices = [u for u in demo_user_ids if u != sender]
                receiver = rng.choice(receiver_choices)
                category = rng.choice(demo_categories)
                amount = round(rng.uniform(120.0, 5200.0), 2)
                risk_score = round(rng.uniform(0.05, 0.9), 2)
                classification = "high_risk" if risk_score >= 0.75 else "normal"
                risk_flags = [] if classification == "normal" else ["velocity_spike"]

                rows.append(
                    TransactionRecord(
                        transaction_id=f"demo_tx_{uuid.uuid4().hex[:12]}",
                        sender_id=sender,
                        receiver_id=receiver,
                        merchant_id=demo_user_ids[0],
                        invoice_id=None,
                        amount=amount,
                        timestamp=tx_day - timedelta(minutes=rng.randint(0, 1200)),
                        token_id=f"demo_tok_{uuid.uuid4().hex[:10]}",
                        signature="demo_signature",
                        propagated_to_peers=rng.randint(1, 4),
                        synced=True,
                        risk_score=risk_score,
                        classification=classification,
                        risk_flags=json.dumps(risk_flags),
                        category=category,
                    )
                )

        session.add_all(rows)
        session.commit()
    finally:
        session.close()
