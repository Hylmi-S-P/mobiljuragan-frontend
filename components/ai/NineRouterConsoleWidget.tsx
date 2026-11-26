"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { clearAiGatewayLogsAction } from "@/app/actions";
import { apiClient } from "@/lib/axios";
import type { AiGatewayLog, AiGatewayLogData } from "@/lib/operations";

type Props = {
  initialLogs?: AiGatewayLog[];
  initialRawLogs?: string[];
  gatewayUrl?: string;
  isActive?: boolean;
};

function isSameRawLogs(prev: string[], next: string[]): boolean {
  if (prev.length !== next.length) return false;
  if (prev.length === 0) return true;
  return prev[0] === next[0] && prev[prev.length - 1] === next[next.length - 1];
}

function isSameHttpLogs(prev: AiGatewayLog[], next: AiGatewayLog[]): boolean {
  if (prev.length !== next.length) return false;
  if (prev.length === 0) return true;
  return (
    prev[0]?.id === next[0]?.id &&
    prev[prev.length - 1]?.id === next[next.length - 1]?.id
  );
}

export function NineRouterConsoleWidget({
  initialLogs = [],
  initialRawLogs = [],
  gatewayUrl = "http://localhost:20128/v1",
  isActive = true,
}: Props) {
  const [activeTab, setActiveTab] = useState<"engine" | "http">("engine");
  const [httpLogs, setHttpLogs] = useState<AiGatewayLog[]>(initialLogs);
  const [rawLogs, setRawLogs] = useState<string[]>(initialRawLogs);
  const [isPending, startTransition] = useTransition();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  const loadLogs = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiClient.get("/admin/ai/logs", { signal });
      const payload = res.data?.data as AiGatewayLogData | AiGatewayLog[] | undefined;
      if (!payload) return;

      const nextHttp = Array.isArray(payload) ? payload : payload.httpLogs || [];
      const nextRaw = Array.isArray(payload) ? [] : payload.rawLogs;

      setHttpLogs((prev) => (isSameHttpLogs(prev, nextHttp) ? prev : nextHttp));
      if (Array.isArray(nextRaw)) {
        setRawLogs((prev) => (isSameRawLogs(prev, nextRaw) ? prev : nextRaw));
      }
    } catch {
      // Kegagalan polling dibiarkan tenang atau terbatalkan saat unmount/tab berpindah.
    }
  }, []);

  const fetchLogs = () => {
    startTransition(async () => {
      await loadLogs();
    });
  };

  const handleClear = () => {
    startTransition(async () => {
      await clearAiGatewayLogsAction();
      setHttpLogs([]);
      setRawLogs([]);
    });
  };

  useEffect(() => {
    if (!autoRefresh || !isActive) return;

    let activeController: AbortController | null = null;
    const poll = () => {
      if (document.visibilityState !== "visible") return;
      activeController?.abort();
      activeController = new AbortController();
      void loadLogs(activeController.signal);
    };

    const interval = window.setInterval(poll, 5000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        poll();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      activeController?.abort();
    };
  }, [autoRefresh, isActive, loadLogs]);

  // Scroll internal box terminal ke baris terbawah TANPA menggeser scroll window halaman utama
  useEffect(() => {
    if (activeTab === "engine" && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [rawLogs, activeTab]);

  const dashboardUrl = gatewayUrl.replace(/\/v1\/?$/, "");

  // Helper pewarnaan baris terminal ala 9Router Web UI
  const renderColoredLine = (line: string, idx: number) => {
    let colorClass = "text-slate-300";
    if (line.includes("ERROR") || line.includes("failed")) {
      colorClass = "text-red-400";
    } else if (line.includes("DONE")) {
      colorClass = "text-emerald-400 font-semibold";
    } else if (line.includes("POST")) {
      colorClass = "text-green-300";
    } else if (line.includes("[COMBO]")) {
      colorClass = "text-cyan-300";
    } else if (line.includes("[CHAT]")) {
      colorClass = "text-blue-300";
    } else if (line.includes("CAVEMAN") || line.includes("PONYTAIL")) {
      colorClass = "text-purple-300";
    } else if (line.includes("⚠️") || line.includes("Rate limit")) {
      colorClass = "text-amber-300";
    }

    return (
      <div key={idx} className="whitespace-pre-wrap break-all leading-tight font-mono py-0.5">
        <span className={colorClass}>{line}</span>
      </div>
    );
  };

  return (
    <div className="rounded-card border border-rule bg-surface shadow-sm overflow-hidden flex flex-col">
      {/* Header Terminal */}
      <div className="flex flex-wrap items-center justify-between border-b border-rule bg-slate-900 px-4 py-2 text-white">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="font-mono text-xs font-semibold tracking-wide text-slate-200">
            9Router Gateway Console Trace
          </span>

          {/* Tab Selector: Live Engine vs HTTP Audit */}
          <div className="flex items-center rounded bg-slate-800 p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setActiveTab("engine")}
              className={`rounded px-2 py-0.5 transition-colors ${
                activeTab === "engine"
                  ? "bg-teal text-white font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Engine Console ({rawLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("http")}
              className={`rounded px-2 py-0.5 transition-colors ${
                activeTab === "http"
                  ? "bg-teal text-white font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Audit HTTP ({httpLogs.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          <label className="flex items-center gap-1.5 text-micro text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded accent-teal text-teal h-3 w-3"
            />
            <span>Auto (5s)</span>
          </label>

          <button
            type="button"
            onClick={fetchLogs}
            disabled={isPending}
            className="rounded bg-slate-800 px-2 py-0.5 text-micro font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            title="Muat ulang log sekarang"
          >
            ↻ Refresh
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={isPending}
            className="rounded bg-slate-800 px-2 py-0.5 text-micro font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            title="Bersihkan riwayat log"
          >
            Bersihkan
          </button>

          <a
            href={dashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded bg-teal px-2 py-0.5 text-micro font-medium text-white hover:bg-teal-hover transition-colors"
          >
            <span>Web UI</span>
            <span className="text-[10px]">↗</span>
          </a>
        </div>
      </div>

      {/* Terminal View */}
      <div
        ref={terminalContainerRef}
        className="h-56 overflow-y-auto bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300"
      >
        {activeTab === "engine" ? (
          // Tab 1: Live Engine Console Log (persis tampilan 9Router Web UI)
          rawLogs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-500">
              Belum ada log server yang tercatat dari engine 9Router.
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {rawLogs.map((line, i) => renderColoredLine(line, i))}
            </div>
          )
        ) : (
          // Tab 2: HTTP Audit Trace
          httpLogs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-500">
              Belum ada transaksi HTTP tercatat.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {httpLogs.map((log) => {
                const timeStr = new Date(log.timestamp).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });

                const isSuccess = log.status >= 200 && log.status < 300;
                const isWarning = log.status === 429;

                return (
                  <div
                    key={log.id}
                    className="flex flex-wrap items-baseline gap-2 rounded px-1.5 py-0.5 hover:bg-slate-900/60"
                  >
                    <span className="text-slate-500 shrink-0">[{timeStr}]</span>

                    <span
                      className={`rounded px-1 text-[10px] font-bold shrink-0 ${
                        isSuccess
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : isWarning
                          ? "bg-amber-950 text-amber-400 border border-amber-800"
                          : "bg-red-950 text-red-400 border border-red-800"
                      }`}
                    >
                      HTTP {log.status || 0}
                    </span>

                    <span className="text-teal font-medium shrink-0">
                      {log.event}
                    </span>

                    <span className="text-purple-300 shrink-0">
                      [{log.model}]
                    </span>

                    {log.latencyMs ? (
                      <span className="text-amber-300/90 tabular-nums shrink-0">
                        {log.latencyMs}ms
                      </span>
                    ) : null}

                    {log.tokensPerSecond ? (
                      <span className="text-cyan-300 tabular-nums shrink-0">
                        {log.tokensPerSecond} tok/s
                      </span>
                    ) : null}

                    <span className="text-slate-400 truncate max-w-[450px]">
                      {log.details}
                    </span>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
