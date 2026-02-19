"""
PrahariPay Guardian Recovery API
Full guardian-based social recovery flow.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.models.guardian import (
    GuardianInfo,
    GuardianListResponse,
    GuardianRegister,
    RecoveryApproveRequest,
    RecoveryInitiate,
    RecoveryStatus,
)
from app.services.guardian_service import (
    approve_recovery,
    get_guardians,
    get_pending_recoveries_for_guardian,
    get_recovery_status,
    initiate_recovery,
    register_guardians,
)

router = APIRouter()


@router.post("/register-guardians")
async def register_guardians_endpoint(
    body: GuardianRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register guardians for the authenticated user (max 5)."""
    try:
        guardians = register_guardians(db, current_user.id, body.guardian_ids)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "status": "registered",
        "user_id": current_user.id,
        "count": len(guardians),
        "guardians": [
            GuardianInfo(
                guardian_id=g.guardian_id,
                guardian_name=g.guardian_name,
                status=g.status,
            )
            for g in guardians
        ],
    }


@router.get("/guardians", response_model=GuardianListResponse)
async def list_guardians(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the authenticated user's active guardians."""
    guardians = get_guardians(db, current_user.id)
    return GuardianListResponse(
        user_id=current_user.id,
        guardians=[
            GuardianInfo(
                guardian_id=g.guardian_id,
                guardian_name=g.guardian_name,
                status=g.status,
            )
            for g in guardians
        ],
        count=len(guardians),
    )


@router.post("/initiate-recovery", response_model=RecoveryStatus)
async def initiate_recovery_endpoint(
    body: RecoveryInitiate,
    db: Session = Depends(get_db),
):
    """Initiate a wallet recovery for a user. No auth needed (user lost access)."""
    try:
        request = initiate_recovery(db, body.user_id, body.new_public_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return RecoveryStatus(
        recovery_id=request.id,
        user_id=request.user_id,
        status=request.status,
        approvals=request.approvals,
        required_approvals=request.required_approvals,
        created_at=request.created_at,
        expires_at=request.expires_at,
    )


@router.post("/approve-recovery", response_model=RecoveryStatus)
async def approve_recovery_endpoint(
    body: RecoveryApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """A guardian approves a pending recovery request."""
    try:
        request = approve_recovery(db, current_user.id, body.recovery_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return RecoveryStatus(
        recovery_id=request.id,
        user_id=request.user_id,
        status=request.status,
        approvals=request.approvals,
        required_approvals=request.required_approvals,
        created_at=request.created_at,
        expires_at=request.expires_at,
    )


@router.get("/recovery/{recovery_id}", response_model=RecoveryStatus)
async def recovery_status(
    recovery_id: str,
    db: Session = Depends(get_db),
):
    """Check the status of a recovery request."""
    request = get_recovery_status(db, recovery_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Recovery request not found")

    return RecoveryStatus(
        recovery_id=request.id,
        user_id=request.user_id,
        status=request.status,
        approvals=request.approvals,
        required_approvals=request.required_approvals,
        created_at=request.created_at,
        expires_at=request.expires_at,
    )


@router.get("/pending-recoveries")
async def pending_recoveries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List pending recovery requests where the current user is a guardian."""
    requests = get_pending_recoveries_for_guardian(db, current_user.id)
    return {
        "guardian_id": current_user.id,
        "pending": [
            RecoveryStatus(
                recovery_id=r.id,
                user_id=r.user_id,
                status=r.status,
                approvals=r.approvals,
                required_approvals=r.required_approvals,
                created_at=r.created_at,
                expires_at=r.expires_at,
            )
            for r in requests
        ],
    }
