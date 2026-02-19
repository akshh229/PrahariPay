"""
PrahariPay Configuration
Central settings for the application.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings:
    PROJECT_NAME: str = "PrahariPay"
    VERSION: str = "0.2.0"
    API_V1_PREFIX: str = "/api/v1"

    # JWT
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "praharipay-dev-secret-key-change-in-production"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{BASE_DIR / 'praharipay.db'}"
    )

    # Guardian Recovery
    GUARDIAN_QUORUM: int = 3
    GUARDIAN_MAX: int = 5
    RECOVERY_EXPIRY_HOURS: int = 48

    # Risk Scoring Thresholds
    HIGH_AMOUNT_THRESHOLD: float = 5000.0
    BURST_WINDOW_SECONDS: int = 300  # 5 minutes
    BURST_THRESHOLD: int = 5  # max txs in burst window before flagging
    VELOCITY_WINDOW_SECONDS: int = 3600  # 1 hour
    VELOCITY_AMOUNT_THRESHOLD: float = 50000.0  # max amount in velocity window

    # Gossip
    MAX_GOSSIP_HOPS: int = 5


settings = Settings()
