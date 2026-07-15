import { apiFetch } from "./api";
import type { Circuit, CircuitCreate, CircuitUpdate, SharedCircuit } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function getCircuits(): Promise<Circuit[]> {
  return apiFetch<Circuit[]>("/circuits");
}

export function getCircuit(id: string): Promise<Circuit> {
  return apiFetch<Circuit>(`/circuits/${id}`);
}

export function createCircuit(data: CircuitCreate): Promise<Circuit> {
  return apiFetch<Circuit>("/circuits", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCircuit(id: string, data: CircuitUpdate): Promise<Circuit> {
  return apiFetch<Circuit>(`/circuits/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteCircuit(id: string): Promise<void> {
  return apiFetch<void>(`/circuits/${id}`, { method: "DELETE" });
}

export function starCircuit(id: string): Promise<{ star_count: number; is_starred: boolean }> {
  return apiFetch(`/circuits/${id}/star`, { method: "POST" });
}

export function unstarCircuit(id: string): Promise<{ star_count: number; is_starred: boolean }> {
  return apiFetch(`/circuits/${id}/star`, { method: "DELETE" });
}

export function shareCircuit(id: string): Promise<{ share_token: string }> {
  return apiFetch<{ share_token: string }>(`/circuits/${id}/share`, {
    method: "POST",
  });
}

export async function getSharedCircuit(token: string): Promise<SharedCircuit> {
  const res = await fetch(`${API_URL}/shared/${token}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
