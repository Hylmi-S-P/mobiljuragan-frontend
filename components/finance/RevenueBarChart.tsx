"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRupiah } from "@/lib/format";
import type { FinanceSummary } from "@/lib/operations";

type Props = {
  monthlyTrends: FinanceSummary["monthlyTrends"];
  weeklyBreakdown: FinanceSummary["weeklyBreakdown"];
};

/**
 * Grafik omzet 12 bulan terakhir.
 *
 * Klik satu batang untuk membuka rincian minggu pada bulan itu. Ini yang diminta
 * Ami poin 16: "grafik omzet tahun ini, klik bulan → detail mingguan".
 *
 * Bulan tanpa pemasukan tetap ditampilkan sebagai batang nol, bukan dihilangkan.
 * Kalau dihilangkan, grafik terbaca seolah datanya rusak, padahal memang belum
 * ada uang masuk di bulan tersebut.
 */
export function RevenueBarChart({ monthlyTrends, weeklyBreakdown }: Props) {
  const [bulanAktif, setBulanAktif] = useState<string | null>(null);

  const data = useMemo(
    () =>
      monthlyTrends.map((m) => ({
        label: m.shortLabel,
        labelPenuh: m.label,
        revenue: m.revenue,
        bookings: m.bookings,
      })),
    [monthlyTrends],
  );

  const rincianMinggu = useMemo(() => {
    if (!bulanAktif) return null;
    return weeklyBreakdown.find((w) => w.label === bulanAktif) ?? null;
  }, [bulanAktif, weeklyBreakdown]);

  const totalSetahun = data.reduce((acc, d) => acc + d.revenue, 0);
  const bulanTerbaik = data.reduce(
    (best, d) => (d.revenue > best.revenue ? d : best),
    data[0] ?? { label: "-", labelPenuh: "-", revenue: 0, bookings: 0 },
  );

  return (
    <div className="rounded-card border border-rule bg-surface p-5 shadow-xs">
      <div className="flex flex-col gap-1 border-b border-rule pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-subtitle font-bold text-ink">Omzet 12 Bulan Terakhir</h3>
          <p className="text-meta text-ink-soft">
            Klik salah satu batang untuk melihat rincian per minggu.
          </p>
        </div>
        <div className="text-right">
          <span className="block text-micro text-ink-soft">Total setahun</span>
          <span className="text-body font-bold text-ink tabular-nums">
            {formatRupiah(totalSetahun)}
          </span>
        </div>
      </div>

      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={64}
              tickFormatter={(v: number) =>
                v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)} jt` : v >= 1000 ? `${v / 1000} rb` : String(v)
              }
            />
            <Tooltip
              cursor={{ fill: "rgba(14,124,123,0.06)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof data)[number];
                return (
                  <div className="rounded-sm border border-rule bg-surface px-3 py-2 shadow-md">
                    <p className="text-micro font-semibold text-ink">{d.labelPenuh}</p>
                    <p className="text-meta text-ink-soft">
                      Omzet: <strong className="text-ink">{formatRupiah(d.revenue)}</strong>
                    </p>
                    <p className="text-meta text-ink-soft">
                      Transaksi lunas: <strong className="text-ink">{d.bookings}</strong>
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="revenue"
              radius={[4, 4, 0, 0]}
              onClick={(entry) => {
                const labelPenuh = (entry as unknown as { labelPenuh?: string })?.labelPenuh;
                if (!labelPenuh) return;
                setBulanAktif((current) => (current === labelPenuh ? null : labelPenuh));
              }}
              className="cursor-pointer"
            >
              {data.map((d) => (
                <Cell
                  key={d.labelPenuh}
                  fill={bulanAktif === d.labelPenuh ? "#0e7c7b" : d.revenue > 0 ? "#5eaaa9" : "#e2e8f0"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-micro text-ink-soft">
        Bulan terbaik: <strong className="text-ink">{bulanTerbaik.labelPenuh}</strong> dengan{" "}
        {formatRupiah(bulanTerbaik.revenue)} dari {bulanTerbaik.bookings} transaksi lunas.
      </p>

      {/* Rincian mingguan muncul setelah batang diklik */}
      {rincianMinggu ? (
        <div className="mt-4 rounded-sm border border-rule/60 bg-canvas/60 p-3">
          <div className="flex items-center justify-between">
            <h4 className="text-meta font-semibold text-ink">
              Rincian mingguan — {rincianMinggu.label}
            </h4>
            <button
              type="button"
              onClick={() => setBulanAktif(null)}
              className="text-micro font-medium text-navy hover:underline"
            >
              Tutup
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {rincianMinggu.minggu.map((m) => (
              <div key={m.label} className="rounded-sm border border-rule bg-surface px-2 py-1.5">
                <span className="block text-micro text-ink-soft">{m.label}</span>
                <span className="text-meta font-semibold text-ink tabular-nums">
                  {formatRupiah(m.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
