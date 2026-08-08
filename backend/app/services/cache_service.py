import json
import time
import asyncio
from typing import Optional, Any, Dict
from datetime import datetime, timezone, timedelta
from app.core.config import settings
from app.database.session import SessionLocal
from app.database.models import CacheEntry

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
                print("Redis connection skipped. Caching will use in-memory and MySQL fallback.")

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
                val = await asyncio.to_thread(self.redis_client.get, key)
                if val:
                    return json.loads(val.decode())
            except Exception:
                pass

        # 3. MySQL Cache fallback
        db = SessionLocal()
        try:
            db_record = db.query(CacheEntry).filter(CacheEntry.key == key).first()
            if db_record:
                expires_dt = db_record.expires_at
                # Check if it has tzinfo, if not assume UTC
                if expires_dt.tzinfo is None:
                    expires_dt = expires_dt.replace(tzinfo=timezone.utc)
                
                now_dt = datetime.now(timezone.utc)
                if expires_dt > now_dt:
                    parsed_val = json.loads(db_record.value)
                    # Write back to memory cache
                    self.memory_cache[key] = (parsed_val, expires_dt.timestamp())
                    return parsed_val
                else:
                    # Delete expired DB entry
                    db.delete(db_record)
                    db.commit()
        except Exception as e:
            print(f"Error reading from MySQL cache: {e}")
        finally:
            db.close()

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

        # 3. Store in MySQL Cache table
        db = SessionLocal()
        try:
            expires_dt = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
            serialized_val = json.dumps(value)
            
            # Use upsert-like logic
            db_record = db.query(CacheEntry).filter(CacheEntry.key == key).first()
            if db_record:
                db_record.value = serialized_val
                db_record.expires_at = expires_dt
            else:
                db_record = CacheEntry(
                    key=key,
                    value=serialized_val,
                    expires_at=expires_dt
                )
                db.add(db_record)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Error writing to MySQL cache: {e}")
        finally:
            db.close()
