import re

class LanguageDetectorService:
    def __init__(self):
        # Unicode script ranges for major Indian languages
        self.script_ranges = {
            "Hindi/Marathi": re.compile(r"[\u0900-\u097F]"),
            "Telugu": re.compile(r"[\u0C00-\u0C7F]"),
            "Kannada": re.compile(r"[\u0C80-\u0CFF]"),
            "Tamil": re.compile(r"[\u0B80-\u0BFF]"),
            "Gujarati": re.compile(r"[\u0A80-\u0AFF]"),
            "Malayalam": re.compile(r"[\u0D00-\u0D7F]"),
            "Bengali": re.compile(r"[\u0980-\u09FF]")
        }

        # Transliterated indicator words (Hinglish/regional latin expressions)
        self.latin_regional_keywords = {
            "Hinglish": ["saamne", "paas", "gali", "nagar", "bazaar", "rasta", "kareeb", "samne", "ke", "se"],
            "Telugu-English": ["daggara", "pakkana", "veedhi", "elaka", "eduruga", "daggira"],
            "Tamil-English": ["pakkam", "theru", "nagar", "near", "opposite"],
            "Kannada-English": ["hathira", "hathra", "pakkadha", "pakkada", "beedi"]
        }

    async def detect_language(self, text: str) -> str:
        """
        Detects language or transliterated forms of South Asian addresses.
        Returns: English | Hindi/Marathi | Telugu | Kannada | Tamil | Gujarati | Malayalam | Mixed | Hinglish | Transliterated
        """
        if not text:
            return "English"

        # Check native script ranges
        matched_languages = []
        for lang_name, pattern in self.script_ranges.items():
            if pattern.search(text):
                matched_languages.append(lang_name)

        if len(matched_languages) > 1:
            return "Mixed"
        elif len(matched_languages) == 1:
            return matched_languages[0]

        # Latin characters processing (English / Hinglish / Transliterations)
        text_lower = text.lower()
        
        # Check transliteration indicator keys
        matched_trans = []
        for group_name, keywords in self.latin_regional_keywords.items():
            for word in keywords:
                if re.search(rf"\b{re.escape(word)}\b", text_lower):
                    matched_trans.append(group_name)
                    break

        if len(matched_trans) >= 1:
            # If Hinglish/regional Latin is found
            return "Hinglish" if "Hinglish" in matched_trans else "Transliterated"

        return "English"
