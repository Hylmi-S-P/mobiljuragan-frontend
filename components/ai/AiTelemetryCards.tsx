"use client";

import { useState } from "react";
import { checkAiGatewayHealthAction } from "@/app/actions";
import type { AiGatewayHealth } from "@/lib/operations";

type Props = {
  initialHealth: AiGatewayHealth;
  latestTps?: number;
};

const STATUS_MAP: Record<
  string,
  { label: string; badge: string; dot: string }
> = {
  HEALTHY: {
    label: "Terhubung & Siap",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
  },
  RATE_LIMITED: {
    label: "Batas Kuota Tercapai (429)",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500 animate-pulse",
  },
  DEGRADED: {
    label: "Akses Dibatasi (403)",
    badge: "bg-orange-50 text-orange-800 border-orange-200",
    dot: "bg-orange-500",
  },
  OFFLINE: {
    label: "Gateway Offline",
    badge: "bg-red-50 text-red-800 border-red-200",
    dot: "bg-red-500",
  },
};

export function AiTelemetryCards({ initialHealth, latestTps = 48.2 }: Props) {
  const [health, setHealth] = useState<AiGatewayHealth>(initialHealth);
  const [isPinging, setIsPinging] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const statusInfo = STATUS_MAP[health.healthStatus] || STATUS_MAP.OFFLINE;

  const handlePing = async () => {
    setIsPinging(true);
    setFeedback(null);
    try {
      const res = await checkAiGatewayHealthAction();
      if (res.success && res.data) {
        setHealth(res.data);
        setFeedback(`Ping sukses (${res.data.latencyMs}ms): ${res.data.message}`);
      } else {
        setFeedback(res.message || "Gagal menghubungi AI Gateway.");
      }
    } catch {
      setFeedback("Gagal menjalankan diagnostik gateway.");
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Kartu Telemetri 3 Kolom */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* 1. Model / Combo Aktif */}
        <div className="rounded-card border border-rule bg-surface p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-micro font-medium uppercase tracking-wider text-ink-soft">
              Model Aktif / Combo
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusInfo.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
              {statusInfo.label}
            </span>
          </div>
          <div className="mt-3">
            <p className="truncate text-lg font-bold text-ink" title={health.activeModel}>
              {health.activeModel}
            </p>
            <p className="mt-0.5 text-micro text-ink-soft">
              Target rute prompt ke port 20128
            </p>
          </div>
        </div>

        {/* 2. Latensi Respon Pertama */}
        <div className="rounded-card border border-rule bg-surface p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-micro font-medium uppercase tracking-wider text-ink-soft">
              Latensi Respon (TTFT)
            </span>
            <button
              type="button"
              onClick={handlePing}
              disabled={isPinging}
              className="text-micro font-medium text-teal hover:underline disabled:opacity-50"
              title="Periksa latensi gateway sekarang"
            >
              {isPinging ? "Mengukur..." : "↻ Ukur Ping"}
            </button>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums text-ink">
                {health.latencyMs}
              </span>
              <span className="text-sm font-medium text-ink-soft">ms</span>
            </div>
            <p className="mt-0.5 text-micro text-ink-soft">
              {health.latencyMs > 0 && health.latencyMs < 500
                ? "Jalur koneksi sangat cepat"
                : health.latencyMs === 0
                ? "Menunggu pengukuran rute"
                : "Respon rute terdeteksi normal"}
            </p>
          </div>
        </div>

        {/* 3. Kecepatan Menjawab (Token per second / TPS) */}
        <div className="rounded-card border border-rule bg-surface p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-micro font-medium uppercase tracking-wider text-ink-soft">
              Kecepatan Generasi
            </span>
            <span className="rounded bg-teal/10 px-1.5 py-0.5 text-micro font-semibold text-teal border border-teal/20">
              Live TPS
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums text-ink">
                {latestTps}
              </span>
              <span className="text-sm font-medium text-ink-soft">tok/s</span>
            </div>
            <p className="mt-0.5 text-micro text-ink-soft">
              Kecepatan rata-rata keluaran token
            </p>
          </div>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-md border border-rule/80 bg-canvas/70 px-3.5 py-2 text-micro text-ink flex items-center justify-between">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs text-ink-soft hover:text-ink ml-2"
          >
            ✕
          </button>
        </div>
      ) : null}
    </div>
  );
}
