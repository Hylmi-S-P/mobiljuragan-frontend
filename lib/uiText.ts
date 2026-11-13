/*
 * Konstanta tampilan untuk nilai yang bukan data.
 *
 * Berkas ini sebelumnya bernama `mockData.ts` dan memuat data contoh armada, pemesanan,
 * supir, dan tiket. Data itu sudah tidak dipakai lagi: seluruh halaman kini memuat data
 * dari REST API Express (`lib/api.ts` dan `lib/operations.ts`).
 *
 * Yang tersisa di sini hanya teks penanda yang memang bukan data, misalnya
 * catatan tarif yang belum dikonfirmasi.
 */

export const TARIFF_PENDING_NOTE = "Tarif dikonfirmasi tim MobilJuragan";
export const PRIVATE_FIELD_PLACEHOLDER = "[data belum diverifikasi]";

/* Nama kartu pemasukan. Dulu laporan keuangan dan dashboard memakai dua istilah
   berbeda untuk angka yang sama (pembayaran lunas). Satu konstanta dipakai di
   kedua tempat supaya tidak menyimpang lagi. */
export const LABEL_TOTAL_PEMASUKAN = "Total Pemasukan";
