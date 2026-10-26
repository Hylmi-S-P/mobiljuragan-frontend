"use client";

import { useMemo } from "react";
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
  yearOverYear: FinanceSummary["yearOverYear"];
};

/**
 * Grafik perbandingan omzet tahun ke tahun (4 tahun terakhir).
 *
 * Sengaja tanpa rincian bulanan. Halimah paragraf 33 menyatakan tujuannya hanya
 * melihat beda antar tahun: "ga perlu detail sampe ke per bulan nya jg ada,
 * karna kan fungsi chart ini cm pengen tau bedanya dari tahun tahun sebelumnya".
 */
export function YearOverYearChart({ yearOverYear }: Props) {
  const data = useMemo(
    () =>
      yearOverYear.map((y) => ({
        label: String(y.tahun),
        tahun: y.tahun,
        revenue: y.revenue,
        bookings: y.bookings,
      })),
    [yearOverYear],
  );

  /* Tahun terakhir dengan omzet dipakai sebagai pembanding, bukan tahun berjalan.
     Kalau memakai tahun berjalan yang masih nol, persentasenya jadi tidak berarti. */
  const tahunBeromzet = data.filter((d) => d.revenue > 0);
  const tahunTerakhir = tahunBeromzet[tahunBeromzet.length - 1] ?? null;
  const tahunSebelumnya =
    tahunBeromzet.length > 1 ? tahunBeromzet[tahunBeromzet.length - 2] : null;

  const selisih =
    tahunTerakhir && tahunSebelumnya && tahunSebelumnya.revenue > 0
      ? Math.round(((tahunTerakhir.revenue - tahunSebelumnya.revenue) / tahunSebelumnya.revenue) * 100)
      : null;

  return (
    <div className="rounded-card border border-rule bg-surface p-5 shadow-xs">
      <div className="flex flex-col gap-1 border-b border-rule pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-subtitle font-bold text-ink">Perbandingan Tahun ke Tahun</h3>
          <p className="text-meta text-ink-soft">
            Total omzet per tahun, {data.length} tahun terakhir.
          </p>
        </div>
        {selisih !== null ? (
          <div className="text-right">
            <span className="block text-micro text-ink-soft">
              {tahunTerakhir!.tahun} vs {tahunSebelumnya!.tahun}
            </span>
            <span
              className={`text-body font-bold tabular-nums ${
                selisih > 0 ? "text-emerald-600" : selisih < 0 ? "text-danger" : "text-ink-soft"
              }`}
            >
              {selisih > 0 ? "+" : ""}
              {selisih}%
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#64748b" }}
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
              cursor={{ fill: "rgba(30,58,95,0.06)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof data)[number];
                return (
                  <div className="rounded-sm border border-rule bg-surface px-3 py-2 shadow-md">
                    <p className="text-micro font-semibold text-ink">Tahun {d.tahun}</p>
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
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.tahun} fill={d.revenue > 0 ? "#1e3a5f" : "#e2e8f0"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {tahunBeromzet.length === 0 ? (
        <p className="mt-2 text-micro text-ink-soft">
          Belum ada omzet tercatat pada {data.length} tahun terakhir.
        </p>
      ) : null}
    </div>
  );
}
