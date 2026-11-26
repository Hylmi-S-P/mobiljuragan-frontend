"use client";

import { useState, useTransition } from "react";
import { formatRupiah } from "@/lib/format";
import type { FinanceSummary } from "@/lib/operations";
import {
  PILIHAN_PERIODE_KEUANGAN,
  LABEL_PERIODE_KEUANGAN,
  KETERANGAN_PERIODE_KEUANGAN,
  PERIODE_KEUANGAN_DEFAULT,
  jumlahBulanUntukPeriode,
  type PeriodeKeuangan,
} from "@/lib/financePeriod";
import { muatUlangRingkasanKeuanganAction } from "@/app/actions";
import { LABEL_TOTAL_PEMASUKAN } from "@/lib/uiText";
import { ComparisonMetricCard } from "@/components/ui/ComparisonMetricCard";
import { IconClipboard, IconTrendingUp } from "@/components/ui/icons";
import { RevenueBarChart } from "@/components/finance/RevenueBarChart";
import { YearOverYearChart } from "@/components/finance/YearOverYearChart";
import { RentalModelChart } from "@/components/finance/RentalModelChart";
import { FleetRevenueTable } from "@/components/finance/FleetRevenueTable";

type Props = {
  initialData: FinanceSummary;
  initialPeriode?: PeriodeKeuangan;
};

export function FinancialSummaryCard({
  initialData,
  initialPeriode = PERIODE_KEUANGAN_DEFAULT,
}: Props) {
  const [data, setData] = useState<FinanceSummary>(initialData);
  const [periode, setPeriode] = useState<PeriodeKeuangan>(initialPeriode);
  const [sedangMemuat, mulaiTransisi] = useTransition();
  const [galat, setGalat] = useState<string | null>(null);

  const { summary, monthlyTrends, weeklyBreakdown, yearOverYear, rentalTypes, fleetBreakdown } =
    data;

  function pilihPeriode(nilai: PeriodeKeuangan) {
    if (nilai === periode || sedangMemuat) return;

    const periodeSebelumnya = periode;
    setPeriode(nilai);
    setGalat(null);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("bulan");
      if (nilai === PERIODE_KEUANGAN_DEFAULT) {
        url.searchParams.delete("periode");
      } else {
        url.searchParams.set("periode", nilai);
      }
      window.history.replaceState(null, "", url.toString());
    }

    mulaiTransisi(async () => {
      const hasil = await muatUlangRingkasanKeuanganAction(nilai);
      if (hasil.success && hasil.data) {
        setData(hasil.data);
      } else {
        setPeriode(periodeSebelumnya);
        setGalat(hasil.message ?? "Laporan keuangan gagal dimuat ulang.");
      }
    });
  }

  const rentalRevenue = summary.rentalRevenue ?? summary.totalRevenue;
  const cancellationFeeRevenue = summary.cancellationFeeRevenue ?? 0;
  const breakdown = summary.bookingBreakdown;
  const pendingRefundCount = breakdown?.pendingRefundCount ?? 0;
  const periodeLabel = KETERANGAN_PERIODE_KEUANGAN[periode];
  const tampilkanYoY = periode === "all" || periode === "year";
  const jumlahBulan = jumlahBulanUntukPeriode(periode);

  const badgePeriode = (
    <span className="rounded-sm border border-rule bg-canvas px-2 py-0.5 text-micro font-medium text-ink-soft">
      {periodeLabel}
    </span>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-card border border-rule bg-surface p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-meta font-semibold text-ink">Periode Laporan</span>
          <span className="text-micro text-ink-soft">· {periodeLabel}</span>
          {sedangMemuat ? (
            <span className="text-micro font-medium text-navy">Memuat…</span>
          ) : null}
        </div>

        <div
          role="group"
          aria-label="Filter periode laporan keuangan"
          className="flex flex-wrap items-center gap-1 rounded-md border border-rule bg-canvas p-1"
        >
          {PILIHAN_PERIODE_KEUANGAN.map((nilai) => {
            const terpilih = periode === nilai;
            return (
              <button
                key={nilai}
                type="button"
                onClick={() => pilihPeriode(nilai)}
                aria-pressed={terpilih}
                disabled={sedangMemuat}
                className={`min-h-[44px] rounded-sm px-3 py-2 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy disabled:cursor-wait disabled:opacity-60 ${
                  terpilih
                    ? "bg-surface font-semibold text-ink shadow-xs"
                    : "text-ink-soft hover:bg-surface/60 hover:text-ink"
                }`}
              >
                {LABEL_PERIODE_KEUANGAN[nilai]}
              </button>
            );
          })}
        </div>
      </div>

      {galat ? (
        <p
          role="alert"
          className="rounded-sm border border-danger/40 bg-danger/5 px-3 py-2 text-meta text-danger"
        >
          {galat}
        </p>
      ) : null}

      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 transition-opacity ${
          sedangMemuat ? "opacity-60" : "opacity-100"
        }`}
      >
        <ComparisonMetricCard
          title={LABEL_TOTAL_PEMASUKAN}
          value={formatRupiah(summary.totalRevenue)}
          badge={badgePeriode}
          sparklineData={
            monthlyTrends.length > 1 ? monthlyTrends.map((t) => t.revenue) : undefined
          }
          sparklineColor="#059669"
          icon={<IconTrendingUp className="h-4 w-4" />}
          iconBgColor="bg-emerald-50 text-emerald-600"
          footer={
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
              <span>
                Sewa lunas: <strong className="text-ink">{formatRupiah(rentalRevenue)}</strong>
              </span>
              {cancellationFeeRevenue > 0 ? (
                <span>
                  · Potongan batal:{" "}
                  <strong className="text-ink">{formatRupiah(cancellationFeeRevenue)}</strong>
                </span>
              ) : null}
              {pendingRefundCount > 0 ? (
                <span className="text-amber-700">
                  · {pendingRefundCount} refund menunggu proses
                </span>
              ) : null}
            </div>
          }
        />

        <ComparisonMetricCard
          title="Pesanan Masuk"
          value={summary.totalAllBookings}
          unitLabel="pesanan"
          badge={badgePeriode}
          icon={<IconClipboard className="h-4 w-4" />}
          iconBgColor="bg-navy/10 text-navy"
          footer={
            breakdown ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
                <span>
                  <strong className="text-ink">{breakdown.paidCount}</strong> sewa lunas
                </span>
                {breakdown.refundWithFeeCount > 0 ? (
                  <span>
                    · <strong className="text-ink">{breakdown.refundWithFeeCount}</strong> potongan
                    batal
                  </span>
                ) : null}
                {breakdown.refundFullCount > 0 ? (
                  <span>
                    · <strong className="text-ink">{breakdown.refundFullCount}</strong> refund penuh
                  </span>
                ) : null}
                {breakdown.pendingRefundCount > 0 ? (
                  <span className="text-amber-700">
                    · <strong>{breakdown.pendingRefundCount}</strong> refund menunggu
                  </span>
                ) : null}
                {breakdown.unpaidCount > 0 ? (
                  <span>
                    · <strong className="text-ink">{breakdown.unpaidCount}</strong> belum bayar/batal
                  </span>
                ) : null}
              </div>
            ) : null
          }
        />
      </div>

      <div
        className={`grid grid-cols-1 gap-6 xl:grid-cols-12 transition-opacity ${
          sedangMemuat ? "opacity-60" : "opacity-100"
        }`}
      >
        <div className="xl:col-span-8">
          {tampilkanYoY ? (
            <YearOverYearChart yearOverYear={yearOverYear} />
          ) : (
            <RevenueBarChart
              key={periode}
              monthlyTrends={monthlyTrends}
              weeklyBreakdown={weeklyBreakdown}
              jumlahBulan={jumlahBulan}
            />
          )}
        </div>

        <div className="xl:col-span-4">
          {rentalTypes ? (
            <RentalModelChart rentalTypes={rentalTypes} periodeLabel={periodeLabel} />
          ) : null}
        </div>
      </div>

      <div className={`transition-opacity ${sedangMemuat ? "opacity-60" : "opacity-100"}`}>
        <FleetRevenueTable fleetBreakdown={fleetBreakdown} periodeLabel={periodeLabel} />
      </div>
    </div>
  );
}
