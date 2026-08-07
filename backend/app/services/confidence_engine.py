import math
from typing import Optional, List
from pydantic import BaseModel

class ConfidenceReport(BaseModel):
    score: int
    reasons: List[str]

class ConfidenceEngine:
    def __init__(self):
        pass

    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculates distance in kilometers."""
        R = 6371.0
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (math.sin(d_lat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def evaluate_confidence(
        self,
        parser_confidence: float,
        pincode_confidence: float,
        pincode_warning: Optional[str],
        osm_matched: bool,
        landmark_matched: bool,
        detected_language: str,
        resolved_lat: float,
        resolved_lon: float,
        pincode_lat: Optional[float],
        pincode_lon: Optional[float]
    ) -> ConfidenceReport:
        """
        Combines scores from parsing accuracy, language flags, PIN validation, 
        and coordinate proximity, returning a score from 0-100 and reasoning.
        """
        reasons = []
        score = 0.0

        # 1. Address parser weight (30%)
        parser_score = parser_confidence * 100.0
        score += parser_score * 0.30
        reasons.append(f"Address structure parsing parsed successfully (Accuracy: {int(parser_score)}%)")

        # 2. Pincode validation weight (30%)
        pin_score = pincode_confidence * 100.0
        if pincode_warning:
            reasons.append(f"Pincode check returned warnings: {pincode_warning}")
        else:
            reasons.append("Pincode registry matches state and district details")
        score += pin_score * 0.30

        # 3. OSM match weight (20%)
        osm_score = 100.0 if osm_matched else 0.0
        score += osm_score * 0.20
        if osm_matched:
            reasons.append("Coordinates resolved from active OSM directory mapping")
        else:
            reasons.append("OSM directory geocoding lookup failed; falling back to regional bounds")

        # 4. Landmark match weight (10%)
        landmark_score = 100.0 if landmark_matched else 0.0
        score += landmark_score * 0.10
        if landmark_matched:
            reasons.append("Address landmarks matched and localized on map")

        # 5. Language weight (10%)
        # Mixed or regional transliterated script reduces score slightly if raw address casing is messy
        lang_score = 100.0
        if detected_language == "Hinglish":
            lang_score = 85.0
            reasons.append("Address contains Hinglish transliterated direction prepositions")
        elif detected_language != "English":
            lang_score = 90.0
            reasons.append(f"Address language detected: {detected_language}")
        score += lang_score * 0.10

        # 6. Geodetic distance penalty (check offset from pincode region centroid)
        if resolved_lat != 0 and pincode_lat and pincode_lon:
            dist_km = self._haversine_distance(resolved_lat, resolved_lon, pincode_lat, pincode_lon)
            if dist_km > 15.0:
                penalty = min(25.0, (dist_km - 15.0) * 1.5)
                score -= penalty
                reasons.append(f"Geodetic warning: Resolution coordinate is offset by {round(dist_km, 2)}km from PIN centroid")

        final_score = max(0, min(100, int(round(score))))
        return ConfidenceReport(score=final_score, reasons=reasons)
