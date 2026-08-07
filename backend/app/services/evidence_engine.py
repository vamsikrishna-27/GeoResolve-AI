from typing import List, Any
from app.services.address_parser import AddressComponents
from app.services.pincode_validator import PincodeValidationResult

class EvidenceEngine:
    def __init__(self):
        pass

    def generate_evidence(
        self,
        original_address: str,
        normalized_address: str,
        parsed_components: AddressComponents,
        pincode_result: PincodeValidationResult,
        landmarks: List[Any],
        detected_language: str
    ) -> List[str]:
        """
        Gathers list of verification indicators asserting geocoding decision logic.
        """
        evidence = []

        # 1. Pincode Validation evidence
        if pincode_result.is_valid:
            evidence.append(f"Validated PIN {pincode_result.pincode}")
        elif pincode_result.corrected_pincode:
            evidence.append(f"Corrected PIN {pincode_result.pincode} to {pincode_result.corrected_pincode}")
        elif pincode_result.pincode:
            evidence.append(f"Flagged invalid PIN {pincode_result.pincode}")
        else:
            evidence.append("PIN missing in address text")

        # 2. Landmark matching evidence
        if landmarks:
            closest = landmarks[0]
            dist_str = f" ({closest.distance_meters}m)" if hasattr(closest, 'distance_meters') and closest.distance_meters > 0 else ""
            evidence.append(f"Matched {closest.name}{dist_str}")

        # 3. Locality/City alignment
        if parsed_components.area:
            evidence.append("Matched locality")
        if parsed_components.road:
            evidence.append(f"Matched OSM road: {parsed_components.road}")

        # 4. Spelling normalizations
        if original_address.lower() != normalized_address.lower():
            evidence.append("Address orthography normalized")

        # 5. Language detection metadata
        if detected_language != "English":
            evidence.append(f"Language context analyzed ({detected_language})")

        return evidence
