import { apiFetch } from "./api";
import type { Trip } from "@/types/api";

export function getTrips(): Promise<Trip[]> {
  return apiFetch<Trip[]>("/trips");
}

export function createTrip(title: string, description?: string): Promise<Trip> {
  return apiFetch<Trip>("/trips", {
    method: "POST",
    body: JSON.stringify({ title, description }),
  });
}

export function updateTrip(
  tripId: string,
  data: { title?: string; description?: string }
): Promise<Trip> {
  return apiFetch<Trip>(`/trips/${tripId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteTrip(tripId: string): Promise<void> {
  return apiFetch<void>(`/trips/${tripId}`, { method: "DELETE" });
}

export function addCircuitToTrip(tripId: string, circuitId: string): Promise<void> {
  return apiFetch<void>(`/trips/${tripId}/circuits/${circuitId}`, { method: "POST" });
}

export function removeCircuitFromTrip(tripId: string, circuitId: string): Promise<void> {
  return apiFetch<void>(`/trips/${tripId}/circuits/${circuitId}`, { method: "DELETE" });
}
