from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class AddressResolveRequest(BaseModel):
    address: str

class AddressResolveResponse(BaseModel):
    original_address: str
    normalized_address: str
    latitude: float
    longitude: float
    confidence: float
    status: str
    reasoning: List[str]
    matched_landmark: Optional[str] = None
    matched_pincode: Optional[str] = None
    nearby_pois: List[str] = []
    alternative_candidates: List[Dict[str, Any]] = []
    response_time_ms: int

class GeocodeLandmark(BaseModel):
    name: str
    distance: float

class AddressGeocodeResolveResponse(BaseModel):
    original_address: str
    normalized_address: str
    latitude: float
    longitude: float
    confidence: int
    validated_pincode: bool
    matched_landmarks: List[GeocodeLandmark]
    evidence: List[str]
    processing_time_ms: int
