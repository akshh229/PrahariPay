"""
PrahariPay Auth API
Registration, login, token refresh, keypair generation, and profile.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_keypair,
)
from app.db.database import get_db
from app.db.models import User
from app.models.auth import (
    KeyPairResponse,
    TokenRefresh,
    TokenResponse,
    UserLogin,
    UserProfile,
    UserRegister,
)
from app.services.user_service import (
    authenticate_user,
    create_user,
    get_user_by_username,
)

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account."""
    existing = get_user_by_username(db, body.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )

    user = create_user(
        db,
        username=body.username,
        password=body.password,
        is_merchant=body.is_merchant,
    )

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        username=user.username,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: Session = Depends(get_db)):
    """Authenticate and receive JWT tokens."""
    user = authenticate_user(db, body.username, body.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        username=user.username,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: TokenRefresh, db: Session = Depends(get_db)):
    """Exchange a refresh token for a new access token."""
    payload = decode_token(body.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    access_token = create_access_token({"sub": user.id})
    new_refresh = create_refresh_token({"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh,
        user_id=user.id,
        username=user.username,
    )


@router.get("/profile", response_model=UserProfile)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get the authenticated user's profile."""
    return UserProfile(
        id=current_user.id,
        username=current_user.username,
        public_key=current_user.public_key,
        balance=current_user.balance,
        offline_credit_limit=current_user.offline_credit_limit,
        trust_score=current_user.trust_score,
        is_merchant=current_user.is_merchant,
    )


@router.post("/generate-keys", response_model=KeyPairResponse)
async def gen_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate an ECDSA keypair. Public key is stored; private key returned once."""
    private_pem, public_pem = generate_keypair()
    current_user.public_key = public_pem
    db.commit()

    return KeyPairResponse(
        public_key=public_pem,
        private_key=private_pem,
    )


@router.get("/resolve-ppay/{ppay_id}")
async def resolve_ppay_id(ppay_id: str, db: Session = Depends(get_db)):
    """Resolve a PrahariPay handle (username or user@ppay) to a user profile."""
    name = ppay_id.removesuffix("@ppay")
    user = db.query(User).filter(User.username == name).first()
    if user is None:
        raise HTTPException(status_code=404, detail="PrahariPay ID not found")
    return {
        "user_id": user.id,
        "username": user.username,
        "ppay_id": f"{user.username}@ppay",
        "full_name": user.username,
        "is_merchant": user.is_merchant,
        "trust_score": user.trust_score,
    }
