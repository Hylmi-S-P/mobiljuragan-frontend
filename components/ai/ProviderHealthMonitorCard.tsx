"use client";

import { useState } from "react";
import { checkAiGatewayHealthAction } from "@/app/actions";
import type { AiGatewayHealth } from "@/lib/operations";

type Props = {
  initialHealth: AiGatewayHealth;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; dotClass: string; description: string }
> = {
  HEALTHY: {
    label: "Terhubung & Siap",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dotClass: "bg-emerald-500",
    description: "Gateway merespons normal. Model aktif siap melayani obrolan pelanggan.",
  },
  RATE_LIMITED: {
    label: "Batas Kuota Tercapai (429)",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500 animate-pulse",
    description: "Upstream terkena batas kuota request. Sistem auto-fallback otomatis siaga.",
  },
  DEGRADED: {
    label: "Akses Dibatasi (403)",
    badgeClass: "bg-orange-50 text-orange-800 border-orange-200",
    dotClass: "bg-orange-500",
    description: "Akses upstream ditolak (FreeTier block / session invalid). Perlu rotasi session/key.",
  },
  OFFLINE: {
    label: "Gateway Tidak Terhubung",
    badgeClass: "bg-red-50 text-red-800 border-red-200",
    dotClass: "bg-red-500",
    description: "Server 9Router di port lokal belum berjalan atau rute tidak terjangkau.",
  },
};

export function ProviderHealthMonitorCard({ initialHealth }: Props) {
  const [health, setHealth] = useState<AiGatewayHealth>(initialHealth);
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentStatus = STATUS_CONFIG[health.healthStatus] || STATUS_CONFIG.OFFLINE;

  const handlePingHealth = async () => {
    setIsChecking(true);
    setFeedback(null);
    try {
      const res = await checkAiGatewayHealthAction();
      if (res.success && res.data) {
        setHealth(res.data);
        setFeedback(`Pemeriksaan selesai (${res.data.latencyMs}ms): ${res.data.message}`);
      } else {
        setFeedback(res.message || "Gagal memeriksa kesehatan gateway.");
      }
    } catch {
      setFeedback("Gagal menghubungi endpoint diagnostik server backend.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="rounded-card border border-rule bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-rule pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-body font-semibold text-ink">
              Pemantauan Kesehatan Gateway & Status Kuota
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-micro font-semibold border ${currentStatus.badgeClass}`}
            >
              <span className={`h-2 w-2 rounded-full ${currentStatus.dotClass}`} />
              {currentStatus.label}
            </span>
          </div>
          <p className="mt-0.5 text-meta text-ink-soft">
            Diagnostik latensi jaringan, deteksi dini pembatasan kuota (HTTP 429), dan kesiapan mitigasi failover.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePingHealth}
          disabled={isChecking}
          className="inline-flex items-center gap-2 rounded-button border border-rule bg-canvas px-3.5 py-1.5 text-meta font-medium text-ink transition-colors hover:bg-canvas-subtle disabled:opacity-50"
        >
          <span>{isChecking ? "Mengukur..." : "Periksa Status Sekarang"}</span>
          <span className="text-xs text-ink-soft">↻</span>
        </button>
      </div>

      {feedback ? (
        <div className="mt-4 rounded-md border border-rule/80 bg-canvas/60 p-3 text-meta text-ink">
          {feedback}
        </div>
      ) : null}

      {/* Grid Indikator Metrik Operasional */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Latensi Ping */}
        <div className="rounded-md border border-rule/60 bg-canvas/40 p-3.5">
          <span className="text-micro font-medium text-ink-soft uppercase tracking-wider">
            Latensi Respon
          </span>
          <p className="mt-1.5 text-xl font-bold tabular-nums text-ink">
            {health.latencyMs} <span className="text-sm font-normal text-ink-soft">ms</span>
          </p>
          <span className="text-micro text-ink-soft">
            {health.latencyMs < 500 ? "Kecepatan optimal" : "Respons moderat"}
          </span>
        </div>

        {/* Model Aktif Saat Ini */}
        <div className="rounded-md border border-rule/60 bg-canvas/40 p-3.5">
          <span className="text-micro font-medium text-ink-soft uppercase tracking-wider">
            Model Aktif
          </span>
          <p className="mt-1.5 truncate text-body font-bold text-ink" title={health.activeModel}>
            {health.activeModel}
          </p>
          <span className="text-micro text-ink-soft">Target rute permintaan primer</span>
        </div>

        {/* Dukungan Failover 9Router Combo */}
        <div className="rounded-md border border-rule/60 bg-canvas/40 p-3.5">
          <span className="text-micro font-medium text-ink-soft uppercase tracking-wider">
            Dukungan Failover
          </span>
          <p className="mt-1.5 truncate text-body font-bold text-teal">
            9Router Combo
          </p>
          <span className="text-micro text-emerald-700 font-medium">
            Otomatis di Gateway
          </span>
        </div>

        {/* Batasan Kuota Komunitas */}
        <div className="rounded-md border border-rule/60 bg-canvas/40 p-3.5">
          <span className="text-micro font-medium text-ink-soft uppercase tracking-wider">
            Plafon Kuota Rate-Limit
          </span>
          <p className="mt-1.5 text-body font-bold text-ink tabular-nums">
            ~15 Permintaan
          </p>
          <span className="text-micro text-ink-soft">Per jendela 5 menit (Gateway Tier)</span>
        </div>
      </div>

      {/* Catatan Teknis Arsitektur High-Availability */}
      <div className="mt-4 rounded-md border border-blue-200/80 bg-blue-50/50 p-4 text-meta text-ink leading-relaxed">
        <h3 className="font-semibold text-blue-900">
          Standar Operasional Distribusi Beban (AI Gateway & 9Router)
        </h3>
        <ul className="mt-1.5 list-disc pl-5 space-y-1 text-sm text-blue-950/80">
          <li>
            <strong>Batas Trafik Upstream:</strong> Provider upstream membatasi sekitar 10-20 permintaan per 5 menit untuk menjaga stabilitas. Beban obrolan intensif dapat memicu respons <code>HTTP 429</code> secara tiba-tiba.
          </li>
          <li>
            <strong>Distribusi Session &amp; Network Affinity:</strong> Gateway memverifikasi kombinasi alamat network context dan header sesi <code>x-session-id</code> untuk isolasi percakapan agar request terdistribusi merata.
          </li>
          <li>
            <strong>Mekanisme Combo 9Router:</strong> Anda dapat mengelompokkan model primer dan sekunder ke dalam satu Model Combo di 9Router. Saat model primer mengalami lonjakan traffic (HTTP 429), 9Router secara mandiri merotasi ke provider cadangan tanpa jeda.
          </li>
        </ul>
      </div>
    </div>
  );
}
