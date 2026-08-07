import re
import spacy
from typing import Optional
from pydantic import BaseModel

class AddressComponents(BaseModel):
    building: Optional[str] = None
    landmark: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    road: Optional[str] = None
    apartment: Optional[str] = None
    floor: Optional[str] = None
    confidence: float = 1.0

class AddressParserService:
    def __init__(self):
        # Attempt to load the spaCy model
        try:
            self.nlp = spacy.load("en_core_web_sm")
            self.has_spacy = True
        except Exception:
            self.nlp = None
            self.has_spacy = False
            print("spaCy model 'en_core_web_sm' not found. Falling back to heuristic parsing engine.")

        # Heuristics lists
        self.states_db = [
            "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
            "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
            "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
            "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
            "Uttarakhand", "West Bengal", "Delhi", "Puducherry", "Jammu and Kashmir", "Ladakh"
        ]
        
        self.landmark_triggers = [
            r"near", r"opposite", r"opp\.?", r"behind", r"beside", r"next to", 
            r"adjacent to", r"close to", r"facing", r"in front of"
        ]

    async def parse_address(self, raw_address: str) -> AddressComponents:
        """
        Parses messy Indian address text using a hybrid spaCy NLP and regex engine.
        Returns: Structured AddressComponents
        """
        address_clean = raw_address.replace("\n", ", ").strip()
        
        # 1. Pincode Extraction (6-digit numeric sequences)
        pincode = None
        pin_match = re.search(r"\b(\d{6})\b", address_clean)
        if pin_match:
            pincode = pin_match.group(1)
            address_clean = address_clean.replace(pincode, "").strip()

        # 2. Floor and Apartment Extraction
        floor = None
        floor_match = re.search(r"\b(\d+)(?:st|nd|rd|th)\s*floor\b|\bfloor\s*(\d+)\b", address_clean, re.IGNORECASE)
        if floor_match:
            floor = floor_match.group(1) or floor_match.group(2)
            address_clean = address_clean.replace(floor_match.group(0), "").strip()

        apartment = None
        apt_match = re.search(r"\b(?:flat|apt|apartment|suite|room|villa)\s*([a-zA-Z0-9\-/\s]+?)(?:,|$)", address_clean, re.IGNORECASE)
        if apt_match:
            apartment = apt_match.group(0).strip(", ")
            address_clean = address_clean.replace(apt_match.group(0), "").strip()

        # 3. State Extraction
        state = None
        for s in self.states_db:
            if re.search(rf"\b{re.escape(s)}\b", address_clean, re.IGNORECASE):
                state = s
                address_clean = re.sub(rf"\b{re.escape(s)}\b", "", address_clean, flags=re.IGNORECASE).strip()
                break

        # 4. Landmark Extraction
        landmark = None
        for trigger in self.landmark_triggers:
            match = re.search(rf"\b({trigger})\s+([^,]+)", address_clean, re.IGNORECASE)
            if match:
                landmark = f"{match.group(1)} {match.group(2)}".strip()
                address_clean = address_clean.replace(match.group(0), "").strip()
                break

        # 5. Extract City, Road, and Locality using spaCy if available
        city = None
        road = None
        locality = None
        building = None

        if self.has_spacy and self.nlp:
            doc = self.nlp(address_clean)
            for ent in doc.ents:
                if ent.label_ in ["GPE", "LOC"]:
                    # Likely a city or state
                    if not city:
                        city = ent.text
                elif ent.label_ in ["FAC", "ORG"]:
                    # Facility/Building
                    if not building:
                        building = ent.text

        # 6. Fallback regex splits for city/street/locality
        parts = [p.strip().strip("-").strip() for p in address_clean.split(",") if p.strip().strip("-").strip()]
        
        # Extract road patterns
        for p in parts:
            if re.search(r"\b(road|rd|street|st|lane|ln|cross|main|bypass)\b", p, re.IGNORECASE):
                road = p
                parts.remove(p)
                break

        if parts:
            if not city:
                city_candidate = parts[-1]
                if len(city_candidate.split()) <= 2:
                    city = city_candidate
                    parts.pop()
            
        if parts:
            locality = parts[-1]
            parts.pop()

        if parts and not building:
            building = ", ".join(parts)

        # Compute a parsing parsing confidence based on structural fields filled
        filled_fields = sum(1 for f in [building, landmark, city, state, pincode] if f is not None)
        confidence = round(filled_fields / 5.0, 2)

        return AddressComponents(
            building=building,
            landmark=landmark,
            area=locality,
            city=city,
            district=None,
            state=state,
            pincode=pincode,
            road=road,
            apartment=apartment,
            floor=floor,
            confidence=max(0.1, confidence)
        )
