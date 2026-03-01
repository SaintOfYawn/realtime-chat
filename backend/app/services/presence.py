import redis.asyncio as redis
from app.core.config import settings

PRESENCE_KEY = "presence:online_users"  # set
USER_TTL_KEY_PREFIX = "presence:ttl:"   # string with ttl refresh (optional)

class PresenceService:
    def __init__(self):
        self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def set_online(self, user_id: int):
        await self.redis.sadd(PRESENCE_KEY, user_id)
        # optional TTL heartbeat
        await self.redis.set(f"{USER_TTL_KEY_PREFIX}{user_id}", "1", ex=60)

    async def heartbeat(self, user_id: int):
        await self.redis.set(f"{USER_TTL_KEY_PREFIX}{user_id}", "1", ex=60)

    async def set_offline(self, user_id: int):
        await self.redis.srem(PRESENCE_KEY, user_id)
        await self.redis.delete(f"{USER_TTL_KEY_PREFIX}{user_id}")

    async def is_online(self, user_id: int) -> bool:
        return await self.redis.sismember(PRESENCE_KEY, user_id)

    async def online_ids(self) -> list[int]:
        ids = await self.redis.smembers(PRESENCE_KEY)
        return [int(x) for x in ids]
