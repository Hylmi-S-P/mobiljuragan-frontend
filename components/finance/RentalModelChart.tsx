"use client";

import { memo, useMemo } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { formatRupiah } from "@/lib/format";
import type { FinanceSummary } from "@/lib/operations";

type Props = {
  rentalTypes: NonNullable<FinanceSummary["rentalTypes"]>;
  periodeLabel?: string;
};

const WARNA = {
  withoutDriver: "#1e3a5f",
  withDriver: "#0d9488",
};

/**
 * Perbandingan model sewa: lepas kunci dan dengan supir.
 *
 * Angkanya dihitung dari pembayaran yang sudah lunas, sama seperti pemasukan total
 * di kartu ringkasan. Kalau dihitung dari status pesanan selesai, donut bisa
 * menampilkan pemasukan yang tidak cocok dengan kartu di atasnya.
 *
 * Transaksi nol tetap ditampilkan sebagai bagian tersendiri supaya admin tahu
 * model mana yang belum pernah dipakai, bukan mengira datanya hilang.
 */
export const RentalModelChart = memo(function RentalModelChart({
  rentalTypes,
  periodeLabel,
}: Props) {
  const data = useMemo(
    () => [
      {
        kunci: "withoutDriver" as const,
        label: "Lepas Kunci",
        revenue: rentalTypes.withoutDriver.revenue,
        count: rentalTypes.withoutDriver.count,
        feeCount: rentalTypes.withoutDriver.feeCount ?? 0,
        percentage: rentalTypes.withoutDriver.percentage,
        warna: WARNA.withoutDriver,
      },
      {
        kunci: "withDriver" as const,
        label: "Dengan Supir",
        revenue: rentalTypes.withDriver.revenue,
        count: rentalTypes.withDriver.count,
        feeCount: rentalTypes.withDriver.feeCount ?? 0,
        percentage: rentalTypes.withDriver.percentage,
        warna: WARNA.withDriver,
      },
    ],
    [rentalTypes],
  );

  const totalOmzet = data.reduce((jumlah, d) => jumlah + d.revenue, 0);
  const totalTransaksi = data.reduce((jumlah, d) => jumlah + d.count, 0);
  const totalPotongan = data.reduce((jumlah, d) => jumlah + d.feeCount, 0);

  /* Donut butuh minimal satu bagian bernilai. Kalau semua nol, grafiknya kosong
     dan Recharts menggambar lingkaran penuh tanpa arti, jadi diganti keterangan. */
  const adaData = totalOmzet > 0 || totalTransaksi > 0 || totalPotongan > 0;

  return (
    <div className="flex h-full flex-col rounded-card border border-rule bg-surface p-5 shadow-xs">
      <div className="flex items-start justify-between gap-2 border-b border-rule pb-3">
        <div>
          <h3 className="text-subtitle font-bold text-ink">Model Sewa</h3>
          <p className="text-meta text-ink-soft">
            Perbandingan lepas kunci dan dengan supir.
          </p>
        </div>
        {periodeLabel ? (
          <span className="shrink-0 rounded-sm border border-rule bg-canvas px-2 py-0.5 text-micro font-medium text-ink-soft">
            {periodeLabel}
          </span>
        ) : null}
      </div>

      {adaData ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-between gap-5 sm:flex-row xl:flex-col">
          <div className="flex h-[184px] w-[184px] shrink-0 items-center justify-center">
            <PieChart width={184} height={184}>
              <Pie
                data={data}
                dataKey="revenue"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={2}
                strokeWidth={0}
                isAnimationActive={false}
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
                        Pemasukan: <strong className="text-ink">{formatRupiah(d.revenue)}</strong>
                      </p>
                      <p className="text-meta text-ink-soft">
                        Sewa lunas: <strong className="text-ink">{d.count} transaksi</strong>
                      </p>
                      {d.feeCount > 0 ? (
                        <p className="text-meta text-ink-soft">
                          Potongan batal: <strong className="text-ink">{d.feeCount} transaksi</strong>
                        </p>
                      ) : null}
                      <p className="text-meta text-ink-soft">
                        Porsi: <strong className="text-ink">{d.percentage}%</strong>
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
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
                  {formatRupiah(d.revenue)} · {d.count} sewa lunas
                  {d.feeCount > 0 ? ` · ${d.feeCount} potongan batal` : ""}
                </p>
              </li>
            ))}
            <li className="flex items-baseline justify-between gap-2 border-t border-rule pt-2.5 text-meta text-ink-soft">
              <span>Total</span>
              <span className="tabular-nums font-semibold text-ink">
                {formatRupiah(totalOmzet)} · {totalTransaksi} sewa lunas
                {totalPotongan > 0 ? ` · ${totalPotongan} potongan batal` : ""}
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
});
