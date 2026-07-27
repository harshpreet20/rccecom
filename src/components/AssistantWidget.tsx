"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Floating AI shopping/support assistant. Mounted once from the storefront's
 * root layout (src/app/layout.tsx). Since Next's root layout also wraps
 * /admin routes, this component explicitly hides itself there -- the admin
 * CRM must not get this widget.
 *
 * Plain React state, no chat UI library, to keep bundle size small.
 */

const SESSION_KEY = "rcc-assistant-session";

type Message = {
  role: "user" | "assistant";
  content: string;
  escalated?: { whatsappUrl: string; summary: string };
};

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function AssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // Admin CRM is a separate product surface -- no customer chat widget there.
  if (pathname?.startsWith("/admin")) return null;

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading || !sessionId) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "Sorry, I couldn't process that -- please try again.",
          escalated: data.escalated,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong reaching the assistant. Please try again." },
      ]);
    }
    setLoading(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div className="flex h-[min(70vh,32rem)] w-[min(92vw,22rem)] flex-col overflow-hidden rounded-2xl border border-rcc-line bg-rcc-panel shadow-2xl">
          <div className="flex items-center justify-between border-b border-rcc-line bg-rcc-green px-4 py-3">
            <div>
              <p className="text-sm font-black text-rcc-sand">RCC Assistant</p>
              <p className="text-xs text-rcc-lime">Shopping & order help</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="grid h-8 w-8 place-items-center rounded-full text-rcc-sand transition hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.length === 0 && (
              <p className="rounded-xl bg-rcc-panel2 px-3 py-2 text-sm text-rcc-mist">
                Hi! Ask me about sizing, shipping, a discount code, or your order status
                (have your order ID + phone number handy for order lookups).
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-rcc-leaf text-rcc-night"
                      : "bg-rcc-panel2 text-rcc-sand"
                  }`}
                >
                  {m.content}
                  {m.escalated && (
                    <a
                      href={m.escalated.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block rounded-full bg-rcc-gold px-3 py-1.5 text-center text-xs font-black text-rcc-night transition hover:bg-rcc-goldsoft"
                    >
                      Continue on WhatsApp →
                    </a>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl bg-rcc-panel2 px-3 py-2 text-sm text-rcc-mist">Typing…</div>
              </div>
            )}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-rcc-line p-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about sizing, shipping, an order…"
              maxLength={2000}
              className="flex-1 rounded-full border border-rcc-line bg-rcc-panel2 px-3 py-2 text-sm text-rcc-sand outline-none focus:border-rcc-leaf focus:ring-2 focus:ring-rcc-leaf/30"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-full bg-rcc-green px-4 py-2 text-sm font-bold text-rcc-sand transition hover:bg-rcc-leaf disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open shopping assistant"}
        className="grid h-14 w-14 place-items-center rounded-full bg-rcc-gold text-2xl text-rcc-night shadow-2xl transition hover:bg-rcc-goldsoft"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
