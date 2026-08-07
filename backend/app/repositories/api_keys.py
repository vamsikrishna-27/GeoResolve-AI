import hashlib
import asyncio
from typing import Optional, Dict, Tuple
from datetime import datetime, date
from app.dependencies.supabase import get_supabase_admin_client

class ApiKeyRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client()

    def _hash_key(self, api_key: str) -> str:
        """Hashes the raw API key to compare against database hashes."""
        return hashlib.sha256(api_key.encode()).hexdigest()

    async def get_by_raw_key(self, api_key: str) -> Optional[dict]:
        """Loads key records matching the token hash."""
        token_hash = self._hash_key(api_key)
        try:
            query = self.supabase.table("api_keys").select("*").eq("token_hash", token_hash)
            response = await asyncio.to_thread(query.execute)
            if response.data and len(response.data) > 0:
                return response.data[0]
        except Exception as e:
            print(f"Error querying API key: {str(e)}")
        return None

    async def validate_key(self, api_key: str) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Validates the key and checks for expiration, active status, and usage thresholds.
        Returns: (is_valid, key_record, error_message)
        """
        record = await self.get_by_raw_key(api_key)
        
        if not record:
            return False, None, "Invalid API key token"
            
        if record.get("status") != "Active":
            return False, record, "API Key has been revoked"
            
        # Check Expiry
        expiry_str = record.get("expiry")
        if expiry_str:
            try:
                expiry_date = datetime.strptime(expiry_str, "%Y-%m-%d").date()
                if expiry_date < date.today():
                    return False, record, "API Key has expired"
            except ValueError:
                pass
                
        # Check Usage Limits
        usage = record.get("usage", 0)
        limit = record.get("max_limit", 25000)
        if usage >= limit:
            return False, record, "API Key query limit threshold exceeded"
            
        return True, record, None

    async def increment_usage(self, key_id: str) -> bool:
        """Increments the request counter for the API key."""
        try:
            # Query current usage first
            query = self.supabase.table("api_keys").select("usage").eq("id", key_id)
            response = await asyncio.to_thread(query.execute)
            if response.data:
                current_usage = response.data[0].get("usage", 0)
                update_query = self.supabase.table("api_keys").update({"usage": current_usage + 1}).eq("id", key_id)
                await asyncio.to_thread(update_query.execute)
                return True
        except Exception as e:
            print(f"Error incrementing API key usage: {str(e)}")
        return False
