"""
PrahariPay Security Module
JWT authentication, password hashing, and ECDSA cryptographic operations.
"""

import base64
from datetime import timedelta
from typing import Optional

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.time import utcnow

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Password Hashing ───────────────────────────────────────────────

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# ─── JWT Tokens ──────────────────────────────────────────────────────

def create_access_token(
    data: dict, expires_delta: Optional[timedelta] = None
) -> str:
    to_encode = data.copy()
    expire = utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


# ─── ECDSA Cryptographic Operations ─────────────────────────────────

def generate_keypair() -> tuple[str, str]:
    """Generate an ECDSA P-256 keypair. Returns (private_pem, public_pem)."""
    private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
    public_key = private_key.public_key()

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()

    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()

    return private_pem, public_pem


def sign_data(private_key_pem: str, data: str) -> str:
    """Sign data with ECDSA private key. Returns base64-encoded signature."""
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode(), password=None, backend=default_backend()
    )
    signature = private_key.sign(data.encode(), ec.ECDSA(hashes.SHA256()))
    return base64.b64encode(signature).decode()


def verify_signature(public_key_pem: str, data: str, signature_b64: str) -> bool:
    """Verify an ECDSA signature. Returns True if valid."""
    try:
        public_key = serialization.load_pem_public_key(
            public_key_pem.encode(), backend=default_backend()
        )
        signature = base64.b64decode(signature_b64)
        public_key.verify(signature, data.encode(), ec.ECDSA(hashes.SHA256()))
        return True
    except (InvalidSignature, Exception):
        return False
