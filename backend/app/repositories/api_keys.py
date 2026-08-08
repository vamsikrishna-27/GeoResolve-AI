import hashlib
from typing import Optional, Dict, Tuple
from datetime import date
from sqlalchemy.orm import Session
from app.database.models import ApiKey

class ApiKeyRepository:
    def _hash_key(self, api_key: str) -> str:
        """Hashes the raw API key to compare against database hashes."""
        return hashlib.sha256(api_key.encode()).hexdigest()

    def get_by_raw_key(self, api_key: str, db: Session) -> Optional[ApiKey]:
        """Loads key records matching the token hash."""
        token_hash = self._hash_key(api_key)
        try:
            return db.query(ApiKey).filter(ApiKey.token_hash == token_hash).first()
        except Exception as e:
            print(f"Error querying API key: {str(e)}")
        return None

    async def validate_key(self, api_key: str, db: Session) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Validates the key and checks for expiration, active status, and usage thresholds.
        Returns: (is_valid, key_record, error_message)
        """
        db_record = self.get_by_raw_key(api_key, db)
        
        if not db_record:
            return False, None, "Invalid API key token"
            
        record_dict = {
            "id": str(db_record.id),
            "user_id": str(db_record.user_id),
            "name": db_record.name,
            "status": db_record.status,
            "usage": db_record.usage_count,
            "max_limit": db_record.max_limit,
            "expiry": db_record.expiry
        }
            
        if db_record.status != "Active":
            return False, record_dict, "API Key has been revoked"
            
        # Check Expiry
        if db_record.expiry:
            if db_record.expiry < date.today():
                return False, record_dict, "API Key has expired"
                
        # Check Usage Limits
        if db_record.usage_count >= db_record.max_limit:
            return False, record_dict, "API Key query limit threshold exceeded"
            
        return True, record_dict, None

    async def increment_usage(self, key_id: str, db: Session) -> bool:
        """Increments the request counter for the API key."""
        try:
            db_record = db.query(ApiKey).filter(ApiKey.id == key_id).first()
            if db_record:
                db_record.usage_count += 1
                db.commit()
                return True
        except Exception as e:
            db.rollback()
            print(f"Error incrementing API key usage: {str(e)}")
        return False
