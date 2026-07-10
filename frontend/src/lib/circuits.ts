import { apiFetch } from "./api";
import type { Circuit, CircuitCreate, CircuitUpdate } from "@/types/api";

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
