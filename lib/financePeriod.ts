/*
 * Pilihan periode laporan keuangan dan rentang bulan grafik pemasukan.
 *
 * Berkas ini sengaja terpisah dari `lib/operations.ts`. Berkas itu memakai
 * `server-only` karena membaca token dari cookie, sedangkan pemilih periode
 * dipakai komponen klien.
 *
 * Nilainya harus sama dengan daftar putih di backend (`financeController.ts`).
 */

export const PILIHAN_BULAN_OMZET = [1, 3, 6, 12] as const;

export type JumlahBulanOmzet = (typeof PILIHAN_BULAN_OMZET)[number];

export const LABEL_BULAN_OMZET: Record<JumlahBulanOmzet, string> = {
  1: "1 bulan",
  3: "3 bulan",
  6: "6 bulan",
  12: "12 bulan",
};

export const BULAN_OMZET_DEFAULT: JumlahBulanOmzet = 1;

export function bacaBulanOmzet(nilai: unknown): JumlahBulanOmzet {
  const angka = Number(nilai);
  return (PILIHAN_BULAN_OMZET as readonly number[]).includes(angka)
    ? (angka as JumlahBulanOmzet)
    : BULAN_OMZET_DEFAULT;
}

export const PILIHAN_PERIODE_KEUANGAN = ["1m", "3m", "6m", "12m", "year", "all"] as const;

export type PeriodeKeuangan = (typeof PILIHAN_PERIODE_KEUANGAN)[number];

export const PERIODE_KEUANGAN_DEFAULT: PeriodeKeuangan = "all";

export const LABEL_PERIODE_KEUANGAN: Record<PeriodeKeuangan, string> = {
  "1m": "1 Bulan",
  "3m": "3 Bulan",
  "6m": "6 Bulan",
  "12m": "12 Bulan",
  year: "Tahun Ini",
  all: "Semua",
};

export const KETERANGAN_PERIODE_KEUANGAN: Record<PeriodeKeuangan, string> = {
  "1m": "Bulan ini",
  "3m": "3 bulan terakhir",
  "6m": "6 bulan terakhir",
  "12m": "12 bulan terakhir",
  year: "Tahun berjalan",
  all: "Semua waktu",
};

export function jumlahBulanUntukPeriode(periode: PeriodeKeuangan): JumlahBulanOmzet {
  switch (periode) {
    case "1m":
      return 1;
    case "3m":
      return 3;
    case "6m":
      return 6;
    case "12m":
    case "year":
    case "all":
      return 12;
  }
}

export function bacaPeriodeKeuangan(nilai: unknown): PeriodeKeuangan {
  if (
    typeof nilai === "string" &&
    (PILIHAN_PERIODE_KEUANGAN as readonly string[]).includes(nilai)
  ) {
    return nilai as PeriodeKeuangan;
  }
  return PERIODE_KEUANGAN_DEFAULT;
}
