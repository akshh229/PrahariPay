"""
Pydantic schemas for guardian social recovery.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class GuardianRegister(BaseModel):
    guardian_ids: List[str] = Field(
        ..., min_length=1, max_length=5, description="List of guardian user IDs"
    )


class GuardianInfo(BaseModel):
    guardian_id: str
    guardian_name: Optional[str] = None
    status: str


class GuardianListResponse(BaseModel):
    user_id: str
    guardians: List[GuardianInfo]
    count: int


class RecoveryInitiate(BaseModel):
    user_id: str
    new_public_key: Optional[str] = None


class RecoveryApproveRequest(BaseModel):
    recovery_id: str


class RecoveryStatus(BaseModel):
    recovery_id: str
    user_id: str
    status: str
    approvals: int
    required_approvals: int
    created_at: datetime
    expires_at: Optional[datetime] = None
