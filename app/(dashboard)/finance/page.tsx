import type { Metadata } from "next";
import { FinancialSummaryCard } from "@/components/finance/FinancialSummaryCard";
import { FleetRevenueTable } from "@/components/finance/FleetRevenueTable";
import { getFinanceSummary } from "@/lib/operations";
import { terapkanDemoGrafik } from "@/lib/demoFinance";

export const metadata: Metadata = {
  title: "Laporan Keuangan | MobilJuragan",
  description:
    "Laporan omzet pemasukan dan pendapatan per unit armada CV. Mobil Juragan Express Transport Merauke.",
};

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const dataAsli = await getFinanceSummary("all");

  /* Grafik memakai angka contoh hanya bila NEXT_PUBLIC_DEMO_CHART=1.
     Tanpa variabel itu, fungsinya mengembalikan data asli apa adanya. */
  const financeData = terapkanDemoGrafik(dataAsli);

  return (
    <div className="flex flex-col gap-6">
      {/* Ringkasan Finansial & Visualisasi */}
      <FinancialSummaryCard initialData={financeData} />

      {/* Rincian Omzet per Armada */}
      <FleetRevenueTable fleetBreakdown={financeData.fleetBreakdown} />
    </div>
  );
}
