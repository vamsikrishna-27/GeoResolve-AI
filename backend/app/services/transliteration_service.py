from typing import Dict

class TransliterationService:
    def __init__(self):
        # Phonetic mapping index for major Indian cities and terms
        self.spelling_rules: Dict[str, str] = {
            "bangalore": "Bengaluru",
            "banglore": "Bengaluru",
            "bengaluru": "Bengaluru",
            "mumbai": "Mumbai",
            "bombay": "Mumbai",
            "madras": "Chennai",
            "chennai": "Chennai",
            "calcutta": "Kolkata",
            "kolkata": "Kolkata",
            "secunderabad": "Hyderabad",
            "hyderabad": "Hyderabad",
            "pune": "Pune",
            "poona": "Pune",
            "gurgaon": "Gurugram",
            "gurugram": "Gurugram",
            "trichy": "Tiruchirappalli",
            "tiruchirappalli": "Tiruchirappalli",
            "baroda": "Vadodara",
            "vadodara": "Vadodara",
            "cochin": "Kochi",
            "kochi": "Kochi",
            "benares": "Varanasi",
            "varanasi": "Varanasi",
            "trivandrum": "Thiruvananthapuram",
            "thiruvananthapuram": "Thiruvananthapuram"
        }

        # Transliteration mapping of common non-English script keywords
        self.script_translations: Dict[str, str] = {
            # Kannada
            "ಬೆಂಗಳೂರು": "Bengaluru",
            "ಗಣೇಶ್": "Ganesh",
            "ದೇವಸ್ಥಾನ": "Temple",
            "ರಸ್ತೆ": "Road",
            "ಬಳಿ": "Near",
            # Telugu
            "బెంగళూరు": "Bengaluru",
            "గణేష్": "Ganesh",
            "గుడి": "Temple",
            "దగ్గర": "Near",
            "వీధి": "Road",
            "రస్తే": "Road", # Telugu script transliteration for road/rasta
            # Hindi
            "बेंगलुरु": "Bengaluru",
            "गणेश": "Ganesh",
            "मंदिर": "Temple",
            "मार्ग": "Road",
            "पास": "Near"
        }

    async def transliterate(self, text: str) -> str:
        """
        Translates regional scripts to English words and normalises common city names.
        """
        if not text:
            return ""

        words = text.split()
        translated_words = []

        for word in words:
            clean_word = word.strip(",.()\"'-").strip()
            matched = False
            
            # 1. Translate exact script strings
            if clean_word in self.script_translations:
                translated_words.append(word.replace(clean_word, self.script_translations[clean_word]))
                matched = True

            # 2. Normalize common phonetic spelling variants
            if not matched:
                word_lower = clean_word.lower()
                if word_lower in self.spelling_rules:
                    translated_words.append(word.replace(clean_word, self.spelling_rules[word_lower]))
                    matched = True

            if not matched:
                translated_words.append(word)

        return " ".join(translated_words)
