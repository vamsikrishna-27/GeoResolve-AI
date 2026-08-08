import re
import difflib
from typing import Dict, List, Optional

try:
    from rapidfuzz import process, fuzz
    HAS_RAPIDFUZZ = True
except ImportError:
    HAS_RAPIDFUZZ = False

INDIAN_LOCATIONS = [
    "Hyderabad",
    "Bengaluru",
    "Bangalore",
    "Hitech City",
    "Kukatpally",
    "Gachibowli",
    "Amalapuram",
    "Visakhapatnam",
    "Vijayawada",
    "Guntur",
    "Tenali",
    "Rajahmundry",
    "Kakinada",
    "Eluru",
    "Nellore",
    "Tirupati",
    "Kurnool",
    "Kadapa",
    "Anantapur",
    "Ongole",
    "Warangal",
    "Karimnagar",
    "Nizamabad",
    "Khammam",
    "Andhra Pradesh",
    "Telangana",
    "Tamil Nadu",
    "Karnataka",
    "Kerala",
    "Maharashtra",
    "India"
]

ABBREVIATIONS = {
    r"\bopp\b": "Opposite",
    r"\bopp\.\b": "Opposite",
    r"\bopposite\b": "Opposite",
    r"\brd\b": "Road",
    r"\brd\.\b": "Road",
    r"\bst\b": "Street",
    r"\bst\.\b": "Street",
    r"\bflr\b": "Floor",
    r"\bflr\.\b": "Floor",
    r"\bapt\b": "Apartment",
    r"\bapt\.\b": "Apartment",
    r"\bhno\b": "House No",
    r"\bhno\.\b": "House No",
    r"\bno\b": "Number",
    r"\bny\b": "New York",
    r"\bcty\b": "City"
}

REGIONAL_DIRECTIONS = {
    r"\bsaamne\b": "Opposite",
    r"\bsamne\b": "Opposite",
    r"\beduruga\b": "Opposite",
    r"\bdaggara\b": "Near",
    r"\bdaggira\b": "Near",
    r"\bhathira\b": "Near",
    r"\bhathra\b": "Near",
    r"\bpass\b": "Near",
    r"\bpakkam\b": "Beside",
    r"\bpakkana\b": "Beside",
    r"\bpakkada\b": "Beside"
}

def expand_abbreviations(address: str) -> str:
    """Expands common postal abbreviations and regional direction prepositions."""
    norm = address
    for pattern, replacement in ABBREVIATIONS.items():
        norm = re.sub(pattern, replacement, norm, flags=re.IGNORECASE)
    for pattern, replacement in REGIONAL_DIRECTIONS.items():
        norm = re.sub(pattern, replacement, norm, flags=re.IGNORECASE)
    return norm

def normalize_address(address: str) -> str:
    """Normalizes address, correcting spelling errors using RapidFuzz."""
    if not address:
        return ""
        
    # Trim whitespace, standardize spacing, clean duplicate commas
    norm = address.replace("\n", ", ").strip()
    norm = re.sub(r"\s+", " ", norm)
    
    # Expand abbreviations
    norm = expand_abbreviations(norm)
    
    # Remove duplicate commas
    norm = re.sub(r",\s*,", ",", norm)
    norm = re.sub(r"\s*,\s*", ", ", norm)
    norm = re.sub(r",+", ",", norm)
    norm = norm.strip(", ")

    # Correct spelling mistakes word by word
    tokens = re.split(r"(\s+|,|\.|\/|-)", norm)
    corrected_tokens = []
    
    for token in tokens:
        stripped = token.strip(",./- ")
        if not stripped or len(stripped) < 3 or stripped.isdigit():
            corrected_tokens.append(token)
            continue
        lower_stripped = stripped.lower()
        if lower_stripped in ["bangalore", "banglore"]:
            corrected_tokens.append(token.replace(stripped, "Bengaluru"))
            continue
        elif lower_stripped == "andrha":
            corrected_tokens.append(token.replace(stripped, "Andhra"))
            continue
        elif lower_stripped == "hydrabad":
            corrected_tokens.append(token.replace(stripped, "Hyderabad"))
            continue
        elif lower_stripped == "amlapuram":
            corrected_tokens.append(token.replace(stripped, "Amalapuram"))
            continue
        elif lower_stripped == "visakapatnam":
            corrected_tokens.append(token.replace(stripped, "Visakhapatnam"))
            continue
        elif lower_stripped == "gunturr":
            corrected_tokens.append(token.replace(stripped, "Guntur"))
            continue
        elif lower_stripped == "kuktpally":
            corrected_tokens.append(token.replace(stripped, "Kukatpally"))
            continue
        elif lower_stripped == "hitec":
            corrected_tokens.append(token.replace(stripped, "Hitech"))
            continue
        elif lower_stripped == "cty":
            corrected_tokens.append(token.replace(stripped, "City"))
            continue

        best_match = None
        best_score = 0.0
        
        if HAS_RAPIDFUZZ:
            res = process.extractOne(stripped, INDIAN_LOCATIONS, scorer=fuzz.WRatio)
            if res:
                best_match, best_score, _ = res
        else:
            matches = difflib.get_close_matches(stripped, INDIAN_LOCATIONS, n=1, cutoff=0.75)
            if matches:
                best_match = matches[0]
                best_score = difflib.SequenceMatcher(None, stripped.lower(), best_match.lower()).ratio() * 100
                
        # If similarity score is high (>=85%)
        if best_match and best_score >= 85.0:
            # Prevent expanding a single word token into a multi-word candidate (e.g. "Pradesh" -> "Andhra Pradesh")
            if " " in best_match and " " not in stripped:
                sub_words = best_match.split()
                best_sub = stripped
                best_sub_score = 0.0
                for sw in sub_words:
                    if HAS_RAPIDFUZZ:
                        sw_score = fuzz.WRatio(stripped, sw)
                    else:
                        sw_score = difflib.SequenceMatcher(None, stripped.lower(), sw.lower()).ratio() * 100
                    if sw_score > best_sub_score:
                        best_sub_score = sw_score
                        best_sub = sw
                if best_sub_score >= 85.0:
                    corrected_tokens.append(token.replace(stripped, best_sub))
                else:
                    corrected_tokens.append(token)
            else:
                corrected_tokens.append(token.replace(stripped, best_match))
        else:
            corrected_tokens.append(token)
            
    corrected = "".join(corrected_tokens)
    
    # Title casing
    words = corrected.split()
    capitalized = []
    for w in words:
        if w.isdigit() and len(w) == 6:
            capitalized.append(w)
        else:
            capitalized.append(w.capitalize())
            
    return " ".join(capitalized)

class AddressNormalizer:
    async def normalize(self, address: str) -> str:
        return normalize_address(address)
