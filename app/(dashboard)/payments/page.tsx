import { permanentRedirect } from "next/navigation";

/**
 * Verifikasi pembayaran bukan lagi halaman sendiri.
 *
 * Halimah menilai halaman ini fungsinya sedikit dan bisa dijadikan satu dengan
 * pemesanan masuk. Sekarang isinya hidup sebagai tab di `/bookings`, dan rute
 * ini hanya mengalihkan ke sana.
 *
 * Dipertahankan sebagai redirect, bukan dihapus, supaya tautan lama
 * (bookmark admin, notifikasi, tautan internal) tidak berakhir di 404.
 */
export default function PaymentsPage() {
  permanentRedirect("/bookings?tab=pembayaran");
}
