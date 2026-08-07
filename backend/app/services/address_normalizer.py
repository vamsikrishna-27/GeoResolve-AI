import re
from typing import Dict

class AddressNormalizer:
    def __init__(self):
        # Abbreviation expansions
        self.abbreviations: Dict[str, str] = {
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
            r"\bno\b": "Number"
        }

        # Transliterated indicator words mapping to standard English prepositions
        self.regional_direction_maps: Dict[str, str] = {
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

    async def normalize(self, address: str) -> str:
        """
        Cleans, standardises, and normalises address string structure and syntax.
        """
        if not address:
            return ""

        # 1. Clean spacing, newlines, and remove noise
        norm = address.replace("\n", ", ").strip()
        norm = re.sub(r"\s+", " ", norm)
        
        # 2. Expand abbreviations
        for pattern, replacement in self.abbreviations.items():
            norm = re.sub(pattern, replacement, norm, flags=re.IGNORECASE)

        # 3. Translate regional direction markers to English equivalents
        for pattern, replacement in self.regional_direction_maps.items():
            norm = re.sub(pattern, replacement, norm, flags=re.IGNORECASE)

        # 4. Standardize punctuation (dangling commas, hyphens)
        norm = re.sub(r",\s*,", ",", norm) # double commas
        norm = re.sub(r"\s*,\s*", ", ", norm) # spacing around commas
        norm = re.sub(r",+", ",", norm)
        norm = norm.strip(", ")

        # 5. Title casing (excluding PINcodes and standard metrics abbreviations)
        words = norm.split()
        capitalized = []
        for w in words:
            if w.isdigit() and len(w) == 6: # pincode
                capitalized.append(w)
            else:
                capitalized.append(w.capitalize())

        return " ".join(capitalized)
