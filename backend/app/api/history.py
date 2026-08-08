import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import SearchHistory, AuditLog
from app.dependencies.auth import get_current_user

router = APIRouter(tags=["History & Audit Ledger"])

@router.get("/history", response_model=List[Dict[str, Any]])
async def get_search_history(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns search history logs for the current developer session.
    """
    try:
        user_uuid = uuid.UUID(current_user["id"])
        
        # Load history sorted by creation time
        db_history = (
            db.query(SearchHistory)
            .filter(SearchHistory.user_id == user_uuid)
            .order_by(SearchHistory.created_at.desc())
            .all()
        )
        
        flat_history = []
        for item in db_history:
            res_addr = item.resolved_address
            addr = res_addr.address if res_addr else None
            
            flat_history.append({
                "id": str(item.id),
                "raw_address": item.raw_address,
                "response_time_ms": item.response_time_ms,
                "created_at": item.created_at.isoformat(),
                "latitude": float(res_addr.latitude) if res_addr else 0.0,
                "longitude": float(res_addr.longitude) if res_addr else 0.0,
                "confidence": float(res_addr.confidence) if res_addr else 0.0,
                "status": res_addr.status if res_addr else "Failed",
                "normalized_address": addr.normalized_address if addr else ""
            })
            
        return flat_history
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query search history: {str(e)}"
        )

@router.delete("/history", status_code=status.HTTP_200_OK)
async def clear_search_history(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Clears all search history logs for the current developer account.
    """
    try:
        user_uuid = uuid.UUID(current_user["id"])
        db.query(SearchHistory).filter(SearchHistory.user_id == user_uuid).delete()
        db.commit()
        return {"detail": "Search history ledger cleared successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear history: {str(e)}"
        )

@router.get("/audit", response_model=List[Dict[str, Any]])
async def get_audit_logs(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns address correction audit logs showing reasoning behind location normalizations.
    """
    try:
        user_uuid = uuid.UUID(current_user["id"])
        db_logs = (
            db.query(AuditLog)
            .filter(AuditLog.user_id == user_uuid)
            .order_by(AuditLog.timestamp.desc())
            .all()
        )
        return [{
            "original_address": x.original_address,
            "corrected_address": x.corrected_address,
            "reason": x.reason,
            "timestamp": x.timestamp.isoformat()
        } for x in db_logs]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch audit log ledger: {str(e)}"
        )
