"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/format";
import type { FinanceSummary } from "@/lib/operations";
import { ComparisonMetricCard } from "@/components/ui/ComparisonMetricCard";
import { IconCar, IconTrendingUp } from "@/components/ui/icons";
import { Tabs } from "@/components/ui/Tabs";
import { RevenueBarChart } from "@/components/finance/RevenueBarChart";
import { YearOverYearChart } from "@/components/finance/YearOverYearChart";
import { RentalModelDonutChart } from "@/components/finance/RentalModelDonutChart";

type Props = {
  initialData: FinanceSummary;
};

export function FinancialSummaryCard({ initialData }: Props) {
  const [data] = useState<FinanceSummary>(initialData);
  const { summary, rentalTypes, monthlyTrends, weeklyBreakdown, yearOverYear } = data;

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

  const ringkasan = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      {/* 2. Rasio Model Lepas Kunci dengan Circular Progress */}
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

  /* Tab dikendalikan dari sini, bukan dibiarkan mengurus state sendiri.
     Alasannya: grafik memakai ResizeObserver untuk mengukur lebar wadahnya.
     Kalau panel grafik ikut dirender saat tabnya tersembunyi (hidden), lebarnya
     terbaca 0 dan grafik tidak pernah tergambar. Jadi grafik baru dipasang saat
     tabnya benar-benar dibuka. */
  const [tabAktif, setTabAktif] = useState("ringkasan");

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        items={[
          { id: "ringkasan", label: "Ringkasan" },
          { id: "omzet", label: "Omzet Tahunan" },
          { id: "yoy", label: "Tahun ke Tahun" },
          { id: "model", label: "Model Sewa" },
        ]}
        activeTab={tabAktif}
        onChange={setTabAktif}
        panels={{
          ringkasan,
          omzet:
            tabAktif === "omzet" ? (
              <RevenueBarChart monthlyTrends={monthlyTrends} weeklyBreakdown={weeklyBreakdown} />
            ) : null,
          yoy: tabAktif === "yoy" ? <YearOverYearChart yearOverYear={yearOverYear} /> : null,
          model: tabAktif === "model" ? <RentalModelDonutChart rentalTypes={rentalTypes} /> : null,
        }}
      />
    </div>
  );
}

