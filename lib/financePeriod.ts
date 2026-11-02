/*
 * Pilihan rentang bulan untuk grafik omzet di laporan keuangan.
 *
 * Berkas ini sengaja terpisah dari `lib/operations.ts`. Berkas itu memakai
 * `server-only` karena membaca token dari cookie, sedangkan pemilih rentang
 * dipakai komponen klien. Kalau daftarnya ditaruh di sana, modul server ikut
 * terbawa ke bundel browser dan halaman gagal dikompilasi.
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

/* Rentang bawaan. Satu bulan dipakai supaya grafik dibuka dalam keadaan paling
   ringkas; pembaca melebarkan sendiri kalau perlu. */
export const BULAN_OMZET_DEFAULT: JumlahBulanOmzet = 1;

/** Menyaring nilai dari URL atau state. Nilai asing jatuh ke rentang bawaan. */
export function bacaBulanOmzet(nilai: unknown): JumlahBulanOmzet {
  const angka = Number(nilai);
  return (PILIHAN_BULAN_OMZET as readonly number[]).includes(angka)
    ? (angka as JumlahBulanOmzet)
    : BULAN_OMZET_DEFAULT;
}
