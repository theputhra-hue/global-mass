"""Shared authorization for operator controls, independent of UI visibility."""

from fastapi import Depends, HTTPException

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.models.user import RoleEnum, User


def can_upload(user: User) -> bool:
    emails = {email.strip().casefold() for email in get_settings().DEVELOPER_UPLOAD_EMAILS}
    return bool(user.is_active and user.role == RoleEnum.admin and user.email.casefold() in emails)


def require_developer(user: User = Depends(get_current_user)) -> User:
    if not can_upload(user):
        raise HTTPException(403, "This account does not have developer access.")
    return user


def require_local_pipeline(user: User = Depends(require_developer)) -> User:
    if not get_settings().DEVELOPER_PIPELINE_ENABLED:
        raise HTTPException(403, "Pipeline controls are disabled on this server. Use the local developer console.")
    return user
