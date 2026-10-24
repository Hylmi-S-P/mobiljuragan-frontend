import { getAdminPayments, getBookings, getSupportTickets } from "@/lib/operations";

/**
 * Angka kecil di sidebar untuk pekerjaan yang menunggu tindakan admin.
 *
 * Dihitung untuk hal-hal yang benar-benar menahan alur operasional:
 * 1. Pesanan yang belum dikonfirmasi tarifnya (/bookings).
 * 2. Bukti pembayaran transfer bank yang menunggu verifikasi (/bookings?tab=pembayaran).
 * 3. Tiket bantuan yang belum disentuh (/customer-care).
 *
 * Kegagalan mengambil data tidak boleh menjatuhkan seluruh tata letak, jadi
 * hasilnya dikosongkan dan sidebar tetap tampil tanpa angka.
 */
export type NavCounts = Record<string, number>;

export async function getNavCounts(): Promise<NavCounts> {
  try {
    const [bookings, tickets, payments] = await Promise.all([
      getBookings(),
      getSupportTickets(),
      getAdminPayments({ status: "PENDING_VERIFICATION", limit: 100 }).catch(() => null),
    ]);

    const antreanPesanan = bookings.filter(
      (booking) => booking.status === "perlu_konfirmasi_tarif",
    ).length;

    const tiketBaru = tickets.filter((ticket) => ticket.status === "baru").length;
    const pendingBayar = payments?.items?.length ?? 0;

    const hasil: NavCounts = {};
    if (antreanPesanan > 0) hasil["/bookings"] = antreanPesanan;
    if (tiketBaru > 0) hasil["/customer-care"] = tiketBaru;
    if (pendingBayar > 0) {
      hasil["/payments"] = pendingBayar;
      hasil["/bookings?tab=pembayaran"] = pendingBayar;
    }
    return hasil;
  } catch {
    return {};
  }
}
