import math
from datetime import UTC, datetime

from redis.asyncio import Redis


async def blocklist_access_token(redis: Redis, jti: str, expires_at: datetime) -> None:
    now = datetime.now(UTC)
    # Never release a revoked token during its final fractional second.
    ttl = math.ceil((expires_at - now).total_seconds())
    if ttl > 0:
        await redis.set(f"gmee:auth:blocklist:{jti}", "revoked", ex=ttl)

async def is_access_token_blocklisted(redis: Redis, jti: str) -> bool:
    exists = await redis.exists(f"gmee:auth:blocklist:{jti}")
    return exists > 0

async def check_login_rate_limit(redis: Redis, email: str, ip: str) -> int:
    """
    Returns TTL in seconds if rate limited, else 0.
    Limits to 5 attempts per 15 minutes per (email, IP) pair.
    """
    key = f"gmee:auth:ratelimit:login:{email}:{ip}"
    # Increment and install the window atomically. A GET-then-INCR check lets
    # simultaneous requests all pass the same remaining attempt.
    async with redis.pipeline(transaction=True) as pipe:
        pipe.incr(key)
        pipe.expire(key, 900, nx=True)
        pipe.ttl(key)
        current, _, ttl = await pipe.execute()
    return max(1, int(ttl)) if int(current) > 5 else 0
