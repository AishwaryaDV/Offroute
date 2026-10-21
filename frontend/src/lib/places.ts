import { apiFetch } from "./api";

export interface PlaceResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export function searchPlaces(
  query: string,
  near?: { lat: number; lng: number },
  limit = 5,
): Promise<PlaceResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (near) {
    params.set("lat", String(near.lat));
    params.set("lng", String(near.lng));
  }
  return apiFetch<PlaceResult[]>(`/places/search?${params.toString()}`);
}
