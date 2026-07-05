import { apiFetch } from "./api";
import type { HealthResponse } from "@/types/api";

export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}
