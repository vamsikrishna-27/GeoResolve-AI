import asyncio
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies.supabase import get_supabase_admin_client
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics & Telemetry"])

@router.get("", response_model=Dict[str, Any])
async def get_analytics(current_user: dict = Depends(get_current_user)):
    """
    Computes real-time telemetry metrics for the developer's geocoding queries,
    including average confidence scores, cache hits, latency, and success rates.
    """
    supabase = get_supabase_admin_client()
    try:
        # Load user history logs
        query = (
            supabase.table("search_history")
            .select("*, resolved_addresses(confidence, status, response_time_ms)")
            .eq("user_id", current_user["id"])
        )
        response = await asyncio.to_thread(query.execute)
        
        records = response.data
        total_requests = len(records)
        
        if total_requests == 0:
            # Return baseline values for new users
            return {
                "total_requests": 0,
                "avg_confidence": 0.0,
                "avg_latency": 0,
                "success_rate": 0.0,
                "cache_hit_rate": 0.0
            }

        confidences = []
        latencies = []
        successes = 0
        cache_hits = 0

        for r in records:
            res = r.get("resolved_addresses") or {}
            
            # Extract confidence (handle standard schema dict format)
            conf = res.get("confidence")
            if conf is not None:
                confidences.append(float(conf))
                
            # Extract latency
            lat = res.get("response_time_ms")
            if lat is not None:
                latencies.append(int(lat))
                
            # Extract success/caching status
            status_val = res.get("status")
            if status_val in ["Success", "Cached"]:
                successes += 1
            if status_val == "Cached":
                cache_hits += 1

        avg_confidence = float(round(sum(confidences) / len(confidences), 2)) if confidences else 0.0
        avg_latency = int(sum(latencies) / len(latencies)) if latencies else 0
        success_rate = float(round((successes / total_requests) * 100, 2))
        cache_hit_rate = float(round((cache_hits / total_requests) * 100, 2))

        return {
            "total_requests": total_requests,
            "avg_confidence": avg_confidence,
            "avg_latency": avg_latency,
            "success_rate": success_rate,
            "cache_hit_rate": cache_hit_rate
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to aggregate analytics: {str(e)}"
        )
