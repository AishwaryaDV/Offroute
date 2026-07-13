import { apiFetch } from "./api";
import type { Media } from "@/types/api";

export function getMedia(pointId: string): Promise<Media[]> {
  return apiFetch<Media[]>(`/points/${pointId}/media`);
}

export function createMedia(
  pointId: string,
  data: { point_id: string; type?: string; caption?: string },
): Promise<Media> {
  return apiFetch<Media>(`/points/${pointId}/media`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteMedia(mediaId: string): Promise<void> {
  return apiFetch<void>(`/media/${mediaId}`, { method: "DELETE" });
}
