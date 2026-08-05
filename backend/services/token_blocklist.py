import logging
import redis
from config import Config

logger = logging.getLogger(__name__)

_client = None


def get_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.Redis.from_url(Config.REDIS_URL, decode_responses=True)
    return _client


def revoke(jti: str, ttl: int):
    try:
        get_client().setex(f"blacklist:{jti}", ttl, "1")
    except redis.RedisError:
        logger.error("Redis unavailable — token %s could not be revoked", jti)


def is_revoked(jti: str) -> bool:
    try:
        return get_client().exists(f"blacklist:{jti}") == 1
    except redis.RedisError:
        logger.warning("Redis unavailable — skipping blocklist check")
        return False
