import { apiFetch } from "./api";
import type { SearchResponse } from "@/types/api";

export function searchAll(query: string, limit = 20): Promise<SearchResponse> {
  return apiFetch<SearchResponse>(
    `/search?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
}
