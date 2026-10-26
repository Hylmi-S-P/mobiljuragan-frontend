/*
 * Konstanta tampilan untuk nilai yang bukan data.
 *
 * Berkas ini sebelumnya bernama `mockData.ts` dan memuat data contoh armada, pemesanan,
 * supir, dan tiket. Data itu sudah tidak dipakai lagi: seluruh halaman kini memuat data
 * dari REST API Express (`lib/api.ts` dan `lib/operations.ts`).
 *
 * Yang tersisa di sini hanya teks penanda yang memang bukan data, misalnya
 * catatan tarif yang belum dikonfirmasi dan daftar kategori biaya tambahan.
 */

export const TARIFF_PENDING_NOTE = "Tarif dikonfirmasi tim MobilJuragan";
export const PRIVATE_FIELD_PLACEHOLDER = "[data belum diverifikasi]";

/* Kategori biaya tambahan yang dikenali tim operasional saat menyesuaikan tarif.
   Daftarnya tetap karena merupakan pilihan tetap, bukan data pelanggan. */
export const SURCHARGE_CATEGORIES = [
  "Luar kota",
  "Menginap supir",
  "Antar jemput bandara",
  "Tambahan hari",
  "Biaya kebersihan",
];
