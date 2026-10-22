"use client";

import { useState } from "react";
import { testAiChatAction } from "@/app/actions";
import { IconChat, IconSparkles } from "@/components/ui/icons";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelUsed?: string;
  latencyMs?: number;
  tokensPerSecond?: number;
  tokens?: number | null;
  referencedDocuments?: string[];
  intent?: "RENTAL_FAQ" | "ORDER_TRACKING" | "EMERGENCY_INCIDENT" | "HARMFUL_OUT_OF_SCOPE";
  confidence?: number;
  reasoning?: string;
  guardrailSource?: "ai_classifier" | "rule_fallback";
  bypassedRag?: boolean;
};

type Props = {
  initialTemperature?: number;
  initialMaxTokens?: number;
};

const SUGGESTIONS = [
  "Apa saja syarat sewa lepas kunci Innova?",
  "Berapa sewa harian Fortuner ke Distrik Sota?",
  "Tolong mobil saya mogok di jalan poros Kurik!",
  "Cek status pesanan #BKG-1002",
  "Tuliskan script exploit python database!",
];

export function AiChatSandbox({
  initialTemperature = 0.7,
  initialMaxTokens = 1200,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Halo! Saya adalah Sandbox Asisten Virtual MobilJuragan Merauke. Ketik pertanyaan seputar rental, armada, atau rute untuk menguji model AI dan dokumen basis pengetahuan (RAG) yang sedang aktif.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: "user-" + Date.now(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .slice(-4)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await testAiChatAction(text, history);

      if (res.data) {
        const botMsg: Message = {
          id: "bot-" + Date.now(),
          role: "assistant",
          content: res.data.reply,
          modelUsed: res.data.modelUsed,
          latencyMs: res.data.latencyMs,
          tokensPerSecond: res.data.tokensPerSecond,
          tokens: res.data.tokens,
          referencedDocuments: res.data.referencedDocuments,
          intent: res.data.intent,
          confidence: res.data.confidence,
          reasoning: res.data.reasoning,
          guardrailSource: res.data.guardrailSource,
          bypassedRag: res.data.bypassedRag,
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: "err-" + Date.now(),
            role: "assistant",
            content: "Maaf, terjadi galat saat menghubungi AI gateway.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: "Tidak dapat menghubungi server backend.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Percakapan telah direset. Silakan ketik pertanyaan pengujian baru untuk AI Router.",
      },
    ]);
  };

  return (
    <div className="rounded-card border border-rule bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-rule pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-white">
            <IconChat className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-body font-semibold text-ink">
              Test Chat Sandbox (Live Model &amp; RAG Simulator)
            </h2>
            <p className="text-meta text-ink-soft">
              Uji coba respons asisten AI secara interaktif dengan basis pengetahuan RAG resmi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-button border border-rule bg-canvas px-3 py-1.5 text-meta font-medium text-ink hover:bg-canvas-subtle"
          >
            Reset
          </button>
        </div>
      </div>


      {/* Suggestion Chips */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-micro font-medium text-ink-soft">Saran Pengujian:</span>
        {SUGGESTIONS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => sendMessage(item)}
            disabled={loading}
            className="rounded-full border border-rule bg-canvas px-3 py-1 text-micro font-medium text-ink transition-colors hover:border-teal hover:text-teal disabled:opacity-50"
          >
            {item}
          </button>
        ))}
      </div>

      {/* Chat Thread */}
      <div className="mt-4 flex h-[360px] flex-col gap-3 overflow-y-auto rounded-md border border-rule/70 bg-canvas/40 p-4">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-body leading-relaxed shadow-xs ${
                  isUser
                    ? "bg-navy text-white rounded-br-xs"
                    : "bg-surface border border-rule text-ink rounded-bl-xs"
                }`}
              >
                {!isUser ? (
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-rule/50 pb-1.5">
                    <div className="flex items-center gap-1.5 text-micro font-semibold text-teal">
                      <IconSparkles className="h-3.5 w-3.5" />
                      <span>MobilJuragan AI Assistant</span>
                    </div>

                    {msg.intent ? (
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          msg.intent === "EMERGENCY_INCIDENT"
                            ? "bg-rose-50 text-rose-700 border-rose-300 animate-pulse"
                            : msg.intent === "HARMFUL_OUT_OF_SCOPE"
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : msg.intent === "ORDER_TRACKING"
                            ? "bg-sky-50 text-sky-700 border-sky-300"
                            : "bg-emerald-50 text-emerald-700 border-emerald-300"
                        }`}
                        title={
                          msg.reasoning
                            ? `Alasan: ${msg.reasoning} (${msg.guardrailSource ?? "guardrail"})`
                            : undefined
                        }
                      >
                        <span>
                          {msg.intent === "EMERGENCY_INCIDENT" && "🚨"}
                          {msg.intent === "HARMFUL_OUT_OF_SCOPE" && "🛡️"}
                          {msg.intent === "ORDER_TRACKING" && "📦"}
                          {msg.intent === "RENTAL_FAQ" && "📋"}
                        </span>
                        <span>{msg.intent}</span>
                        {msg.confidence !== undefined ? (
                          <span className="opacity-80 font-mono text-[10px]">
                            ({Math.round(msg.confidence * 100)}%)
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="whitespace-pre-line text-sm">{msg.content}</div>

                {/* Metadata Badges: Model, Latency, TPS, RAG / Bypass status */}
                {!isUser && msg.modelUsed ? (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-rule/60 pt-2 text-[11px] text-ink-soft">
                    <span className="font-mono bg-canvas px-1.5 py-0.5 rounded border border-rule/80">
                      Model: {msg.modelUsed}
                    </span>
                    {msg.latencyMs ? (
                      <span className="tabular-nums">⏱ {msg.latencyMs}ms</span>
                    ) : null}
                    {msg.tokensPerSecond ? (
                      <span className="tabular-nums font-semibold text-teal">
                        ⚡ {msg.tokensPerSecond} tok/s
                      </span>
                    ) : null}
                    {msg.bypassedRag ? (
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700 border border-rose-200">
                        ⚡ RAG Bypassed (Respon Cepat)
                      </span>
                    ) : msg.referencedDocuments && msg.referencedDocuments.length > 0 ? (
                      <span
                        className="rounded bg-teal/10 px-1.5 py-0.5 font-medium text-teal border border-teal/20"
                        title={msg.referencedDocuments.join(", ")}
                      >
                        📚 Rujukan: {msg.referencedDocuments.slice(0, 2).join(", ")}
                        {msg.referencedDocuments.length > 2
                          ? ` (+${msg.referencedDocuments.length - 2} lainnya)`
                          : ""}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {loading ? (
          <div className="flex items-start">
            <div className="rounded-2xl rounded-bl-xs border border-rule bg-surface px-4 py-3 shadow-xs">
              <div className="flex items-center gap-2 text-micro text-teal">
                <span className="h-2 w-2 rounded-full bg-teal animate-ping" />
                <span>AI sedang berpikir &amp; menyusun konteks RAG...</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanyakan hal seputar rental armada, tarif, atau ketentuan rute..."
          disabled={loading}
          className="flex-1 rounded-button border border-rule bg-white px-3.5 py-2.5 text-body text-ink outline-none focus:border-teal focus:ring-1 focus:ring-teal disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-button bg-teal px-5 py-2.5 text-body font-semibold text-white transition-colors hover:bg-teal-hover disabled:opacity-50"
        >
          Kirim
        </button>
      </form>
    </div>
  );
}
