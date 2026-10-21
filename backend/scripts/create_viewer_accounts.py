"""Provision viewing-only website logins using operator database access.

Run after the viewer-role migration, with the target database environment loaded:
  python scripts/create_viewer_accounts.py --email visitor@example.org \
      --credentials-file /private/viewers.json

Credentials are generated once into an exclusively created private file. Retrying
with that file verifies ownership and never resets or downgrades an existing user.
This creates website accounts, not email inboxes. Do not commit the output file.
"""
import argparse
import asyncio
import json
import os
import secrets
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.security import hash_password, verify_password
from app.db.postgres import async_session_maker
from app.models.user import RoleEnum, User
from app.schemas.auth import UserCreate


async def provision(db: AsyncSession, accounts: list[dict[str, str]]) -> None:
    # Validate the complete batch before adding anyone. Existing identities must
    # match the original credential file and already be active viewers.
    pending = []
    for account in accounts:
        data = UserCreate(email=account["email"], password=account["password"], full_name="Visitor")
        existing = await db.scalar(select(User).where(User.email == data.email))
        if existing is not None:
            if (existing.role != RoleEnum.viewer or not existing.is_active
                    or not verify_password(existing.hashed_password, data.password)):
                raise ValueError("Existing account does not match the provisioned viewer identity.")
        else:
            pending.append(User(email=str(data.email), role=RoleEnum.viewer, is_active=True,
                full_name="Guest reviewer" if data.email.startswith("reviewer@") else "Visitor",
                hashed_password=await asyncio.to_thread(hash_password, data.password)))
    db.add_all(pending)
    await db.commit()


async def run(emails: list[str], credentials_file: Path) -> None:
    emails = list(dict.fromkeys(str(UserCreate(email=email, password="validation-only-password", full_name="Visitor").email) for email in emails))
    if credentials_file.exists():
        accounts = json.loads(credentials_file.read_text(encoding="utf-8"))["accounts"]
        if sorted(account["email"] for account in accounts) != sorted(emails):
            raise ValueError("Credential file does not match the requested email addresses.")
    else:
        accounts = [{"email": email, "password": secrets.token_urlsafe(24)} for email in emails]
        # Create exclusively, never overwrite credentials. OS ACLs of the private
        # parent directory must restrict access to the operator (including Windows).
        descriptor = os.open(credentials_file, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump({"accounts": accounts}, stream, indent=2)
    async with async_session_maker() as db:
        await provision(db, accounts)
    print("Viewer accounts verified: " + ", ".join(emails))
    print("Passwords are in the private credentials file; they are never printed.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True, action="append")
    parser.add_argument("--credentials-file", required=True, type=Path)
    args = parser.parse_args()
    try:
        if sys.platform == "win32":
            # psycopg's async driver requires a selector loop on Windows.
            with asyncio.Runner(loop_factory=asyncio.SelectorEventLoop) as runner:
                runner.run(run(args.email, args.credentials_file))
        else:
            asyncio.run(run(args.email, args.credentials_file))
    except Exception as exc:
        # Driver exceptions may include connection details and password hashes.
        raise SystemExit(f"Provisioning stopped ({type(exc).__name__}); no credentials were printed.") from None


if __name__ == "__main__":
    main()
