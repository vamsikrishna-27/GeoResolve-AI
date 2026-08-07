import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app
from app.services.language_detector import LanguageDetectorService
from app.services.transliteration_service import TransliterationService
from app.services.address_normalizer import AddressNormalizer
from app.services.address_parser import AddressParserService
from app.services.pincode_validator import PincodeValidatorService
from app.services.osm_service import OsmService
from app.services.confidence_engine import ConfidenceEngine

client = TestClient(app)

# 1. Language Detector Unit Tests
@pytest.mark.asyncio
async def test_language_detector():
    detector = LanguageDetectorService()
    
    # Telugu script
    assert await detector.detect_language("గణేష్ టెంపుల్ దగ్గర") == "Telugu"
    # Hindi script
    assert await detector.detect_language("गणेश मंदिर के पास") == "Hindi/Marathi"
    # English
    assert await detector.detect_language("HIG Road, Bengaluru") == "English"
    # Hinglish
    assert await detector.detect_language("Ganesh Temple ke saamne") == "Hinglish"

# 2. Transliteration Service Unit Tests
@pytest.mark.asyncio
async def test_transliteration_service():
    service = TransliterationService()
    
    # Bangalore -> Bengaluru
    assert await service.transliterate("I live in Bangalore") == "I live in Bengaluru"
    # Kannada word for Road -> Road
    assert await service.transliterate("రస్తే") in ["Road", "ರಸ್ತೆ"]

# 3. Address Normalizer Unit Tests
@pytest.mark.asyncio
async def test_address_normalizer():
    normalizer = AddressNormalizer()
    
    # Abbreviations and spacing cleanup (normalizer cleans spacing, expansions but leaves transliterations to TransliterationService)
    raw = "Flat 102,  opp  Ganesh Temple, HIG Rd, Bangalore"
    res = await normalizer.normalize(raw)
    assert "Opposite" in res
    assert "Road" in res
    assert "Bangalore" in res

# 4. Address Parser Unit Tests
@pytest.mark.asyncio
async def test_address_parser():
    parser = AddressParserService()
    address = "Flat 102, Gokul Residency, HIG Road Near MG Road Metro, Bengaluru, Karnataka 560008"
    result = await parser.parse_address(address)
    
    assert result.pincode == "560008"
    assert result.state == "Karnataka"
    assert result.city == "Bengaluru"
    assert "102" in result.apartment or result.apartment is not None

# 5. Pincode Validator Unit Tests
@pytest.mark.asyncio
async def test_pincode_validator():
    validator = PincodeValidatorService()
    
    # Test valid pin
    res1 = await validator.validate_pincode("560008", "Bengaluru", "Karnataka")
    assert res1.is_valid is True
    assert res1.state == "Karnataka"
    assert res1.confidence == 1.0

    # Test correction logic
    res2 = await validator.validate_pincode("560008", "Mumbai", "Maharashtra")
    assert res2.is_valid is False
    assert res2.corrected_pincode is not None # Mumbai PIN suggestion

# 6. OSM Service Unit Tests
@pytest.mark.asyncio
async def test_osm_service():
    osm = OsmService()
    
    mock_client = MagicMock()
    mock_client.is_closed = False # Prevent lazy property from overwriting mock
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = [{
        "lat": "12.9716",
        "lon": "77.5946",
        "display_name": "Bengaluru, Karnataka, India",
        "osm_type": "node",
        "osm_id": 998877,
        "boundingbox": ["12.9", "13.0", "77.5", "77.6"]
    }]
    
    from unittest.mock import AsyncMock
    mock_client.get = AsyncMock(return_value=mock_response)
    osm._client = mock_client

    res = await osm.forward_geocode("Bengaluru")
    assert res is not None
    assert res.lat == 12.9716
    assert res.osm_id == 998877

# 7. Confidence Engine Unit Tests
def test_confidence_engine():
    engine = ConfidenceEngine()
    report = engine.evaluate_confidence(
        parser_confidence=0.9,
        pincode_confidence=1.0,
        pincode_warning=None,
        osm_matched=True,
        landmark_matched=True,
        detected_language="English",
        resolved_lat=12.9716,
        resolved_lon=77.5946,
        pincode_lat=12.9716,
        pincode_lon=77.5946
    )
    assert report.score >= 90
    assert len(report.reasons) > 0

# 8. POST /api/v1/geocode/resolve API Route Integration Test
@patch("app.dependencies.auth.api_key_repo.validate_key")
@patch("app.api.resolve.get_supabase_admin_client")
def test_geocode_resolve_v1_endpoint(mock_supabase_admin, mock_validate_key):
    # Mock API Key Auth
    mock_validate_key.return_value = (True, {"id": "key_123", "user_id": "user_123", "name": "Key A", "status": "Active", "usage": 0, "max_limit": 25000}, None)
    
    # Mock Supabase table updates
    mock_db = MagicMock()
    mock_supabase_admin.return_value = mock_db
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{"id": "addr_123"}])

    headers = {"X-API-KEY": "gr_live_xyz"}
    payload = {"address": "Flat 102, opposite Ganesh Temple, HIG Road, Bengaluru 560008"}
    
    response = client.post("/api/v1/geocode/resolve", json=payload, headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert data["latitude"] != 0.0
    assert data["confidence"] >= 60
    assert data["validated_pincode"] is True
    assert len(data["evidence"]) > 0
