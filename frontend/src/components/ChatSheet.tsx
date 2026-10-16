"use client";

import { Send, Sparkles, Trash2, Undo2, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  ChatHistoryMessage,
  clearChat,
  getChatHistory,
  sendChatMessage,
  undoLastChat,
} from "@/lib/chat";

interface ChatSheetProps {
  circuitId: string;
  circuitTitle: string;
  open: boolean;
  onClose: () => void;
  /** Called after any turn that changed circuit data, so the page can refresh. */
  onWrite: () => void;
}

const TZ =
  typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

function Avatar({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-blue-500 text-white"
      style={{ width: size, height: size }}
    >
      <Sparkles size={size * 0.5} />
    </span>
  );
}

export function ChatSheet({ circuitId, circuitTitle, open, onClose, onWrite }: ChatSheetProps) {
  const [messages, setMessages] = useState<ChatHistoryMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    getChatHistory(circuitId).then(setMessages).catch(() => {});
  }, [open, circuitId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    const optimistic: ChatHistoryMessage = {
      id: `tmp-${Date.now()}`, role: "user", content: text,
      has_undo: false, created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      const res = await sendChatMessage(circuitId, text, TZ);
      setMessages((m) => [
        ...m,
        { id: res.message_id, role: "assistant", content: res.reply, has_undo: res.writes, created_at: new Date().toISOString() },
      ]);
      if (res.writes) onWrite();
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status === 429
          ? "Too many messages — slow down a bit."
          : "Assistant couldn't respond — try again.",
      );
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  async function undo() {
    try {
      await undoLastChat(circuitId);
      onWrite();
      setMessages(await getChatHistory(circuitId));
      toast.success("Undone");
    } catch {
      toast.error("Nothing to undo");
    }
  }

  async function clear() {
    await clearChat(circuitId).catch(() => {});
    setMessages([]);
  }

  if (!open) return null;

  const lastUndoable = [...messages].reverse().find((m) => m.role === "assistant" && m.has_undo);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed inset-0 z-[70] flex flex-col bg-[#0b1120] text-white"
    >
      {/* header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <Avatar size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-none">Ask AI</p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/45">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_2px_rgba(52,211,153,0.2)]" />
            <span className="truncate">{circuitTitle}</span>
          </p>
        </div>
        {messages.length > 0 && (
          <button onClick={clear} aria-label="Clear chat"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 active:bg-white/10">
            <Trash2 size={17} />
          </button>
        )}
        <button onClick={onClose} aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 active:bg-white/10">
          <X size={18} />
        </button>
      </div>

      {/* thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
        {messages.length === 0 && !sending && (
          <div className="flex items-start gap-2.5">
            <Avatar size={28} />
            <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-white/[0.06] px-3.5 py-2.5 text-sm text-white/90">
              Hi! I can log and edit this circuit by chat — try &ldquo;Add Toit in Indiranagar, drinks, 5 stars&rdquo;, or ask &ldquo;how many 5-star spots do I have?&rdquo;
            </div>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((m) => (
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-blue-600 px-3.5 py-2.5 text-sm">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex items-start gap-2.5">
                <Avatar size={28} />
                <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tl-md bg-white/[0.06] px-3.5 py-2.5 text-sm text-white/90">
                  {m.content}
                </div>
              </div>
            )
          ))}
          {sending && (
            <div className="flex items-start gap-2.5">
              <Avatar size={28} />
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-white/[0.06] px-4 py-3.5">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 rounded-full bg-white/50"
                    style={{ animation: `chat-dot 1s ease-in-out ${d}ms infinite` }} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div ref={threadEndRef} />
      </div>

      {/* undo */}
      {lastUndoable && !sending && (
        <div className="px-4 pb-1">
          <button onClick={undo}
            className="flex items-center gap-1.5 text-xs font-medium text-white/50 active:text-white">
            <Undo2 size={14} /> Undo last change
          </button>
        </div>
      )}

      {/* input */}
      <div className="flex items-end gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <div className="flex flex-1 items-end gap-2 rounded-[22px] bg-white/[0.06] px-2 py-1.5 ring-1 ring-white/10 focus-within:ring-white/25">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Message the assistant…"
            className="max-h-28 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white placeholder-white/35 outline-none"
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white disabled:opacity-40 active:bg-blue-600"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes chat-dot {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
        }
      `}</style>
    </motion.div>
  );
}
