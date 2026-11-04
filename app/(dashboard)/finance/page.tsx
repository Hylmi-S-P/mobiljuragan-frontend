import type { Metadata } from "next";
import { FinancialSummaryCard } from "@/components/finance/FinancialSummaryCard";
import { FleetRevenueTable } from "@/components/finance/FleetRevenueTable";
import { getFinanceSummary } from "@/lib/operations";
import { bacaBulanOmzet } from "@/lib/financePeriod";

export const metadata: Metadata = {
  title: "Laporan Keuangan | MobilJuragan",
  description:
    "Laporan omzet pemasukan dan pendapatan per unit armada CV. Mobil Juragan Express Transport Merauke.",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ bulan?: string }>;
};

export default async function FinancePage({ searchParams }: PageProps) {
  /* Rentang bulan boleh diatur lewat URL supaya pilihan filter ikut terbawa saat
     halaman dimuat ulang atau ditautkan. Nilai di luar daftar putih diabaikan
     dan jatuh ke rentang bawaan, sama seperti perilaku backend. */
  const parameter = searchParams ? await searchParams : undefined;
  const bulan = bacaBulanOmzet(parameter?.bulan);

  /* Seluruh angka di halaman ini datang dari database. Tidak ada lagi jalur
     data contoh: laporan keuangan harus selalu bisa dipertanggungjawabkan. */
  const financeData = await getFinanceSummary("all", bulan);

  return (
    <div className="flex flex-col gap-6">
      {/* Ringkasan Finansial & Visualisasi */}
      <FinancialSummaryCard initialData={financeData} />

      {/* Rincian Omzet per Armada */}
      <FleetRevenueTable fleetBreakdown={financeData.fleetBreakdown} />
    </div>
  );
}
