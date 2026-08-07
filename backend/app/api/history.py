import asyncio
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies.supabase import get_supabase_admin_client
from app.dependencies.auth import get_current_user

router = APIRouter(tags=["History & Audit Ledger"])

@router.get("/history", response_model=List[Dict[str, Any]])
async def get_search_history(current_user: dict = Depends(get_current_user)):
    """
    Returns search history logs for the current developer session.
    """
    supabase = get_supabase_admin_client()
    try:
        # Join search history with resolved coordinates and address components
        query = (
            supabase.table("search_history")
            .select("*, resolved_address:resolved_addresses(*, address:addresses(*))")
            .eq("user_id", current_user["id"])
            .order("created_at", desc=True)
        )
        response = await asyncio.to_thread(query.execute)
        
        flat_history = []
        for item in response.data:
            res_addr = item.get("resolved_address") or {}
            addr = res_addr.get("address") or {}
            
            flat_history.append({
                "id": item["id"],
                "raw_address": item["raw_address"],
                "response_time_ms": item["response_time_ms"],
                "created_at": item["created_at"],
                "latitude": res_addr.get("latitude", 0.0),
                "longitude": res_addr.get("longitude", 0.0),
                "confidence": float(res_addr.get("confidence", 0.0)),
                "status": res_addr.get("status", "Failed"),
                "normalized_address": addr.get("normalized_address", "")
            })
            
        return flat_history
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query search history: {str(e)}"
        )

@router.delete("/history", status_code=status.HTTP_200_OK)
async def clear_search_history(current_user: dict = Depends(get_current_user)):
    """
    Clears all search history logs for the current developer account.
    """
    supabase = get_supabase_admin_client()
    try:
        delete_query = supabase.table("search_history").delete().eq("user_id", current_user["id"])
        await asyncio.to_thread(delete_query.execute())
        return {"detail": "Search history ledger cleared successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear history: {str(e)}"
        )

@router.get("/audit", response_model=List[Dict[str, Any]])
async def get_audit_logs(current_user: dict = Depends(get_current_user)):
    """
    Returns address correction audit logs showing reasoning behind location normalizations.
    """
    supabase = get_supabase_admin_client()
    try:
        query = (
            supabase.table("audit_logs")
            .select("original_address, corrected_address, reason, timestamp")
            .eq("user_id", current_user["id"])
            .order("timestamp", desc=True)
        )
        response = await asyncio.to_thread(query.execute)
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch audit log ledger: {str(e)}"
        )
