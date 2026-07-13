import { apiFetch } from "./api";
import type { Point, PointCreate, PointUpdate, ReorderItem, WorldPoint } from "@/types/api";

export function getPoints(circuitId: string): Promise<Point[]> {
  return apiFetch<Point[]>(`/circuits/${circuitId}/points`);
}

export function createPoint(circuitId: string, data: PointCreate): Promise<Point> {
  return apiFetch<Point>(`/circuits/${circuitId}/points`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updatePoint(id: string, data: PointUpdate): Promise<Point> {
  return apiFetch<Point>(`/points/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deletePoint(id: string): Promise<void> {
  return apiFetch<void>(`/points/${id}`, { method: "DELETE" });
}

export function getAllPoints(): Promise<WorldPoint[]> {
  return apiFetch<WorldPoint[]>("/points/all");
}

export function reorderPoints(circuitId: string, points: ReorderItem[]): Promise<Point[]> {
  return apiFetch<Point[]>(`/circuits/${circuitId}/points/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ points }),
  });
}
