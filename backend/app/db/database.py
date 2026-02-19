"""
PrahariPay Database Engine
SQLAlchemy setup with SQLite (swappable to PostgreSQL via DATABASE_URL).
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

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
