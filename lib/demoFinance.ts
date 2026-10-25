/**
 * Data contoh untuk keperluan demo grafik keuangan.
 *
 * Kenapa ada berkas ini
 * ---------------------
 * Data asli di database baru punya pemasukan di satu bulan (Oktober 2026).
 * Grafik 12 bulan, tahun ke tahun, dan donut model sewa jadi terlihat kosong —
 * bukan karena grafiknya rusak, tetapi karena memang belum ada transaksi.
 *
 * Berkas ini menyediakan angka contoh supaya tampilan grafik bisa diperiksa dan
 * dipresentasikan. **Tidak ada satu baris pun yang ditulis ke database.** Data
 * asli tetap utuh, dan laporan keuangan tetap memakai angka sebenarnya.
 *
 * Cara memakai
 * ------------
 * Hanya aktif kalau `NEXT_PUBLIC_DEMO_CHART=1` di berkas `.env.local`. Tanpa itu,
 * fungsi di bawah mengembalikan data asli apa adanya. Jadi produksi tidak pernah
 * melihat angka contoh ini.
 *
 * Kalau nanti data asli sudah cukup banyak, cukup hapus variabel lingkungan itu.
 */

import type { FinanceSummary } from "@/lib/operations";

/** Apakah mode demo grafik sedang aktif. */
export const DEMO_CHART_AKTIF = process.env.NEXT_PUBLIC_DEMO_CHART === "1";

const BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/* Pola omzet contoh. Angkanya dibuat naik-turun seperti rental sungguhan:
   ramai saat akhir tahun dan libur sekolah, sepi di awal tahun. */
const POLA_OMZET = [
  18_500_000, 14_200_000, 21_800_000, 26_400_000, 32_100_000, 38_700_000, 41_500_000, 29_300_000,
  24_600_000, 33_800_000, 44_200_000, 51_000_000,
];

const POLA_TRANSAKSI = [6, 5, 7, 9, 11, 13, 14, 10, 8, 11, 15, 17];

/** Menyusun 12 bulan terakhir lengkap dengan pecahan mingguan. */
function buatMonthlyTrends(sekarang: Date): FinanceSummary["monthlyTrends"] {
  const hasil: FinanceSummary["monthlyTrends"] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(sekarang.getFullYear(), sekarang.getMonth() - i, 1);
    const indeks = (d.getMonth() + 12 - 0) % 12;
    const revenue = POLA_OMZET[indeks];
    const bookings = POLA_TRANSAKSI[indeks];

    /* Pecahan mingguan dibuat berjumlah sama dengan omzet bulanannya, supaya
       angka di grafik bulan dan angka di rincian minggu tidak saling bertentangan. */
    const bobot = [0.18, 0.24, 0.21, 0.22, 0.15];
    const weekly = bobot.map((b, idx) =>
      idx === bobot.length - 1
        ? revenue - bobot.slice(0, -1).reduce((acc, x) => acc + Math.round(revenue * x), 0)
        : Math.round(revenue * b),
    );

    hasil.push({
      label: `${BULAN[d.getMonth()]} ${d.getFullYear()}`,
      shortLabel: BULAN[d.getMonth()],
      tahun: d.getFullYear(),
      bulan: d.getMonth() + 1,
      revenue,
      bookings,
      weekly,
    });
  }

  return hasil;
}

/** Rincian mingguan yang diturunkan dari `monthlyTrends` contoh. */
function buatWeeklyBreakdown(
  monthlyTrends: FinanceSummary["monthlyTrends"],
): FinanceSummary["weeklyBreakdown"] {
  return monthlyTrends.map((m) => ({
    label: m.label,
    tahun: m.tahun,
    bulan: m.bulan,
    minggu: m.weekly.map((revenue, i) => {
      const awal = i * 7 + 1;
      const akhirHari = Math.min((i + 1) * 7, new Date(m.tahun, m.bulan, 0).getDate());
      return {
        label: `${awal}–${akhirHari} ${BULAN[m.bulan - 1]}`,
        revenue,
      };
    }),
  }));
}

/** Perbandingan 4 tahun dengan tren naik yang wajar. */
function buatYearOverYear(sekarang: Date): FinanceSummary["yearOverYear"] {
  const totalTahunIni = POLA_OMZET.reduce((a, b) => a + b, 0);
  const pola = [0.52, 0.68, 0.81, 1];

  return pola.map((rasio, i) => ({
    tahun: sekarang.getFullYear() - (pola.length - 1 - i),
    revenue: Math.round(totalTahunIni * rasio),
    bookings: Math.round(128 * rasio),
  }));
}

/**
 * Mengganti angka grafik dengan contoh, hanya bila mode demo aktif.
 *
 * Semua field lain — ringkasan, model sewa, pendapatan per armada — tetap memakai
 * data asli. Yang diganti hanya tiga deret yang dipakai grafik.
 */
export function terapkanDemoGrafik(
  data: FinanceSummary,
  sekarang: Date = new Date(),
): FinanceSummary {
  if (!DEMO_CHART_AKTIF) return data;

  const monthlyTrends = buatMonthlyTrends(sekarang);

  return {
    ...data,
    monthlyTrends,
    weeklyBreakdown: buatWeeklyBreakdown(monthlyTrends),
    yearOverYear: buatYearOverYear(sekarang),
  };
}
