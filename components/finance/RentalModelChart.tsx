"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatRupiah } from "@/lib/format";
import type { FinanceSummary } from "@/lib/operations";

type Props = {
  rentalTypes: NonNullable<FinanceSummary["rentalTypes"]>;
};

const WARNA = {
  withoutDriver: "#1e3a5f",
  withDriver: "#0d9488",
};

/**
 * Perbandingan model sewa: lepas kunci dan dengan supir.
 *
 * Angkanya dihitung dari pembayaran yang sudah lunas, sama seperti omzet total
 * di kartu ringkasan. Kalau dihitung dari status pesanan selesai, donut bisa
 * menampilkan omzet yang tidak cocok dengan kartu di atasnya.
 *
 * Transaksi nol tetap ditampilkan sebagai bagian tersendiri supaya admin tahu
 * model mana yang belum pernah dipakai, bukan mengira datanya hilang.
 */
export function RentalModelChart({ rentalTypes }: Props) {
  const data = useMemo(
    () => [
      {
        kunci: "withoutDriver" as const,
        label: "Lepas Kunci",
        revenue: rentalTypes.withoutDriver.revenue,
        count: rentalTypes.withoutDriver.count,
        percentage: rentalTypes.withoutDriver.percentage,
        warna: WARNA.withoutDriver,
      },
      {
        kunci: "withDriver" as const,
        label: "Dengan Supir",
        revenue: rentalTypes.withDriver.revenue,
        count: rentalTypes.withDriver.count,
        percentage: rentalTypes.withDriver.percentage,
        warna: WARNA.withDriver,
      },
    ],
    [rentalTypes],
  );

  const totalOmzet = data.reduce((jumlah, d) => jumlah + d.revenue, 0);
  const totalTransaksi = data.reduce((jumlah, d) => jumlah + d.count, 0);

  /* Donut butuh minimal satu bagian bernilai. Kalau semua nol, grafiknya kosong
     dan Recharts menggambar lingkaran penuh tanpa arti, jadi diganti keterangan. */
  const adaData = totalOmzet > 0 || totalTransaksi > 0;

  return (
    <div className="rounded-card border border-rule bg-surface p-5 shadow-xs">
      <div className="flex flex-col gap-1 border-b border-rule pb-3">
        <h3 className="text-subtitle font-bold text-ink">Model Sewa</h3>
        <p className="text-meta text-ink-soft">
          Perbandingan omzet lepas kunci dan dengan supir dari pembayaran lunas.
        </p>
      </div>

      {adaData ? (
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
          <div className="h-56 w-full max-w-[260px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="revenue"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={88}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.map((d) => (
                    <Cell key={d.kunci} fill={d.warna} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as (typeof data)[number];
                    return (
                      <div className="rounded-sm border border-rule bg-surface px-3 py-2 shadow-md">
                        <p className="text-micro font-semibold text-ink">{d.label}</p>
                        <p className="text-meta text-ink-soft">
                          Omzet: <strong className="text-ink">{formatRupiah(d.revenue)}</strong>
                        </p>
                        <p className="text-meta text-ink-soft">
                          Transaksi lunas: <strong className="text-ink">{d.count}</strong>
                        </p>
                        <p className="text-meta text-ink-soft">
                          Porsi: <strong className="text-ink">{d.percentage}%</strong>
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="w-full space-y-3">
            {data.map((d) => (
              <li
                key={d.kunci}
                className="rounded-sm border border-rule px-3 py-2.5"
                style={{ borderLeftWidth: 3, borderLeftColor: d.warna }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-meta font-semibold text-ink">{d.label}</span>
                  <span className="text-body font-bold tabular-nums text-ink">
                    {d.percentage}%
                  </span>
                </div>
                <p className="mt-0.5 text-meta tabular-nums text-ink-soft">
                  {formatRupiah(d.revenue)} · {d.count} transaksi lunas
                </p>
              </li>
            ))}
            <li className="flex items-baseline justify-between gap-2 border-t border-rule pt-2.5 text-meta text-ink-soft">
              <span>Total</span>
              <span className="tabular-nums font-semibold text-ink">
                {formatRupiah(totalOmzet)} · {totalTransaksi} transaksi
              </span>
            </li>
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-meta text-ink-soft">
          Belum ada pembayaran lunas, jadi perbandingan model sewa belum bisa dihitung.
        </p>
      )}
    </div>
  );
}
