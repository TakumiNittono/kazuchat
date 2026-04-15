"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  getAnonId,
  getCurrentSessionId,
  setCurrentSessionId,
} from "@/lib/anonId";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SAMPLE_QUESTIONS = [
  "How do I say \"thank you very much\" politely in Japanese?",
  "Explain the difference between は and が with examples.",
  "Teach me 5 essential verbs for beginners.",
  "What does 大丈夫 mean and how is it used?",
];

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export default function ChatView() {
  const [anonId, setAnonId] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const id = getAnonId();
    setAnonId(id);
    const savedSession = getCurrentSessionId();
    if (savedSession) {
      setSessionId(savedSession);
      fetch(
        `/api/sessions/${savedSession}/messages?anonUserId=${encodeURIComponent(id)}`,
      )
        .then((r) => (r.ok ? r.json() : Promise.reject(r)))
        .then((data: { messages: Message[] }) => {
          setMessages(
            data.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
            })),
          );
        })
        .catch(() => {
          setCurrentSessionId(null);
          setSessionId(null);
        });
    }
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const startNewChat = useCallback(() => {
    setCurrentSessionId(null);
    setSessionId(null);
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || sending || !anonId) return;

      setError(null);
      setInput("");

      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: message,
      };
      const assistantMsg: Message = {
        id: uid(),
        role: "assistant",
        content: "",
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setSending(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anonUserId: anonId,
            sessionId,
            message,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`status ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamDone = false;

        while (!streamDone) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const json = line.slice(5).trim();
            if (!json) continue;
            try {
              const evt = JSON.parse(json) as
                | { type: "session"; sessionId: string }
                | { type: "delta"; delta: string }
                | { type: "error"; message: string }
                | { type: "done" };

              if (evt.type === "session") {
                setSessionId(evt.sessionId);
                setCurrentSessionId(evt.sessionId);
              } else if (evt.type === "delta") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: m.content + evt.delta }
                      : m,
                  ),
                );
              } else if (evt.type === "error") {
                setError(evt.message);
                streamDone = true;
              } else if (evt.type === "done") {
                streamDone = true;
              }
            } catch (err) {
              console.error("parse sse chunk", err);
            }
          }
        }
      } catch (err) {
        console.error(err);
        setError("送信に失敗しました。もう一度お試しください。");
        setMessages((prev) =>
          prev.filter((m) => m.id !== assistantMsg.id),
        );
      } finally {
        setSending(false);
      }
    },
    [anonId, sessionId, sending],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const showEmpty = useMemo(() => messages.length === 0, [messages]);

  return (
    <div className="flex-1 flex flex-col h-[100dvh] bg-slate-50">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 safe-top">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-900 font-semibold"
        >
          <span className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center text-sm font-bold">
            日
          </span>
          <span>Nihongo Tutor</span>
        </Link>
        <button
          onClick={startNewChat}
          className="text-sm text-sky-600 hover:text-sky-700 font-medium"
        >
          New chat
        </button>
      </header>

      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth"
      >
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
          {showEmpty ? (
            <EmptyState
              onPick={(q) => {
                setInput(q);
                textareaRef.current?.focus();
              }}
            />
          ) : null}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {sending &&
          messages[messages.length - 1]?.role === "assistant" &&
          !messages[messages.length - 1]?.content ? (
            <TypingIndicator />
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200 bg-white px-3 pt-3 safe-bottom"
      >
        <div className="w-full max-w-2xl mx-auto flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoGrow(e.currentTarget);
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about Japanese…"
            className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="h-12 w-12 shrink-0 rounded-2xl bg-sky-500 text-white flex items-center justify-center disabled:bg-slate-300 transition-colors"
            aria-label="Send"
          >
            <SendIcon />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-2">
          Enter to send · Shift+Enter for newline
        </p>
      </form>

    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 mt-10 mb-2">
      <div className="w-14 h-14 rounded-2xl bg-sky-500 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-sky-500/30">
        日
      </div>
      <div>
        <h2 className="text-xl font-semibold">What do you want to learn today?</h2>
        <p className="text-slate-500 text-sm mt-1">
          Ask in English, Japanese, or any language.
        </p>
      </div>
      <div className="w-full flex flex-col gap-2">
        {SAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onPick(q)}
            className="w-full text-left rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 px-4 py-3 text-sm text-slate-700 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "bg-sky-500 text-white rounded-br-md"
            : "bg-white border border-slate-200 text-slate-900 rounded-bl-md"
        }`}
      >
        {message.content || (isUser ? "" : <Cursor />)}
      </div>
    </div>
  );
}

function Cursor() {
  return (
    <span className="inline-block w-1.5 h-4 bg-slate-400 align-middle animate-pulse" />
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
        <span className="typing-dot w-1.5 h-1.5 bg-slate-400 rounded-full" />
        <span className="typing-dot w-1.5 h-1.5 bg-slate-400 rounded-full" />
        <span className="typing-dot w-1.5 h-1.5 bg-slate-400 rounded-full" />
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
    </svg>
  );
}
