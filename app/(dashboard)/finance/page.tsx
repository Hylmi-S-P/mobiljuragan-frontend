import type { Metadata } from "next";
import { FinancialSummaryCard } from "@/components/finance/FinancialSummaryCard";
import { FleetRevenueTable } from "@/components/finance/FleetRevenueTable";
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
      {/* Ringkasan Finansial & Visualisasi */}
      <FinancialSummaryCard initialData={financeData} />

      {/* Rincian Omzet per Armada */}
      <FleetRevenueTable fleetBreakdown={financeData.fleetBreakdown} />
    </div>
  );
}
