import type { Metadata } from "next";
import { FinancialSummaryCard } from "@/components/finance/FinancialSummaryCard";
import { getFinanceSummary } from "@/lib/operations";
import {
  bacaPeriodeKeuangan,
  jumlahBulanUntukPeriode,
  type PeriodeKeuangan,
} from "@/lib/financePeriod";

export const metadata: Metadata = {
  title: "Laporan Keuangan | MobilJuragan",
  description:
    "Laporan pemasukan dan pendapatan per unit armada CV. Mobil Juragan Express Transport Merauke.",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ periode?: string; bulan?: string }>;
};

function bacaPeriodeAwal(parameter?: { periode?: string; bulan?: string }): PeriodeKeuangan {
  if (parameter?.periode) {
    return bacaPeriodeKeuangan(parameter.periode);
  }
  if (parameter?.bulan) {
    const kandidat = `${parameter.bulan}m`;
    return bacaPeriodeKeuangan(kandidat);
  }
  return bacaPeriodeKeuangan(undefined);
}

export default async function FinancePage({ searchParams }: PageProps) {
  const parameter = searchParams ? await searchParams : undefined;
  const periode = bacaPeriodeAwal(parameter);
  const financeData = await getFinanceSummary(periode, jumlahBulanUntukPeriode(periode));

  return <FinancialSummaryCard initialData={financeData} initialPeriode={periode} />;
}
