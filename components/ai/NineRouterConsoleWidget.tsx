"use client";

import { useEffect, useState, useTransition } from "react";
import { getAiGatewayLogsAction, clearAiGatewayLogsAction } from "@/app/actions";
import type { AiGatewayLog } from "@/lib/operations";

type Props = {
  initialLogs?: AiGatewayLog[];
  gatewayUrl?: string;
};

export function NineRouterConsoleWidget({
  initialLogs = [],
  gatewayUrl = "http://localhost:20128/v1",
}: Props) {
  const [logs, setLogs] = useState<AiGatewayLog[]>(initialLogs);
  const [isPending, startTransition] = useTransition();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = () => {
    startTransition(async () => {
      const res = await getAiGatewayLogsAction();
      if (res.success && Array.isArray(res.data)) {
        setLogs(res.data);
      }
    });
  };

  const handleClear = () => {
    startTransition(async () => {
      await clearAiGatewayLogsAction();
      setLogs([]);
    });
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const dashboardUrl = gatewayUrl.replace(/\/v1\/?$/, "");

  return (
    <div className="rounded-card border border-rule bg-surface shadow-sm overflow-hidden flex flex-col">
      {/* Header Terminal */}
      <div className="flex flex-wrap items-center justify-between border-b border-rule bg-slate-900 px-4 py-2.5 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="font-mono text-xs font-semibold tracking-wide text-slate-200">
            9Router Gateway Console Trace
          </span>
          <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
            Port 20128
          </span>
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

      {/* Terminal Output Log List */}
      <div className="h-44 overflow-y-auto bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            Belum ada aktivitas tercatat pada console gateway.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {logs.map((log) => {
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

                  {/* Status Badge */}
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

                  {/* Event Type */}
                  <span className="text-teal font-medium shrink-0">
                    {log.event}
                  </span>

                  {/* Model */}
                  <span className="text-purple-300 shrink-0">
                    [{log.model}]
                  </span>

                  {/* Latency & TPS */}
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

                  {/* Details snippet */}
                  <span className="text-slate-400 truncate max-w-[450px]">
                    {log.details}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
