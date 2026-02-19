from datetime import UTC, datetime


def utcnow() -> datetime:
    """Return naive UTC datetime without using deprecated datetime.utcnow()."""
    return datetime.now(UTC).replace(tzinfo=None)
