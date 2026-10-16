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

  if (!media.upload_url || !media.upload_fields) {
    throw new Error("Storage not configured — no upload URL returned");
  }

  // Presigned POST (not PUT) — the server signs a content-length-range
  // condition into the policy fields, which S3 enforces. A plain PUT URL
  // has no way to cap the upload size.
  const form = new FormData();
  Object.entries(media.upload_fields).forEach(([key, value]) => form.append(key, value));
  form.append("file", compressed);
  await fetch(media.upload_url, { method: "POST", body: form });

  return media;
}

export function getCircuitMedia(circuitId: string): Promise<Media[]> {
  return apiFetch<Media[]>(`/circuits/${circuitId}/media`);
}

export function deleteMedia(mediaId: string): Promise<void> {
  return apiFetch<void>(`/media/${mediaId}`, { method: "DELETE" });
}
