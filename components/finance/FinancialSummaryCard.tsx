"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/format";
import type { FinanceSummary } from "@/lib/operations";
import { IconTrendingUp } from "@/components/ui/icons";

type Props = {
  initialData: FinanceSummary;
};

export function FinancialSummaryCard({ initialData }: Props) {
  const [data] = useState<FinanceSummary>(initialData);
  const { summary, rentalTypes, monthlyTrends } = data;

  const maxMonthlyRevenue = Math.max(...monthlyTrends.map((m) => m.revenue), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* 4 Kartu Metrik Utama */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Omzet */}
        <div className="rounded-card border border-rule bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-meta font-medium text-ink-soft">Total Omzet Bersih</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <IconTrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-ink tabular-nums">
            {formatRupiah(summary.totalRevenue)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-micro text-ink-soft">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>Dari {summary.completedBookingsCount} transaksi selesai</span>
          </div>
        </div>

        {/* Estimasi Piutang / Pending Pemasukan */}
        <div className="rounded-card border border-rule bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-meta font-medium text-ink-soft">Estimasi Piutang Berjalan</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <span className="text-xs font-bold">Rp</span>
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-ink tabular-nums">
            {formatRupiah(summary.pendingRevenue)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-micro text-ink-soft">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            <span>{summary.confirmedOrActiveCount} pesanan aktif / terkonfirmasi</span>
          </div>
        </div>

        {/* Transaksi Selesai */}
        <div className="rounded-card border border-rule bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-meta font-medium text-ink-soft">Transaksi Sewa Selesai</span>
            <span className="rounded-badge bg-navy-surface px-2 py-0.5 text-micro font-medium text-navy">
              {summary.totalAllBookings > 0
                ? `${Math.round((summary.completedBookingsCount / summary.totalAllBookings) * 100)}% Rasio`
                : "0%"}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-ink tabular-nums">
            {summary.completedBookingsCount}{" "}
            <span className="text-base font-normal text-ink-soft">Unit Sewa</span>
          </p>
          <div className="mt-2 text-micro text-ink-soft">
            Total tercatat: {summary.totalAllBookings} permohonan masuk
          </div>
        </div>

        {/* Rata-rata Nilai Transaksi (AOV) */}
        <div className="rounded-card border border-rule bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-meta font-medium text-ink-soft">Rata-rata Transaksi (AOV)</span>
            <span className="text-micro font-medium text-ink-soft">Per Pemesanan</span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-ink tabular-nums">
            {formatRupiah(summary.averageOrderValue)}
          </p>
          <div className="mt-2 text-micro text-ink-soft">
            Nilai rata-rata realisasi sewa armada
          </div>
        </div>
      </div>

      {/* Komparasi Sewa Lepas Kunci vs Dengan Supir & Tren Bulanan */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Komparasi Tipe Sewa */}
        <div className="rounded-card border border-rule bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <div>
              <h3 className="text-body font-semibold text-ink">Komparasi Model Penyewaan</h3>
              <p className="text-micro text-ink-soft">
                Proporsi pendapatan sewa lepas kunci vs dengan supir
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            {/* Visual Bar Proporsi */}
            <div className="h-3.5 w-full overflow-hidden rounded-full bg-canvas flex">
              <div
                className="bg-navy transition-all duration-500"
                style={{ width: `${rentalTypes.withoutDriver.percentage}%` }}
                title={`Lepas Kunci: ${rentalTypes.withoutDriver.percentage}%`}
              />
              <div
                className="bg-teal transition-all duration-500"
                style={{ width: `${rentalTypes.withDriver.percentage}%` }}
                title={`Dengan Supir: ${rentalTypes.withDriver.percentage}%`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              {/* Lepas Kunci */}
              <div className="rounded-md border border-rule/60 bg-canvas/60 p-3.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-navy shrink-0" />
                  <span className="text-micro font-semibold uppercase tracking-wider text-ink">
                    Lepas Kunci
                  </span>
                </div>
                <p className="mt-2 text-lg font-bold text-ink tabular-nums">
                  {formatRupiah(rentalTypes.withoutDriver.revenue)}
                </p>
                <div className="mt-1 flex items-center justify-between text-micro text-ink-soft">
                  <span>{rentalTypes.withoutDriver.count} transaksi</span>
                  <span className="font-semibold text-ink">{rentalTypes.withoutDriver.percentage}%</span>
                </div>
              </div>

              {/* Dengan Supir */}
              <div className="rounded-md border border-rule/60 bg-canvas/60 p-3.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal shrink-0" />
                  <span className="text-micro font-semibold uppercase tracking-wider text-ink">
                    Dengan Supir
                  </span>
                </div>
                <p className="mt-2 text-lg font-bold text-ink tabular-nums">
                  {formatRupiah(rentalTypes.withDriver.revenue)}
                </p>
                <div className="mt-1 flex items-center justify-between text-micro text-ink-soft">
                  <span>{rentalTypes.withDriver.count} transaksi</span>
                  <span className="font-semibold text-ink">{rentalTypes.withDriver.percentage}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tren Omzet 6 Bulan Terakhir */}
        <div className="rounded-card border border-rule bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <div>
              <h3 className="text-body font-semibold text-ink">Tren Omzet Bulanan</h3>
              <p className="text-micro text-ink-soft">Histori pendapatan sewa (6 bulan terakhir)</p>
            </div>
            <span className="text-micro font-medium text-ink-soft">IDR (Rupiah)</span>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {monthlyTrends.map((trend) => {
              const pct = maxMonthlyRevenue > 0 ? Math.round((trend.revenue / maxMonthlyRevenue) * 100) : 0;
              return (
                <div key={trend.label} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-micro font-medium text-ink-soft">
                    {trend.label}
                  </span>
                  <div className="relative h-6 flex-1 overflow-hidden rounded bg-canvas">
                    <div
                      className="h-full rounded bg-teal/20 transition-all duration-500"
                      style={{ width: `${Math.max(pct, trend.revenue > 0 ? 5 : 0)}%` }}
                    />
                    <span className="absolute inset-y-0 left-2 flex items-center text-micro font-medium tabular-nums text-ink">
                      {trend.revenue > 0 ? formatRupiah(trend.revenue) : "Rp 0"}
                    </span>
                  </div>
                  <span className="w-16 text-right text-micro tabular-nums text-ink-soft">
                    {trend.bookings} sewa
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
