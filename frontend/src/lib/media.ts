import imageCompression from "browser-image-compression";
import { apiFetch } from "./api";
import type { Media } from "@/types/api";

export function getMedia(pointId: string): Promise<Media[]> {
  return apiFetch<Media[]>(`/points/${pointId}/media`);
}

export async function uploadPhoto(
  pointId: string,
  file: File,
): Promise<Media> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  });

  const media = await apiFetch<Media>(`/points/${pointId}/media`, {
    method: "POST",
    body: JSON.stringify({ point_id: pointId, type: "photo" }),
  });

  if (!media.upload_url) {
    throw new Error("Storage not configured — no upload URL returned");
  }

  await fetch(media.upload_url, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: compressed,
  });

  return media;
}

export function deleteMedia(mediaId: string): Promise<void> {
  return apiFetch<void>(`/media/${mediaId}`, { method: "DELETE" });
}
