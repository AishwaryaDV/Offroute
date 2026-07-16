import { apiFetch } from "./api";

export interface UserStats {
  circuits: number;
  points: number;
  stars_received: number;
  total_clones: number;
  categories: Record<string, number>;
}

export function getMyStats(): Promise<UserStats> {
  return apiFetch<UserStats>("/me/stats");
}
