"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import { formatRupiah } from "@/lib/format";
import type { FinanceSummary } from "@/lib/operations";

type Props = {
  rentalTypes: FinanceSummary["rentalTypes"];
};

/**
 * Donut perbandingan model sewa: Lepas Kunci vs Dengan Supir.
 *
 * Hanya dua kategori. Halimah paragraf 34 menegaskan hal ini: "sama aja dan tetep
 * dibikin 2 aja kan? Lepas Kunci dan Dengan Supir". Datanya sudah tersedia di
 * `rentalTypes`, jadi grafik ini murni visual.
 */
export function RentalModelDonutChart({ rentalTypes }: Props) {
  const [aktif, setAktif] = useState<number | null>(null);

  const data = useMemo(
    () => [
      {
        nama: "Lepas Kunci",
        value: rentalTypes.withoutDriver.revenue,
        jumlah: rentalTypes.withoutDriver.count,
        persen: rentalTypes.withoutDriver.percentage,
        warna: "#0e7c7b",
      },
      {
        nama: "Dengan Supir",
        value: rentalTypes.withDriver.revenue,
        jumlah: rentalTypes.withDriver.count,
        persen: rentalTypes.withDriver.percentage,
        warna: "#d4a017",
      },
    ],
    [rentalTypes],
  );

  const total = data.reduce((acc, d) => acc + d.value, 0);
  const adaData = total > 0;

  /* Potongan yang sedang disorot diperbesar sedikit, supaya mata langsung tahu
     bagian mana yang sedang dibaca tanpa perlu mengubah warna. */
  const renderPotongan = (props: unknown) => {
    const p = props as {
      cx: number;
      cy: number;
      innerRadius: number;
      outerRadius: number;
      startAngle: number;
      endAngle: number;
      fill: string;
      index: number;
    };
    const sedangAktif = aktif === p.index;
    const outer = sedangAktif ? p.outerRadius + 6 : p.outerRadius;

    return (
      <Sector
        cx={p.cx}
        cy={p.cy}
        innerRadius={p.innerRadius}
        outerRadius={outer}
        startAngle={p.startAngle}
        endAngle={p.endAngle}
        fill={p.fill}
        stroke="#fff"
        strokeWidth={2}
      />
    );
  };

  return (
    <div className="rounded-card border border-rule bg-surface p-5 shadow-xs">
      <div className="border-b border-rule pb-3">
        <h3 className="text-subtitle font-bold text-ink">Model Sewa</h3>
        <p className="text-meta text-ink-soft">
          Perbandingan pendapatan lepas kunci dan dengan supir.
        </p>
      </div>

      {adaData ? (
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="h-56 w-56 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="nama"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={2}
                  shape={renderPotongan}
                  onMouseEnter={(_, index) => setAktif(index)}
                  onMouseLeave={() => setAktif(null)}
                  isAnimationActive={false}
                >
                  {data.map((d) => (
                    <Cell key={d.nama} fill={d.warna} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active: tooltipAktif, payload }) => {
                    if (!tooltipAktif || !payload?.length) return null;
                    const d = payload[0].payload as (typeof data)[number];
                    return (
                      <div className="rounded-sm border border-rule bg-surface px-3 py-2 shadow-md">
                        <p className="text-micro font-semibold text-ink">{d.nama}</p>
                        <p className="text-meta text-ink-soft">
                          Omzet: <strong className="text-ink">{formatRupiah(d.value)}</strong>
                        </p>
                        <p className="text-meta text-ink-soft">
                          {d.jumlah} transaksi · {d.persen}%
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full space-y-2">
            {data.map((d) => (
              <div
                key={d.nama}
                className="flex items-center justify-between rounded-sm border border-rule/60 bg-canvas/50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: d.warna }}
                  />
                  <span className="text-meta font-medium text-ink">{d.nama}</span>
                </div>
                <div className="text-right">
                  <span className="block text-meta font-semibold text-ink tabular-nums">
                    {formatRupiah(d.value)}
                  </span>
                  <span className="text-micro text-ink-soft">
                    {d.jumlah} transaksi · {d.persen}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-meta text-ink-soft">
          Belum ada transaksi lunas, jadi perbandingan model sewa belum bisa ditampilkan.
        </p>
      )}
    </div>
  );
}
