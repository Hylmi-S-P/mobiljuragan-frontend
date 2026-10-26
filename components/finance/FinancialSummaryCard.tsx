"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/format";
import type { FinanceSummary } from "@/lib/operations";
import { ComparisonMetricCard } from "@/components/ui/ComparisonMetricCard";
import { IconClipboard, IconTrendingUp } from "@/components/ui/icons";
import { Tabs } from "@/components/ui/Tabs";
import { RevenueBarChart } from "@/components/finance/RevenueBarChart";
import { YearOverYearChart } from "@/components/finance/YearOverYearChart";
import { RentalModelChart } from "@/components/finance/RentalModelChart";

type Props = {
  initialData: FinanceSummary;
};

export function FinancialSummaryCard({ initialData }: Props) {
  const [data] = useState<FinanceSummary>(initialData);
  const { summary, monthlyTrends, weeklyBreakdown, yearOverYear, rentalTypes } = data;

  /* Tab dikendalikan dari sini, bukan dibiarkan mengurus state sendiri.
     Alasannya: grafik memakai ResizeObserver untuk mengukur lebar wadahnya.
     Kalau panel grafik ikut dirender saat tabnya tersembunyi (hidden), lebarnya
     terbaca 0 dan grafik tidak pernah tergambar. Jadi grafik baru dipasang saat
     tabnya benar-benar dibuka. */
  const [tabAktif, setTabAktif] = useState("ringkasan");

  /* Kartu kanan sengaja berisi volume pekerjaan, bukan uang.
     Sebelumnya kartu ini menampilkan persentase model sewa, padahal angka yang
     sama sudah ada di grafik donut pada tab Model Sewa. Sekarang donutnya
     dihapus dan kartu ini mengisi sisi yang belum terwakili di halaman mana pun:
     berapa banyak pesanan yang masuk dan seberapa banyak yang masih berjalan. */
  const ringkasan = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <ComparisonMetricCard
        title="Total Omzet Bersih"
        value={formatRupiah(summary.totalRevenue)}
        sparklineData={monthlyTrends.map((t) => t.revenue)}
        sparklineColor="#059669"
        icon={<IconTrendingUp className="h-4 w-4" />}
        iconBgColor="bg-emerald-50 text-emerald-600"
      />

      <ComparisonMetricCard
        title="Pesanan Masuk"
        value={summary.totalAllBookings}
        unitLabel="pesanan"
        icon={<IconClipboard className="h-4 w-4" />}
        iconBgColor="bg-navy/10 text-navy"
      />
    </div>
  );

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
          model:
            tabAktif === "model" && rentalTypes ? (
              <RentalModelChart rentalTypes={rentalTypes} />
            ) : null,
        }}
      />
    </div>
  );
}