export interface Coords {
  lat: number;
  lng: number;
}

export function haversineKm(a: Coords, b: Coords): number {
  const radiusKm = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} м`;
  return `${km.toFixed(1)} км`;
}

export function walkMinutes(km: number): string {
  const minutes = Math.round(km / 5 * 60);
  return minutes < 60 ? `~${minutes} хв пішки` : `~${Math.round(minutes / 60)} год`;
}

export function mapsUrl(lat: number, lng: number, label?: string): string {
  const query = encodeURIComponent(label ?? `${lat},${lng}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

const CITY_CENTERS: Record<string, Coords> = {
  Київ: { lat: 50.4501, lng: 30.5234 },
  Дніпро: { lat: 48.4647, lng: 35.0462 },
  Львів: { lat: 49.8397, lng: 24.0297 },
  Харків: { lat: 49.9935, lng: 36.2304 },
  Одеса: { lat: 46.4825, lng: 30.7233 },
};

export function detectNearestCity(lat: number, lng: number): string | undefined {
  return Object.entries(CITY_CENTERS)
    .map(([city, coords]) => ({ city, distance: haversineKm({ lat, lng }, coords) }))
    .sort((a, b) => a.distance - b.distance)[0]?.city;
}
