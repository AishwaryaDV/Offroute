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

export function deleteNotification(id: string): Promise<void> {
  return apiFetch<void>(`/me/notifications/${id}`, { method: "DELETE" });
}

export function clearAllNotifications(): Promise<void> {
  return apiFetch<void>("/me/notifications", { method: "DELETE" });
}
