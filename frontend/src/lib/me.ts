import { apiFetch } from "./api";
import type { User, UserUpdate } from "@/types/api";

export function getMe(): Promise<User> {
  return apiFetch<User>("/me");
}

export function updateMe(data: UserUpdate): Promise<User> {
  return apiFetch<User>("/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteMe(): Promise<void> {
  return apiFetch<void>("/me", { method: "DELETE" });
}
