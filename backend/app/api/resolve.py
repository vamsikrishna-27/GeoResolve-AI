import json
import uuid
import traceback
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.database.models import AddressRequest, AddressResult, SearchHistory, AuditLog, ApiKey
from app.dependencies.auth import get_current_user_or_api_key
from app.schemas.resolve import (
    AddressResolveRequest, 
    AddressResolveResponse,
    AddressGeocodeResolveResponse,
    GeocodeLandmark
)
from app.services.decision_service import DecisionService

router = APIRouter(tags=["Address Resolution"])
decision_service = DecisionService()

class PincodeValidateRequest(BaseModel):
    pincode: str
    city: Optional[str] = None
    state: Optional[str] = None

def log_resolution_to_db_bg(
    raw_address: str,
    normalized_address: str,
    latitude: float,
    longitude: float,
    confidence: float,
    reasoning: List[str],
    matched_landmark: Optional[str],
    matched_pincode: Optional[str],
    nearby_pois: List[str],
    response_time_ms: int,
    status_str: str,
    user_id: str,
    auth_type: str,
    api_key_id: Optional[str],
    parsed_landmark: Optional[str],
    parsed_street: Optional[str],
    parsed_locality: Optional[str],
    parsed_area: Optional[str],
    parsed_city: Optional[str],
    parsed_district: Optional[str],
    parsed_state: Optional[str],
    parsed_pincode: Optional[str]
):
    db = SessionLocal()
    try:
        user_uuid = uuid.UUID(user_id)
        
        # a. Insert parsed address profile
        addr_req = AddressRequest(
            raw_address=raw_address,
            normalized_address=normalized_address,
            landmark=parsed_landmark,
            street=parsed_street,
            locality=parsed_locality,
            area=parsed_area,
            city=parsed_city,
            district=parsed_district,
            state=parsed_state,
            pincode=parsed_pincode,
            language="en"
        )
        db.add(addr_req)
        db.flush() # Populate addr_req.id for Foreign Key reference

        # b. Insert resolved coordinates schema
        addr_res = AddressResult(
            address_id=addr_req.id,
            latitude=latitude,
            longitude=longitude,
            confidence=confidence,
            reasoning="; ".join(reasoning),
            matched_landmark=matched_landmark,
            matched_pincode=matched_pincode,
            nearby_pois=json.dumps(nearby_pois),
            response_time_ms=response_time_ms,
            status=status_str
        )
        db.add(addr_res)
        db.flush() # Populate addr_res.id for SearchHistory reference

        # c. Log search to user history
        history_record = SearchHistory(
            user_id=user_uuid,
            raw_address=raw_address,
            resolved_address_id=addr_res.id,
            response_time_ms=response_time_ms
        )
        db.add(history_record)

        # d. Log corrections in audit ledger if address was normalized or corrected
        if normalized_address and normalized_address.lower() != raw_address.lower():
            audit_record = AuditLog(
                user_id=user_uuid,
                original_address=raw_address,
                corrected_address=normalized_address,
                reason=reasoning[0] if reasoning else "Normalized casing and structures."
            )
            db.add(audit_record)

        # e. Increment quota usage if API key is active
        if auth_type == "api_key" and api_key_id:
            try:
                key_uuid = uuid.UUID(api_key_id)
                db_key = db.query(ApiKey).filter(ApiKey.id == key_uuid).first()
                if db_key:
                    db_key.usage_count += 1
            except Exception as e:
                print(f"Error incrementing API key usage: {str(e)}")

        db.commit()
    except Exception as db_err:
        db.rollback()
        print(f"MySQL background logging failed: {traceback.format_exc()}")
    finally:
        db.close()

@router.post("/resolve", response_model=AddressResolveResponse)
async def resolve_address(
    request_data: AddressResolveRequest,
    background_tasks: BackgroundTasks,
    current_auth: dict = Depends(get_current_user_or_api_key)
):
    """
    Transforms messy Indian addresses into geographic coordinates. (Legacy backward compatible endpoint)
    """
    raw_address = request_data.address.strip()
    if not raw_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Address text cannot be blank."
        )

    # 1. Execute geocoding pipeline
    try:
        result = await decision_service.process_resolution(raw_address)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resolution service failure: {str(e)}"
        )

    # 2. Extract parser details asynchronously
    parsed_data = await decision_service.parser.parse_address(raw_address)

    # 3. Schedule database background logging
    background_tasks.add_task(
        log_resolution_to_db_bg,
        raw_address=raw_address,
        normalized_address=result.normalized_address,
        latitude=result.latitude,
        longitude=result.longitude,
        confidence=result.confidence,
        reasoning=result.reasoning,
        matched_landmark=result.matched_landmark,
        matched_pincode=result.matched_pincode,
        nearby_pois=result.nearby_pois,
        response_time_ms=result.response_time_ms,
        status_str=result.status,
        user_id=current_auth["id"],
        auth_type=current_auth.get("auth_type", "jwt"),
        api_key_id=current_auth.get("api_key_id"),
        parsed_landmark=parsed_data.landmark,
        parsed_street=parsed_data.road,
        parsed_locality=parsed_data.area,
        parsed_area=parsed_data.area,
        parsed_city=parsed_data.city,
        parsed_district=parsed_data.district,
        parsed_state=parsed_data.state,
        parsed_pincode=parsed_data.pincode
    )

    return AddressResolveResponse(
        original_address=result.original_address,
        normalized_address=result.normalized_address,
        latitude=result.latitude,
        longitude=result.longitude,
        confidence=result.confidence,
        status=result.status,
        reasoning=result.reasoning,
        matched_landmark=result.matched_landmark,
        matched_pincode=result.matched_pincode,
        nearby_pois=result.nearby_pois,
        alternative_candidates=result.alternative_candidates,
        response_time_ms=result.response_time_ms,
        original_query=result.original_address,
        normalized_query=result.spelling_corrected_address
    )

@router.post("/api/v1/geocode/resolve", response_model=AddressGeocodeResolveResponse)
async def resolve_geocode_v1(
    request_data: AddressResolveRequest,
    background_tasks: BackgroundTasks,
    current_auth: dict = Depends(get_current_user_or_api_key)
):
    """
    Transforms messy Indian addresses into geographic coordinates using AI validation,
    cross-checking postal pins, and measuring landmark proximities. (Production-ready endpoint)
    """
    raw_address = request_data.address.strip()
    if not raw_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Address text cannot be blank."
        )

    # 1. Execute geocoding pipeline
    try:
        result = await decision_service.process_resolution(raw_address)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resolution service failure: {str(e)}"
        )

    # 2. Extract parser details asynchronously
    parsed_data = await decision_service.parser.parse_address(raw_address)

    # 3. Schedule database background logging
    background_tasks.add_task(
        log_resolution_to_db_bg,
        raw_address=raw_address,
        normalized_address=result.normalized_address,
        latitude=result.latitude,
        longitude=result.longitude,
        confidence=result.confidence,
        reasoning=result.reasoning,
        matched_landmark=result.matched_landmark,
        matched_pincode=result.matched_pincode,
        nearby_pois=result.nearby_pois,
        response_time_ms=result.response_time_ms,
        status_str=result.status,
        user_id=current_auth["id"],
        auth_type=current_auth.get("auth_type", "jwt"),
        api_key_id=current_auth.get("api_key_id"),
        parsed_landmark=parsed_data.landmark,
        parsed_street=parsed_data.road,
        parsed_locality=parsed_data.area,
        parsed_area=parsed_data.area,
        parsed_city=parsed_data.city,
        parsed_district=parsed_data.district,
        parsed_state=parsed_data.state,
        parsed_pincode=parsed_data.pincode
    )

    # 4. Map landmarks to response format
    matched_landmarks = []
    for lm in result.matched_landmarks_with_distance:
        matched_landmarks.append(GeocodeLandmark(
            name=lm["name"],
            distance=lm["distance"]
        ))

    return AddressGeocodeResolveResponse(
        original_address=raw_address,
        normalized_address=result.normalized_address,
        latitude=result.latitude,
        longitude=result.longitude,
        confidence=int(result.confidence),
        validated_pincode=result.validated_pincode,
        matched_landmarks=matched_landmarks,
        evidence=result.evidence,
        processing_time_ms=result.response_time_ms,
        original_query=raw_address,
        normalized_query=result.spelling_corrected_address
    )

@router.post("/validate-pincode")
async def validate_pincode_route(
    request_data: PincodeValidateRequest,
    current_auth: dict = Depends(get_current_user_or_api_key)
):
    """
    Validates and corrects Indian pincodes against regional mapping databases.
    """
    from app.services.pincode_validator import PincodeValidatorService
    validator = PincodeValidatorService()
    res = await validator.validate_pincode(
        request_data.pincode,
        request_data.city,
        request_data.state
    )
    return res
