"use client";

import { useState, useTransition } from "react";
import { formatRupiah } from "@/lib/format";
import type { FinanceSummary } from "@/lib/operations";
import {
  PILIHAN_BULAN_OMZET,
  LABEL_BULAN_OMZET,
  BULAN_OMZET_DEFAULT,
  type JumlahBulanOmzet,
} from "@/lib/financePeriod";
import { muatUlangGrafikKeuanganAction } from "@/app/actions";
import { LABEL_TOTAL_PEMASUKAN } from "@/lib/uiText";
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
  const [data, setData] = useState<FinanceSummary>(initialData);
  const { summary, monthlyTrends, weeklyBreakdown, yearOverYear, rentalTypes } = data;

  /* Rentang grafik omzet. Rentangnya disimpan di sini karena hanya tab Omzet
     yang memakainya, dan nilainya harus ikut terkirim saat pengguna berpindah
     lalu kembali ke tab itu. */
  const [bulan, setBulan] = useState<JumlahBulanOmzet>(
    (initialData.bulan as JumlahBulanOmzet | undefined) ?? BULAN_OMZET_DEFAULT,
  );
  const [sedangMemuat, mulaiTransisi] = useTransition();
  const [galat, setGalat] = useState<string | null>(null);

  /* Tab dikendalikan dari sini, bukan dibiarkan mengurus state sendiri.
     Alasannya: grafik memakai ResizeObserver untuk mengukur lebar wadahnya.
     Kalau panel grafik ikut dirender saat tabnya tersembunyi (hidden), lebarnya
     terbaca 0 dan grafik tidak pernah tergambar. Jadi grafik baru dipasang saat
     tabnya benar-benar dibuka. */
  const [tabAktif, setTabAktif] = useState("ringkasan");

  /* Ganti rentang berarti mengambil ulang data dari backend, karena sumbu X
     grafik ditentukan di sana — bukan dipotong di browser. Hanya grafik yang
     berubah: kartu ringkasan dan tabel armada memakai `range`, bukan `bulan`. */
  function pilihBulan(nilai: JumlahBulanOmzet) {
    if (nilai === bulan || sedangMemuat) return;

    setBulan(nilai);
    setGalat(null);

    mulaiTransisi(async () => {
      const hasil = await muatUlangGrafikKeuanganAction(nilai);
      if (hasil.success && hasil.data) {
        setData(hasil.data);
      } else {
        setGalat(hasil.message ?? "Grafik keuangan gagal dimuat ulang.");
      }
    });
  }

  /* Kartu kanan sengaja berisi volume pekerjaan, bukan uang.
     Sebelumnya kartu ini menampilkan persentase model sewa, padahal angka yang
     sama sudah ada di grafik donut pada tab Model Sewa. Sekarang donutnya
     dihapus dan kartu ini mengisi sisi yang belum terwakili di halaman mana pun:
     berapa banyak pesanan yang masuk dan seberapa banyak yang masih berjalan. */
  const ringkasan = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <ComparisonMetricCard
        title={LABEL_TOTAL_PEMASUKAN}
        value={formatRupiah(summary.totalRevenue)}
        /* Satu titik bukan tren. Pada rentang 1 bulan data hanya berisi satu
           bulan, dan sparkline seketika jadi titik mengambang yang terbaca
           seperti grafik rusak. Untuk rentang sesingkat itu sparkline dimatikan;
           angkanya tetap tampil. */
        sparklineData={
          monthlyTrends.length > 1 ? monthlyTrends.map((t) => t.revenue) : undefined
        }
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

  const tabOmzet = (
    <div className="flex flex-col gap-4">
      {/* Pemilih rentang. Diletakkan di atas grafik karena sumbu X-nya yang
          berubah, bukan seluruh halaman. */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-rule bg-canvas p-1">
        <span className="px-2 text-micro font-medium text-ink-soft">Rentang</span>
        {PILIHAN_BULAN_OMZET.map((nilai) => {
          const terpilih = bulan === nilai;
          return (
            <button
              key={nilai}
              type="button"
              onClick={() => pilihBulan(nilai)}
              aria-pressed={terpilih}
              disabled={sedangMemuat}
              className={`rounded-sm px-3 py-1.5 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy disabled:cursor-wait disabled:opacity-60 ${
                terpilih
                  ? "bg-surface font-semibold text-ink shadow-xs"
                  : "text-ink-soft hover:bg-surface/60 hover:text-ink"
              }`}
            >
              {LABEL_BULAN_OMZET[nilai]}
            </button>
          );
        })}
        {sedangMemuat ? (
          <span className="px-2 text-micro text-ink-soft">Memuat…</span>
        ) : null}
      </div>

      {galat ? (
        <p className="rounded-sm border border-danger/40 bg-danger/5 px-3 py-2 text-meta text-danger">
          {galat}
        </p>
      ) : null}

      {/* `key` membuat grafik dipasang ulang saat rentang berganti. Tanpa itu,
          bulan yang tadinya diklik bisa tertinggal dan panel mingguannya
          menunjuk bulan yang sudah tidak ada di rentang baru. */}
      <RevenueBarChart
        key={bulan}
        monthlyTrends={monthlyTrends}
        weeklyBreakdown={weeklyBreakdown}
        jumlahBulan={bulan}
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
          omzet: tabAktif === "omzet" ? tabOmzet : null,
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
