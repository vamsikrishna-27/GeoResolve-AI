import uuid
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import SearchHistory
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics & Telemetry"])

@router.get("", response_model=Dict[str, Any])
async def get_analytics(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Computes real-time telemetry metrics for the developer's geocoding queries,
    including spelling typo corrections, successes, failures, and correction accuracy.
    """
    try:
        user_uuid = uuid.UUID(current_user["id"])
        
        records = (
            db.query(SearchHistory)
            .filter(SearchHistory.user_id == user_uuid)
            .all()
        )
        
        total_requests = len(records)
        
        if total_requests == 0:
            return {
                "total_requests": 0,
                "avg_confidence": 0.0,
                "avg_latency": 0,
                "success_rate": 0.0,
                "cache_hit_rate": 0.0,
                "typo_corrections": 0,
                "successful_corrections": 0,
                "failed_corrections": 0,
                "correction_accuracy": 0.0
            }

        confidences = []
        latencies = []
        successes = 0
        cache_hits = 0
        
        typo_corrections = 0
        successful_corrections = 0
        failed_corrections = 0
        correction_confidences = []

        for r in records:
            res = r.resolved_address
            if res:
                confidences.append(float(res.confidence))
                latencies.append(int(res.response_time_ms))
                
                is_success = res.status in ["Success", "Cached"]
                if is_success:
                    successes += 1
                if res.status == "Cached":
                    cache_hits += 1
                
                # Check for spelling/typo correction
                addr = res.address
                if addr and addr.normalized_address:
                    orig = addr.raw_address.strip().lower()
                    norm = addr.normalized_address.strip().lower()
                    if orig != norm:
                        typo_corrections += 1
                        correction_confidences.append(float(res.confidence))
                        if is_success:
                            successful_corrections += 1
                        else:
                            failed_corrections += 1

        avg_confidence = float(round(sum(confidences) / len(confidences), 2)) if confidences else 0.0
        avg_latency = int(sum(latencies) / len(latencies)) if latencies else 0
        success_rate = float(round((successes / total_requests) * 100, 2))
        cache_hit_rate = float(round((cache_hits / total_requests) * 100, 2))
        
        # Calculate correction accuracy as percentage of confidence score for corrected elements
        correction_accuracy = float(round((sum(correction_confidences) / len(correction_confidences)) * 100, 2)) if correction_confidences else 0.0

        return {
            "total_requests": total_requests,
            "avg_confidence": avg_confidence,
            "avg_latency": avg_latency,
            "success_rate": success_rate,
            "cache_hit_rate": cache_hit_rate,
            "typo_corrections": typo_corrections,
            "successful_corrections": successful_corrections,
            "failed_corrections": failed_corrections,
            "correction_accuracy": correction_accuracy
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to aggregate analytics: {str(e)}"
        )
