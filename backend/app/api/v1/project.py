"""Public, bounded project demonstration with disclosed engineering evidence."""
from typing import Any

from fastapi import APIRouter

from app.services.research.controls import challenge_report

router = APIRouter()


@router.get("/lab")
async def project_lab() -> dict[str, Any]:
    return challenge_report()
