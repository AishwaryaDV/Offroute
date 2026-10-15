"use client";

import { Send, Sparkles, Trash2, Undo2, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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

export function ChatSheet({ circuitId, circuitTitle, open, onClose, onWrite }: ChatSheetProps) {
  const [messages, setMessages] = useState<ChatHistoryMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    getChatHistory(circuitId).then(setMessages).catch(() => {});
  }, [open, circuitId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    const optimistic: ChatHistoryMessage = {
      id: `tmp-${Date.now()}`, role: "user", content: text, has_undo: false,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      const res = await sendChatMessage(circuitId, text, TZ);
      setMessages((m) => [
        ...m,
        {
          id: res.message_id, role: "assistant", content: res.reply,
          has_undo: res.writes, created_at: new Date().toISOString(),
        },
      ]);
      if (res.writes) onWrite();
    } catch {
      toast.error("Assistant couldn't respond — try again.");
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
    <div className="fixed inset-0 z-[60] flex items-end">
      <button aria-label="Close" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="relative z-10 flex h-[82dvh] w-full flex-col rounded-t-[28px] bg-white"
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#0f1d32]" />
            <div>
              <p className="text-sm font-bold text-[#0f1d32] leading-none">Ask AI</p>
              <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[55vw]">{circuitTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={clear} aria-label="Clear chat"
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 active:bg-gray-100">
                <Trash2 size={17} />
              </button>
            )}
            <button onClick={onClose} aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 active:bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && !sending && (
            <div className="flex h-full flex-col items-center justify-center text-center px-6">
              <Sparkles size={26} className="text-gray-300 mb-3" />
              <p className="text-sm text-gray-400 max-w-[16rem]">
                Log and edit this circuit by typing — e.g. &ldquo;Add Toit in Indiranagar, drinks, 5 stars.&rdquo;
              </p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-[#0f1d32] text-white"
                    : "bg-[#f1f2f4] text-[#0f1d32]"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-[#f1f2f4] px-3.5 py-2.5 text-sm text-gray-400">…</div>
            </div>
          )}
        </div>

        {/* undo bar */}
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
            className="flex-1 resize-none rounded-2xl bg-gray-100 px-4 py-3 text-sm text-[#0f1d32] placeholder-gray-400 outline-none ring-1 ring-transparent focus:ring-blue-400 max-h-28"
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0f1d32] text-white disabled:opacity-40 active:bg-[#162a46]"
          >
            <Send size={18} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
