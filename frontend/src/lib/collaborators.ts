import { apiFetch } from "./api";
import type { Collaborator, Invite } from "@/types/api";

export function getCollaborators(circuitId: string): Promise<Collaborator[]> {
  return apiFetch<Collaborator[]>(`/circuits/${circuitId}/collaborators`);
}

export function inviteCollaborator(
  circuitId: string,
  email: string,
  role: string = "viewer"
): Promise<Collaborator> {
  return apiFetch<Collaborator>(`/circuits/${circuitId}/collaborators`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export function removeCollaborator(
  circuitId: string,
  collabId: string
): Promise<void> {
  return apiFetch<void>(`/circuits/${circuitId}/collaborators/${collabId}`, {
    method: "DELETE",
  });
}

export function getMyInvites(): Promise<Invite[]> {
  return apiFetch<Invite[]>("/me/invites");
}

export function acceptInvite(inviteId: string): Promise<void> {
  return apiFetch<void>(`/me/invites/${inviteId}/accept`, { method: "POST" });
}

export function declineInvite(inviteId: string): Promise<void> {
  return apiFetch<void>(`/me/invites/${inviteId}/decline`, { method: "POST" });
}
