import json
import time
import asyncio
from typing import Optional, Any, Dict
from app.core.config import settings
from app.dependencies.supabase import get_supabase_admin_client

class CacheService:
    def __init__(self):
        self.memory_cache: Dict[str, tuple[Any, float]] = {} # key -> (value, expires_at)
        self.redis_client = None
        self.has_redis = False

        # Attempt lazy Redis connection if REDIS_URL is configured
        if settings.REDIS_URL:
            try:
                import redis
                self.redis_client = redis.from_url(settings.REDIS_URL, socket_timeout=2.0)
                self.has_redis = True
            except (ImportError, Exception):
                self.redis_client = None
                self.has_redis = False
                print("Redis connection skipped. Caching will use in-memory and PostgreSQL fallback.")

    async def get(self, key: str) -> Optional[Any]:
        """
        Retrieves cached values matching the target query key.
        """
        now = time.time()
        
        # 1. Local Memory check
        if key in self.memory_cache:
            val, expires_at = self.memory_cache[key]
            if expires_at > now:
                return val
            else:
                del self.memory_cache[key] # Expired

        # 2. Redis check
        if self.has_redis and self.redis_client:
            try:
                # Run sync Redis get inside thread pool
                val = await asyncio.to_thread(self.redis_client.get, key)
                if val:
                    return json.loads(val.decode())
            except Exception:
                pass

        # 3. Supabase Cache fallback
        supabase = get_supabase_admin_client()
        try:
            query = supabase.table("cache").select("value, expires_at").eq("key", key)
            response = await asyncio.to_thread(query.execute)
            if response.data:
                record = response.data[0]
                # Check DB string expiry
                from datetime import datetime
                expires_str = record.get("expires_at")
                if expires_str:
                    expires_dt = datetime.fromisoformat(expires_str.replace("Z", "+00:00"))
                    if expires_dt.timestamp() > now:
                        # Write back to memory cache
                        self.memory_cache[key] = (record["value"], expires_dt.timestamp())
                        return record["value"]
                    else:
                        # Delete expired DB entry in the background
                        delete_query = supabase.table("cache").delete().eq("key", key)
                        await asyncio.to_thread(delete_query.execute)
        except Exception:
            pass

        return None

    async def set(self, key: str, value: Any, ttl_seconds: int = 3600):
        """
        Stores key-value pairs in active caches with a TTL.
        """
        now = time.time()
        expires_at = now + ttl_seconds

        # 1. Store in memory
        self.memory_cache[key] = (value, expires_at)

        # 2. Store in Redis
        if self.has_redis and self.redis_client:
            try:
                serialized = json.dumps(value)
                await asyncio.to_thread(self.redis_client.setex, key, ttl_seconds, serialized)
            except Exception:
                pass

        # 3. Store in Supabase Cache table
        supabase = get_supabase_admin_client()
        try:
            from datetime import datetime, timezone, timedelta
            expires_dt = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
            record = {
                "key": key,
                "value": value,
                "expires_at": expires_dt.isoformat()
            }
            # Perform upsert on Postgres cache table
            upsert_query = supabase.table("cache").upsert(record)
            await asyncio.to_thread(upsert_query.execute)
        except Exception:
            pass
