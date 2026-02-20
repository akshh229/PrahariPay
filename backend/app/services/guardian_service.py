"""
PrahariPay Guardian Service
Implements the social-recovery (Web of Trust) model.

- Users designate up to 5 guardians
- Recovery requires a 3-of-N quorum
- Approved recovery replaces the user's public key
"""

from datetime import timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.time import utcnow
from app.db.models import Guardian, RecoveryApproval, RecoveryRequest, User


# ─── Guardian Management ────────────────────────────────────────────


def _resolve_user(db: Session, identifier: str) -> User | None:
    """Resolve a user by UUID, username, or PrahariPay handle (user@ppay)."""
    # Try by UUID first
    user = db.query(User).filter(User.id == identifier).first()
    if user:
        return user
    # Strip @ppay suffix if present
    name = identifier.removesuffix("@ppay")
    return db.query(User).filter(User.username == name).first()


def register_guardians(
    db: Session, user_id: str, guardian_ids: list[str]
) -> list[Guardian]:
    """Register guardians for a user. Replaces existing set."""
    if len(guardian_ids) > settings.GUARDIAN_MAX:
        raise ValueError(
            f"Maximum {settings.GUARDIAN_MAX} guardians allowed"
        )

    # Resolve all guardian identifiers to real users
    resolved: list[tuple[str, User]] = []
    for gid in guardian_ids:
        guardian_user = _resolve_user(db, gid)
        if guardian_user is None:
            raise ValueError(f"Guardian user '{gid}' not found")
        if guardian_user.id == user_id:
            raise ValueError("Cannot designate yourself as guardian")
        resolved.append((guardian_user.id, guardian_user))

    # Revoke existing guardians
    db.query(Guardian).filter(
        Guardian.user_id == user_id, Guardian.status == "active"
    ).update({"status": "revoked"})

    # Create new guardian records
    created = []
    for guardian_id, guardian_user in resolved:
        g = Guardian(
            user_id=user_id,
            guardian_id=guardian_id,
            guardian_name=guardian_user.username if guardian_user else None,
            status="active",
        )
        db.add(g)
        created.append(g)

    db.commit()
    for g in created:
        db.refresh(g)
    return created


def get_guardians(db: Session, user_id: str) -> list[Guardian]:
    return (
        db.query(Guardian)
        .filter(Guardian.user_id == user_id, Guardian.status == "active")
        .all()
    )


# ─── Recovery Flow ──────────────────────────────────────────────────


def initiate_recovery(
    db: Session, user_id: str, new_public_key: str | None = None
) -> RecoveryRequest:
    """Create a recovery request. Guardians must approve it."""
    # Check user exists
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise ValueError("User not found")

    # Check user has guardians
    guardians = get_guardians(db, user_id)
    if len(guardians) == 0:
        raise ValueError("No guardians registered — cannot initiate recovery")

    # Expire any existing pending requests
    db.query(RecoveryRequest).filter(
        RecoveryRequest.user_id == user_id,
        RecoveryRequest.status == "pending",
    ).update({"status": "expired"})

    quorum = min(settings.GUARDIAN_QUORUM, len(guardians))
    request = RecoveryRequest(
        user_id=user_id,
        required_approvals=quorum,
        new_public_key=new_public_key,
        expires_at=utcnow()
        + timedelta(hours=settings.RECOVERY_EXPIRY_HOURS),
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def approve_recovery(
    db: Session, guardian_id: str, recovery_id: str
) -> RecoveryRequest:
    """A guardian approves a recovery request."""
    request = (
        db.query(RecoveryRequest)
        .filter(RecoveryRequest.id == recovery_id)
        .first()
    )
    if request is None:
        raise ValueError("Recovery request not found")
    if request.status != "pending":
        raise ValueError(f"Recovery request is already '{request.status}'")
    if request.expires_at and request.expires_at < utcnow():
        request.status = "expired"
        db.commit()
        raise ValueError("Recovery request has expired")

    # Verify guardian is authorized
    guardian = (
        db.query(Guardian)
        .filter(
            Guardian.user_id == request.user_id,
            Guardian.guardian_id == guardian_id,
            Guardian.status == "active",
        )
        .first()
    )
    if guardian is None:
        raise ValueError("You are not an active guardian for this user")

    # Prevent duplicate approvals
    existing_approval = (
        db.query(RecoveryApproval)
        .filter(
            RecoveryApproval.recovery_id == recovery_id,
            RecoveryApproval.guardian_id == guardian_id,
        )
        .first()
    )
    if existing_approval:
        raise ValueError("You have already approved this recovery request")

    # Record approval
    approval = RecoveryApproval(
        recovery_id=recovery_id, guardian_id=guardian_id
    )
    db.add(approval)
    request.approvals += 1

    # Check quorum
    if request.approvals >= request.required_approvals:
        request.status = "approved"
        # Apply the new public key if provided
        if request.new_public_key:
            user = db.query(User).filter(User.id == request.user_id).first()
            if user:
                user.public_key = request.new_public_key

    db.commit()
    db.refresh(request)
    return request


def get_recovery_status(db: Session, recovery_id: str):
    return (
        db.query(RecoveryRequest)
        .filter(RecoveryRequest.id == recovery_id)
        .first()
    )


def get_pending_recoveries_for_guardian(db: Session, guardian_id: str):
    """List all pending recovery requests where this user is a guardian."""
    guardian_entries = (
        db.query(Guardian)
        .filter(Guardian.guardian_id == guardian_id, Guardian.status == "active")
        .all()
    )
    user_ids = [g.user_id for g in guardian_entries]
    if not user_ids:
        return []
    return (
        db.query(RecoveryRequest)
        .filter(
            RecoveryRequest.user_id.in_(user_ids),
            RecoveryRequest.status == "pending",
        )
        .all()
    )
