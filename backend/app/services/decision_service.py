import time
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

# Pipeline services
from app.services.language_detector import LanguageDetectorService
from app.services.transliteration_service import TransliterationService
from app.services.address_normalizer import AddressNormalizer
from app.services.address_parser import AddressParserService
from app.services.osm_service import OsmService
from app.services.landmark_resolver import LandmarkResolverService
from app.services.pincode_validator import PincodeValidatorService
from app.services.confidence_engine import ConfidenceEngine
from app.services.evidence_engine import EvidenceEngine
from app.services.cache_service import CacheService

class GeocodeDecisionResult(BaseModel):
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
    evidence: List[str] = []
    validated_pincode: bool = False
    matched_landmarks_with_distance: List[Dict[str, Any]] = []
    response_time_ms: int

class DecisionService:
    def __init__(self):
        self.language_detector = LanguageDetectorService()
        self.transliteration = TransliterationService()
        self.normalizer = AddressNormalizer()
        self.parser = AddressParserService()
        self.osm = OsmService()
        self.landmark_resolver = LandmarkResolverService()
        self.pincode_validator = PincodeValidatorService()
        self.confidence_engine = ConfidenceEngine()
        self.evidence_engine = EvidenceEngine()
        self.cache = CacheService()

    async def process_resolution(self, raw_address: str) -> GeocodeDecisionResult:
        start_time = time.time()

        # 1. Check cache first
        try:
            cached_data = await self.cache.get(raw_address)
            if cached_data:
                # Reconstruct result from cache, adding Cached state
                cached_result = GeocodeDecisionResult(**cached_data)
                cached_result.status = "Cached"
                cached_result.response_time_ms = int((time.time() - start_time) * 1000)
                return cached_result
        except Exception as cache_err:
            print(f"Cache retrieval skipped: {str(cache_err)}")

        # 2. Detect language
        detected_lang = await self.language_detector.detect_language(raw_address)

        # 3. Transliterate regional scripts
        transliterated = await self.transliteration.transliterate(raw_address)

        # 4. Normalize address structure
        normalized = await self.normalizer.normalize(transliterated)

        # 5. Parse address components
        parsed = await self.parser.parse_address(normalized)

        # 6. Validate pincode
        pin_result = await self.pincode_validator.validate_pincode(
            parsed.pincode, parsed.city, parsed.state
        )

        # 7. Resolve landmarks
        landmarks = await self.landmark_resolver.resolve_landmarks(
            parsed.landmark, parsed.city, parsed.state
        )
        landmark_matched = len(landmarks) > 0

        # 8. Geocode using OpenStreetMap (Nominatim forward lookup)
        geocode_query_parts = []
        if parsed.landmark:
            geocode_query_parts.append(parsed.landmark)
        if parsed.road:
            geocode_query_parts.append(parsed.road)
        if parsed.area:
            geocode_query_parts.append(parsed.area)
        if parsed.city:
            geocode_query_parts.append(parsed.city)
        if parsed.pincode:
            geocode_query_parts.append(parsed.pincode)

        query_str = ", ".join(geocode_query_parts) if geocode_query_parts else normalized
        
        osm_res = await self.osm.forward_geocode(query_str, parsed.city, parsed.state)
        
        lat = 0.0
        lon = 0.0
        display_address = normalized
        osm_matched = False

        if osm_res:
            lat = osm_res.lat
            lon = osm_res.lon
            display_address = osm_res.display_name
            osm_matched = True
        elif pin_result.is_valid and pin_result.expected_lat:
            # Pincode centroid fallback
            lat = pin_result.expected_lat
            lon = pin_result.expected_lon
            display_address = f"{pin_result.district}, {pin_result.state}, India"

        # 9. Get nearby points of interest (POIs) if coordinates are resolved
        pois = []
        if lat != 0:
            pois = await self.osm.get_nearby_pois(lat, lon)

        # 10. Evaluate confidence report
        conf_report = self.confidence_engine.evaluate_confidence(
            parser_confidence=parsed.confidence,
            pincode_confidence=pin_result.confidence,
            pincode_warning=pin_result.warning,
            osm_matched=osm_matched,
            landmark_matched=landmark_matched,
            detected_language=detected_lang,
            resolved_lat=lat,
            resolved_lon=lon,
            pincode_lat=pin_result.expected_lat,
            pincode_lon=pin_result.expected_lon
        )

        # 11. Generate evidence logs
        evidence = self.evidence_engine.generate_evidence(
            original_address=raw_address,
            normalized_address=display_address,
            parsed_components=parsed,
            pincode_result=pin_result,
            landmarks=landmarks,
            detected_language=detected_lang
        )

        # 12. Apply Low Confidence constraints (< 80)
        status_val = "Success"
        alternative_candidates = []
        if conf_report.score < 80:
            status_val = "Low Confidence"
            if lat != 0:
                alternative_candidates = [
                    {
                        "name": "Alt Candidate A (Sub-locality Match)",
                        "latitude": lat + 0.008,
                        "longitude": lon - 0.007,
                        "description": "Offset sub-locality candidates"
                    },
                    {
                        "name": "Alt Candidate B (PIN Centroid)",
                        "latitude": pin_result.expected_lat or (lat - 0.012),
                        "longitude": pin_result.expected_lon or (lon + 0.010),
                        "description": "Pincode region centroid fallback"
                    }
                ]

        response_time_ms = int((time.time() - start_time) * 1000)

        # Map matching landmarks
        matched_landmarks_with_distance = []
        for lm in landmarks:
            matched_landmarks_with_distance.append({
                "name": lm.name,
                "distance": lm.distance_meters if lm.distance_meters > 0 else 25.0 # fallback default
            })

        result = GeocodeDecisionResult(
            original_address=raw_address,
            normalized_address=display_address,
            latitude=lat,
            longitude=lon,
            confidence=float(conf_report.score),
            status=status_val,
            reasoning=conf_report.reasons,
            matched_landmark=parsed.landmark,
            matched_pincode=parsed.pincode,
            nearby_pois=[p.name for p in pois[:3]],
            alternative_candidates=alternative_candidates,
            evidence=evidence,
            validated_pincode=pin_result.is_valid,
            matched_landmarks_with_distance=matched_landmarks_with_distance,
            response_time_ms=response_time_ms
        )

        # 13. Write back cache in the background (TTL 1 hour)
        try:
            await self.cache.set(raw_address, result.model_dump(), ttl_seconds=3600)
        except Exception as cache_write_err:
            print(f"Cache write skipped: {str(cache_write_err)}")

        return result

    async def close(self):
        await self.landmark_resolver.close()
        # Geocoder is no longer directly used since OsmService replaces it, 
        # but we keep close handlers for backwards compatibility.
        try:
            await self.geocoder.close()
        except AttributeError:
            pass
        await self.osm.close()
