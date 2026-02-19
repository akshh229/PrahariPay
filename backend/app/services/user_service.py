"""
PrahariPay User Service
Handles user registration, lookup, and profile management.
"""

from sqlalchemy.orm import Session

from app.core.security import generate_keypair, get_password_hash, verify_password
from app.db.models import User


def create_user(
    db: Session,
    username: str,
    password: str,
    is_merchant: bool = False,
) -> User:
    """Register a new user with hashed password."""
    hashed = get_password_hash(password)
    user = User(
        username=username,
        hashed_password=hashed,
        is_merchant=is_merchant,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str):
    """Verify credentials. Returns User or None."""
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def get_user_by_id(db: Session, user_id: str):
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()


def assign_keypair(db: Session, user: User) -> tuple[str, str]:
    """Generate an ECDSA keypair, store the public key, return both."""
    private_pem, public_pem = generate_keypair()
    user.public_key = public_pem
    db.commit()
    db.refresh(user)
    return private_pem, public_pem


def update_balance(db: Session, user: User, amount: float, operation: str = "set"):
    if operation == "set":
        user.balance = amount
    elif operation == "add":
        user.balance += amount
    elif operation == "subtract":
        user.balance -= amount
    db.commit()
    db.refresh(user)
    return user


def update_trust_score(db: Session, user: User, adjustment: float):
    """Adjust trust score, clamped to [0, 1]."""
    user.trust_score = max(0.0, min(1.0, user.trust_score + adjustment))
    db.commit()
    db.refresh(user)
    return user
