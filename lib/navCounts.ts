import { getBookings, getSupportTickets } from "@/lib/operations";

/**
 * Angka kecil di sidebar untuk pekerjaan yang menunggu tindakan admin.
 *
 * Hanya dua yang dihitung, karena hanya keduanya yang benar-benar menahan
 * pekerjaan: pesanan yang belum dikonfirmasi tarifnya, dan tiket bantuan yang
 * belum disentuh. Menghitung semua pesanan atau semua tiket akan membuat angkanya
 * selalu besar dan berhenti bermakna.
 *
 * Kegagalan mengambil data tidak boleh menjatuhkan seluruh tata letak, jadi
 * hasilnya dikosongkan dan sidebar tetap tampil tanpa angka.
 */
export type NavCounts = Record<string, number>;

export async function getNavCounts(): Promise<NavCounts> {
  try {
    const [bookings, tickets] = await Promise.all([getBookings(), getSupportTickets()]);

    const antreanPesanan = bookings.filter(
      (booking) => booking.status === "perlu_konfirmasi_tarif",
    ).length;

    const tiketBaru = tickets.filter((ticket) => ticket.status === "baru").length;

    const hasil: NavCounts = {};
    if (antreanPesanan > 0) hasil["/bookings"] = antreanPesanan;
    if (tiketBaru > 0) hasil["/customer-care"] = tiketBaru;
    return hasil;
  } catch {
    return {};
  }
}
