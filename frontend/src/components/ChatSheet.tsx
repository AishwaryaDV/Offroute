"use client";

import { Send, Sparkles, Undo2, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  ChatHistoryMessage,
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

// Static, local-only — not persisted or counted as history. Rendered above
// the real thread every time, so it never looks like it "replaced" anything.
const GREETING = [
  "Hi, I'm Astra.",
  "I can log and edit this circuit by chat — try “Add Toit in Indiranagar, drinks, 5 stars”, or ask “how many 5-star spots do I have?”",
];

function Avatar({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[#0f1d32] text-white"
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
  // Guards the initial history fetch below from clobbering state with a
  // stale snapshot if it resolves after the user has already sent a message
  // (the fetch can take a while over the tunnel; sending doesn't wait for it).
  const sentRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    sentRef.current = false;
    getChatHistory(circuitId).then((h) => {
      if (!sentRef.current) setMessages(h);
    }).catch(() => {});
  }, [open, circuitId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    sentRef.current = true;
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
          : "Astra couldn't respond — try again.",
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

  if (!open) return null;

  const lastUndoable = [...messages].reverse().find((m) => m.role === "assistant" && m.has_undo);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex h-[80dvh] w-full flex-col rounded-t-3xl bg-white text-[#0f1d32]"
      >
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* header */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 pb-3 pt-1">
          <Avatar size={36} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-none">Astra</p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.15)]" />
              <span className="truncate">{circuitTitle}</span>
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f6f8] text-gray-600 active:bg-gray-200">
            <X size={18} />
          </button>
        </div>

        {/* thread */}
        <div className="flex-1 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
          <div className="space-y-3">
            {GREETING.map((line, i) => (
              <div key={i} className="flex items-start gap-2.5">
                {i === 0 && <Avatar size={28} />}
                {i > 0 && <div className="w-7 shrink-0" />}
                <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-[#f5f6f8] px-3.5 py-2.5 text-sm text-[#0f1d32]">
                  {line}
                </div>
              </div>
            ))}
            {messages.map((m) => (
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-[#0f1d32] px-3.5 py-2.5 text-sm text-white">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-2.5">
                  <Avatar size={28} />
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tl-md bg-[#f5f6f8] px-3.5 py-2.5 text-sm text-[#0f1d32]">
                    {m.content}
                  </div>
                </div>
              )
            ))}
            {sending && (
              <div className="flex items-start gap-2.5">
                <Avatar size={28} />
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-[#f5f6f8] px-4 py-3.5">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 rounded-full bg-gray-400"
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
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 active:text-[#0f1d32]">
              <Undo2 size={14} /> Undo last change
            </button>
          </div>
        )}

        {/* input */}
        <div className="flex items-end gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          <div className="flex flex-1 items-end gap-2 rounded-[22px] bg-[#f5f6f8] px-2 py-1.5 ring-1 ring-gray-200 focus-within:ring-[#0f1d32]">
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
              placeholder="Message Astra…"
              className="max-h-28 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[#0f1d32] placeholder-gray-400 outline-none"
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f1d32] text-white disabled:opacity-40 active:bg-[#162a46]"
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
    </div>
  );
}
