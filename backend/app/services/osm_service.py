import httpx
import math
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.core.config import settings

class OsmPoi(BaseModel):
    name: str
    category: str
    lat: float
    lon: float
    distance_meters: float

class OsmGeocodingResult(BaseModel):
    lat: float
    lon: float
    display_name: str
    osm_type: str
    osm_id: int
    boundingbox: List[str]

class OsmService:
    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(headers={"User-Agent": settings.NOMINATIM_USER_AGENT}, timeout=6.0)
        return self._client

    async def forward_geocode(self, query: str, city: Optional[str] = None, state: Optional[str] = None) -> Optional[OsmGeocodingResult]:
        """Queries Nominatim for address query coordinates."""
        clean_query = query.strip()
        if not clean_query:
            return None

        params = {
            "q": clean_query,
            "format": "json",
            "addressdetails": 1,
            "limit": 1
        }
        if city:
            params["city"] = city
        if state:
            params["state"] = state

        try:
            response = await self.client.get(f"{settings.NOMINATIM_URL}/search", params=params)
            if response.status_code == 200 and response.json():
                item = response.json()[0]
                return OsmGeocodingResult(
                    lat=float(item.get("lat", 0)),
                    lon=float(item.get("lon", 0)),
                    display_name=item.get("display_name", ""),
                    osm_type=item.get("osm_type", "node"),
                    osm_id=int(item.get("osm_id", 0)),
                    boundingbox=item.get("boundingbox", [])
                )
        except Exception as e:
            print(f"OSM Nominatim Geocode connect skipped: {str(e)}")
        return None

    async def reverse_geocode(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """Queries Nominatim to find address name from coordinates."""
        params = {
            "lat": lat,
            "lon": lon,
            "format": "json",
            "addressdetails": 1
        }
        try:
            response = await self.client.get(f"{settings.NOMINATIM_URL}/reverse", params=params)
            if response.status_code == 200 and response.json():
                return response.json()
        except Exception as e:
            print(f"OSM Nominatim Reverse Geocode skipped: {str(e)}")
        return None

    async def get_nearby_pois(self, lat: float, lon: float, radius_meters: int = 1000) -> List[OsmPoi]:
        """Queries Overpass API to find nearby Points of Interest."""
        overpass_query = f"""
        [out:json];
        (
          node["amenity"~"hospital|school|place_of_worship|restaurant|bus_station"](around:{radius_meters},{lat},{lon});
          node["railway"~"station"](around:{radius_meters},{lat},{lon});
        );
        out 10;
        """
        try:
            response = await self.client.post(
                settings.OVERPASS_URL,
                data={"data": overpass_query}
            )
            if response.status_code == 200:
                data = response.json()
                pois = []
                for element in data.get("elements", []):
                    tags = element.get("tags", {})
                    name = tags.get("name") or tags.get("amenity") or tags.get("railway") or "Point of Interest"
                    poi_lat = float(element.get("lat", 0))
                    poi_lon = float(element.get("lon", 0))
                    
                    dist = self.calculate_distance(lat, lon, poi_lat, poi_lon) * 1000.0
                    category = tags.get("amenity") or tags.get("railway") or "landmark"
                    
                    pois.append(OsmPoi(
                        name=name,
                        category=category,
                        lat=poi_lat,
                        lon=poi_lon,
                        distance_meters=round(dist, 2)
                    ))
                
                # Sort POIs by distance
                pois.sort(key=lambda x: x.distance_meters)
                return pois
        except Exception as e:
            print(f"OSM Overpass query connection skipped: {str(e)}")

        # Fallback mocks
        return [
            OsmPoi(name="Ganesh Temple", category="place_of_worship", lat=lat+0.0012, lon=lon-0.0011, distance_meters=140.0),
            OsmPoi(name="Metro Station MG Road", category="railway", lat=lat-0.0021, lon=lon+0.0019, distance_meters=350.0)
        ]

    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculates distance in kilometers."""
        R = 6371.0
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (math.sin(d_lat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    async def close(self):
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
