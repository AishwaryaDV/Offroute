import { apiFetch } from "./api";

export interface ChatHistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  has_undo: boolean;
  created_at: string;
}

export interface ChatStep {
  tool: string;
  is_error: boolean;
}

export interface ChatResponse {
  message_id: string;
  reply: string;
  model: string;
  steps: ChatStep[];
  writes: boolean;
  error: string | null;
}

export function getChatHistory(circuitId: string): Promise<ChatHistoryMessage[]> {
  return apiFetch<ChatHistoryMessage[]>(`/circuits/${circuitId}/chat`);
}

export function sendChatMessage(
  circuitId: string,
  message: string,
  timezone?: string,
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>(`/circuits/${circuitId}/chat`, {
    method: "POST",
    body: JSON.stringify({ message, timezone }),
  });
}

export function undoLastChat(circuitId: string): Promise<{ undone: boolean }> {
  return apiFetch<{ undone: boolean }>(`/circuits/${circuitId}/chat/undo`, {
    method: "POST",
  });
}

export function clearChat(circuitId: string): Promise<void> {
  return apiFetch<void>(`/circuits/${circuitId}/chat`, { method: "DELETE" });
}
