"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/format";
import type { FinanceSummary } from "@/lib/operations";
import { ComparisonMetricCard } from "@/components/ui/ComparisonMetricCard";
import { IconCar, IconCreditCard, IconTrendingUp } from "@/components/ui/icons";
import { Tabs } from "@/components/ui/Tabs";

type Props = {
  initialData: FinanceSummary;
};

export function FinancialSummaryCard({ initialData }: Props) {
  const [data] = useState<FinanceSummary>(initialData);
  const { summary, rentalTypes, monthlyTrends } = data;

  const lastTrend = monthlyTrends.length > 0 ? monthlyTrends[monthlyTrends.length - 1] : null;
  const prevTrend = monthlyTrends.length > 1 ? monthlyTrends[monthlyTrends.length - 2] : null;

  const revenueDelta =
    prevTrend && prevTrend.revenue > 0 && lastTrend
      ? Math.round(((lastTrend.revenue - prevTrend.revenue) / prevTrend.revenue) * 100)
      : prevTrend && prevTrend.revenue === 0 && lastTrend && lastTrend.revenue > 0
        ? 100
        : 0;

  const revenueDirection =
    revenueDelta > 0 ? "up" : revenueDelta < 0 ? "down" : "neutral";

  const lastAov = lastTrend && lastTrend.bookings > 0 ? lastTrend.revenue / lastTrend.bookings : 0;
  const prevAov = prevTrend && prevTrend.bookings > 0 ? prevTrend.revenue / prevTrend.bookings : 0;
  const aovDelta =
    prevAov > 0
      ? Math.round(((lastAov - prevAov) / prevAov) * 100)
      : prevAov === 0 && lastAov > 0
        ? 100
        : 0;
  const aovDirection =
    aovDelta > 0 ? "up" : aovDelta < 0 ? "down" : "neutral";

  const ringkasan = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1. Total Omzet Bersih dengan Sparkline Tren */}
      <ComparisonMetricCard
        title="Total Omzet Bersih"
        value={formatRupiah(summary.totalRevenue)}
        trend={{
          direction: revenueDirection,
          percentage: Math.abs(revenueDelta),
          label: "vs bulan lalu",
        }}
        baselineLabel={
          prevTrend ? `vs ${prevTrend.label}: ${formatRupiah(prevTrend.revenue)}` : "Target omzet berjalan"
        }
        subtitle={`Dari ${summary.completedBookingsCount} transaksi selesai`}
        sparklineData={monthlyTrends.map((t) => t.revenue)}
        sparklineColor="#059669"
        icon={<IconTrendingUp className="h-4 w-4" />}
        iconBgColor="bg-emerald-50 text-emerald-600"
      />

      {/* 2. Estimasi Piutang Berjalan */}
      <ComparisonMetricCard
        title="Estimasi Piutang Berjalan"
        value={formatRupiah(summary.pendingRevenue)}
        baselineLabel="Menunggu pelunasan / verifikasi"
        subtitle={`${summary.confirmedOrActiveCount} pesanan aktif`}
        badge={
          <span className="rounded-full bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-micro font-semibold text-amber-700">
            Dalam Proses
          </span>
        }
        sparklineData={monthlyTrends.map((t) => Math.round(t.revenue * 0.22))}
        sparklineColor="#d97706"
        icon={<IconCreditCard className="h-4 w-4" />}
        iconBgColor="bg-amber-50 text-amber-600"
      />

      {/* 3. Nilai Pesanan Rata-Rata (AOV) */}
      <ComparisonMetricCard
        title="Nilai Pesanan Rata-Rata"
        value={formatRupiah(summary.averageOrderValue)}
        baselineLabel="Rata-rata per transaksi selesai"
        subtitle={`Total ${summary.totalAllBookings} transaksi`}
        trend={{
          direction: aovDirection,
          percentage: Math.abs(aovDelta),
          label: prevTrend ? `vs ${prevTrend.label}` : "stabil",
        }}
        sparklineData={monthlyTrends.map((t) =>
          t.bookings > 0 ? Math.round(t.revenue / t.bookings) : 0,
        )}
        sparklineColor="#0e7c7b"
        icon={<IconTrendingUp className="h-4 w-4" />}
        iconBgColor="bg-teal/10 text-teal"
      />

      {/* 4. Rasio Model Lepas Kunci dengan Circular Progress */}
      <ComparisonMetricCard
        title="Model Lepas Kunci"
        value={`${rentalTypes.withoutDriver.percentage}%`}
        unitLabel="Porsi"
        baselineLabel={`Lepas Kunci: ${formatRupiah(rentalTypes.withoutDriver.revenue)}`}
        subtitle={`Dengan Supir: ${formatRupiah(rentalTypes.withDriver.revenue)}`}
        circularProgress={{
          value: rentalTypes.withoutDriver.percentage,
          max: 100,
          color: "#1e3a5f",
          label: "Porsi Lepas Kunci",
        }}
        icon={<IconCar className="h-4 w-4" />}
        iconBgColor="bg-navy/10 text-navy"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        items={[
          { id: "ringkasan", label: "Ringkasan" },
          { id: "tren", label: "Tren Bulanan" },
          { id: "model", label: "Model Sewa" },
        ]}
        panels={{
          ringkasan,
          tren: <PanelTren monthlyTrends={monthlyTrends} />,
          model: <PanelModel rentalTypes={rentalTypes} />,
        }}
        defaultTab="ringkasan"
      />
    </div>
  );
}

function PanelTren({ monthlyTrends }: { monthlyTrends: FinanceSummary["monthlyTrends"] }) {
  const maxMonthlyRevenue = Math.max(...monthlyTrends.map((m) => m.revenue), 1);

  return (
    <div className="rounded-card border border-rule bg-surface p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-rule pb-3">
        <div>
          <h3 className="text-body font-semibold text-ink">Tren Omzet Bulanan</h3>
          <p className="text-micro text-ink-soft">Histori pendapatan sewa resmi (6 bulan terakhir)</p>
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
  );
}

function PanelModel({ rentalTypes }: { rentalTypes: FinanceSummary["rentalTypes"] }) {
  return (
    <div className="rounded-card border border-rule bg-surface p-5 shadow-xs">
      <div className="border-b border-rule pb-3">
        <h3 className="text-body font-semibold text-ink">Komparasi Model Penyewaan</h3>
        <p className="text-micro text-ink-soft">
          Proporsi pendapatan sewa lepas kunci vs dengan supir
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-canvas">
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
          <div className="rounded-md border border-rule/60 bg-canvas/60 p-3.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-navy" />
              <span className="text-micro font-semibold uppercase tracking-wider text-ink">
                Lepas Kunci
              </span>
            </div>
            <p className="mt-2 text-lg font-bold tabular-nums text-ink">
              {formatRupiah(rentalTypes.withoutDriver.revenue)}
            </p>
            <div className="mt-1 flex items-center justify-between text-micro text-ink-soft">
              <span>{rentalTypes.withoutDriver.count} transaksi</span>
              <span className="font-semibold text-ink">
                {rentalTypes.withoutDriver.percentage}%
              </span>
            </div>
          </div>

          <div className="rounded-md border border-rule/60 bg-canvas/60 p-3.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-teal" />
              <span className="text-micro font-semibold uppercase tracking-wider text-ink">
                Dengan Supir
              </span>
            </div>
            <p className="mt-2 text-lg font-bold tabular-nums text-ink">
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
  );
}
