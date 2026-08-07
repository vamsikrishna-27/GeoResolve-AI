import re
from typing import Optional, Dict, List
from pydantic import BaseModel

class PincodeValidationResult(BaseModel):
    is_valid: bool
    pincode: str
    corrected_pincode: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    expected_lat: Optional[float] = None
    expected_lon: Optional[float] = None
    confidence: float
    warning: Optional[str] = None
    suggested_alternatives: List[str] = []

class PincodeValidatorService:
    def __init__(self):
        # Index containing PIN prefixes and their state/district nodes
        self.pincode_prefixes: Dict[str, Dict] = {
            "56": {"state": "Karnataka", "district": "Bengaluru", "lat": 12.9716, "lon": 77.5946, "pins": ["560001", "560008", "560038", "560066"]},
            "11": {"state": "Delhi", "district": "New Delhi", "lat": 28.6139, "lon": 77.2090, "pins": ["110001", "110011", "110020", "110085"]},
            "40": {"state": "Maharashtra", "district": "Mumbai", "lat": 19.0760, "lon": 72.8777, "pins": ["400001", "400008", "400050", "400099"]},
            "60": {"state": "Tamil Nadu", "district": "Chennai", "lat": 13.0827, "lon": 80.2707, "pins": ["600001", "600008", "600017", "600028"]},
            "70": {"state": "West Bengal", "district": "Kolkata", "lat": 22.5726, "lon": 88.3639, "pins": ["700001", "700012", "700050", "700091"]},
            "50": {"state": "Telangana", "district": "Hyderabad", "lat": 17.3850, "lon": 78.4867, "pins": ["500001", "500018", "500032", "500081"]},
            "38": {"state": "Gujarat", "district": "Ahmedabad", "lat": 23.0225, "lon": 72.5714, "pins": ["380001", "380009", "380015", "380054"]},
            "68": {"state": "Kerala", "district": "Kochi", "lat": 9.9312, "lon": 76.2673, "pins": ["682001", "682011", "682025", "682035"]}
        }

    async def validate_pincode(self, pincode: Optional[str], city: Optional[str], state: Optional[str]) -> PincodeValidationResult:
        """
        Validates pincode against Indian post mappings, correcting inputs and suggesting alternatives.
        """
        if not pincode:
            # Fallback suggestion based on city/state mapping
            suggested_pin = None
            city_lower = city.lower() if city else ""
            for prefix, meta in self.pincode_prefixes.items():
                if city_lower and meta["district"].lower() in city_lower:
                    suggested_pin = meta["pins"][0]
                    break
            
            alt_list = [suggested_pin] if suggested_pin else []
            return PincodeValidationResult(
                is_valid=False,
                pincode="",
                warning="Pincode is missing in address.",
                confidence=0.0,
                suggested_alternatives=alt_list
            )

        clean_pin = "".join(filter(str.isdigit, pincode))
        if len(clean_pin) != 6:
            return PincodeValidationResult(
                is_valid=False,
                pincode=pincode,
                warning="Indian pincodes must be exactly 6 digits.",
                confidence=0.0
            )

        prefix = clean_pin[:2]
        region_meta = self.pincode_prefixes.get(prefix)

        if not region_meta:
            # Look for closest state prefix matches to recommend corrections
            suggested_pin = None
            state_lower = state.lower() if state else ""
            for pref, meta in self.pincode_prefixes.items():
                if state_lower and meta["state"].lower() in state_lower:
                    suggested_pin = meta["pins"][0]
                    break
            
            alt_list = [suggested_pin] if suggested_pin else []
            return PincodeValidationResult(
                is_valid=False,
                pincode=clean_pin,
                warning="Invalid pincode prefix. Suggested standard region pin added.",
                confidence=0.2,
                suggested_alternatives=alt_list
            )

        # Validate consistent state/city bindings
        warning = None
        corrected_pincode = None
        expected_state = region_meta["state"]
        expected_city = region_meta["district"]
        confidence = 1.0

        if state and expected_state.lower() != state.lower():
            confidence = 0.5
            warning = f"Pincode mismatch: PIN {clean_pin} is registered in {expected_state}, but address lists {state}."
            
            # Suggest matching state code correction
            state_lower = state.lower()
            for pref, meta in self.pincode_prefixes.items():
                if meta["state"].lower() == state_lower:
                    corrected_pincode = meta["pins"][0]
                    break

        elif city and expected_city.lower() not in city.lower():
            confidence = 0.7
            warning = f"Pincode discrepancy: PIN {clean_pin} is registered in {expected_city}, but address lists {city}."
            
            # Suggest matching city code correction
            city_lower = city.lower()
            for pref, meta in self.pincode_prefixes.items():
                if meta["district"].lower() in city_lower:
                    corrected_pincode = meta["pins"][0]
                    break

        return PincodeValidationResult(
            is_valid=(confidence == 1.0),
            pincode=clean_pin,
            corrected_pincode=corrected_pincode,
            state=expected_state,
            district=expected_city,
            expected_lat=region_meta["lat"],
            expected_lon=region_meta["lon"],
            confidence=confidence,
            warning=warning,
            suggested_alternatives=region_meta["pins"]
        )
