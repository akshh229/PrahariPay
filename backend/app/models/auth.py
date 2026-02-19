"""
Pydantic schemas for authentication.
"""

from typing import Optional

from pydantic import BaseModel, Field


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    is_merchant: bool = False


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    username: str


class TokenRefresh(BaseModel):
    refresh_token: str


class UserProfile(BaseModel):
    id: str
    username: str
    public_key: Optional[str] = None
    balance: float
    offline_credit_limit: float
    trust_score: float
    is_merchant: bool


class KeyPairResponse(BaseModel):
    public_key: str
    private_key: str
    message: str = "Store your private key securely. It is NOT stored on the server."
