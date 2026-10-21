"""Two operator-created identities ONLY for the disposable Compose smoke DB."""
import asyncio
import os
import sys
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.engine import make_url

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.postgres import async_session_maker, engine
from app.models.article import Article
from app.models.claim import Claim
from app.models.user import RoleEnum, User


def assert_fixture_target() -> None:
    settings = get_settings()
    target = make_url(settings.POSTGRES_URL)
    if (os.environ.get("GMEE_SMOKE_FIXTURE") != "1" or settings.ENVIRONMENT != "testing"
            or target.host != "postgres" or target.database != "gmee_smoke_fixture"):
        raise RuntimeError("Refusing to create smoke identities outside the explicit disposable fixture.")


async def main() -> None:
    assert_fixture_target()
    async with async_session_maker() as db:
        for table in (User, Article, Claim):
            if await db.scalar(select(func.count()).select_from(table)):
                raise RuntimeError("Smoke bootstrap requires a fresh empty fixture database.")
        for email, password, role in (
            ("fixture-researcher@example.com", "Fixture-only-research-password", RoleEnum.researcher),
            ("fixture-developer@example.com", "Fixture-only-developer-password", RoleEnum.admin),
        ):
            db.add(User(email=email, hashed_password=hash_password(password), role=role,
                        full_name="Disposable smoke identity", is_active=True, access_status="approved"))
        await db.commit()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
