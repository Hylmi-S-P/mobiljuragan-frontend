import type { Metadata } from "next";
import { FinancialSummaryCard } from "@/components/finance/FinancialSummaryCard";
import { FleetRevenueTable } from "@/components/finance/FleetRevenueTable";
import { IconTrendingUp } from "@/components/ui/icons";
import { getFinanceSummary } from "@/lib/operations";

export const metadata: Metadata = {
  title: "Laporan Keuangan | MobilJuragan",
  description:
    "Laporan omzet pemasukan, estimasi piutang berjalan, dan kontribusi pendapatan unit armada CV. Mobil Juragan Express Transport Merauke.",
};

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const financeData = await getFinanceSummary("all");

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-1 border-b border-rule pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-white">
            <IconTrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink">
              Laporan Keuangan & Arus Kas Masuk
            </h1>
            <p className="text-meta text-ink-soft">
              Rekapitulasi omzet sewa armada, piutang berjalan, dan rasio pemesanan MobilJuragan Merauke.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-micro font-medium text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Data Real-time MariaDB
          </span>
        </div>
      </div>

      {/* Ringkasan Finansial & Visualisasi */}
      <FinancialSummaryCard initialData={financeData} />

      {/* Rincian Omzet per Armada */}
      <FleetRevenueTable
        fleetBreakdown={financeData.fleetBreakdown}
        totalRevenue={financeData.summary.totalRevenue}
      />
    </div>
  );
}
