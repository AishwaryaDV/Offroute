import { apiFetch } from "./api";
import type { Notification } from "@/types/api";

export function getNotifications(): Promise<Notification[]> {
  return apiFetch<Notification[]>("/me/notifications");
}

export function getUnreadCount(): Promise<{ count: number }> {
  return apiFetch<{ count: number }>("/me/notifications/unread-count");
}

export function markAllRead(): Promise<void> {
  return apiFetch<void>("/me/notifications/read", { method: "POST" });
}
