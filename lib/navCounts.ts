import {
  getAdminPayments,
  getAllVehicles,
  getBookings,
  getRefundSummary,
  getSupportTickets,
} from "@/lib/operations";

/**
 * Angka kecil di sidebar untuk pekerjaan yang menunggu tindakan admin.
 *
 * Dihitung untuk hal-hal yang benar-benar menahan alur operasional:
 * 1. Pesanan yang menunggu tindakan (/bookings): permintaan baru, konfirmasi tarif,
 *    alokasi supir, siap serah terima, dan bukti transfer yang menunggu verifikasi.
 * 2. Unit armada yang sedang dalam pemeriksaan pasca-sewa (/fleet/catalog).
 * 3. Tiket bantuan yang belum disentuh atau menunggu balasan (/customer-care).
 * 4. Pengembalian dana yang menunggu penyelesaian (/refunds).
 *
 * Kegagalan mengambil data tidak boleh menjatuhkan seluruh tata letak, jadi
 * hasilnya dikosongkan dan sidebar tetap tampil tanpa angka.
 */
export type NavCounts = Record<string, number>;

/**
 * Rincian angka untuk satu menu.
 *
 * baru    : item yang belum pernah disentuh/diterima admin sama sekali.
 * dibalas : item lanjutan yang menunggu giliran atau tindakan admin berikutnya.
 */
export type NavDetail = { baru: number; dibalas: number };
export type NavDetails = Record<string, NavDetail>;

export async function getNavCounts(): Promise<{ counts: NavCounts; details: NavDetails }> {
  try {
    const [bookings, tickets, payments, refundSummary, vehicles] = await Promise.all([
      getBookings(),
      getSupportTickets(),
      getAdminPayments({ status: "PENDING_VERIFICATION", limit: 100 }).catch(() => null),
      getRefundSummary().catch(() => null),
      getAllVehicles().catch(() => []),
    ]);

    const permintaanBaru = bookings.filter((booking) => booking.rawStatus === "CREATED").length;
    const tindakLanjutPesanan = bookings.filter(
      (booking) =>
        (booking.status === "perlu_konfirmasi_tarif" && booking.rawStatus !== "CREATED") ||
        booking.status === "perlu_alokasi_sopir" ||
        booking.status === "siap_serah_terima",
    ).length;
    /* Dua jenis tiket yang sama-sama menunggu admin:
       - "baru": belum pernah disentuh sama sekali.
       - "menunggu_pelanggan": tim sudah membalas, pelanggan membalas lagi, jadi
         giliran admin. */
    const tiketBaru = tickets.filter((ticket) => ticket.status === "baru").length;
    const tiketDibalas = tickets.filter(
      (ticket) => ticket.status === "menunggu_pelanggan",
    ).length;
    const totalTiket = tiketBaru + tiketDibalas;
    const pendingBayar = payments?.items?.length ?? 0;
    const unitPemeriksaan = vehicles.filter((vehicle) => vehicle.status === "pemeriksaan").length;

    const hasil: NavCounts = {};
    const rincian: NavDetails = {};

    const tindakLanjutTotal = tindakLanjutPesanan + pendingBayar;
    const totalPemesanan = permintaanBaru + tindakLanjutTotal;
    if (totalPemesanan > 0) {
      hasil["/bookings"] = totalPemesanan;
      rincian["/bookings"] = { baru: permintaanBaru, dibalas: tindakLanjutTotal };
    }
    if (unitPemeriksaan > 0) {
      hasil["/fleet/catalog"] = unitPemeriksaan;
    }
    if (totalTiket > 0) {
      hasil["/customer-care"] = totalTiket;
      rincian["/customer-care"] = { baru: tiketBaru, dibalas: tiketDibalas };
    }
    const antreanRefund =
      (refundSummary?.menunggu?.jumlah ?? 0) + (refundSummary?.diproses?.jumlah ?? 0);
    if (antreanRefund > 0) {
      hasil["/refunds"] = antreanRefund;
    }
    return { counts: hasil, details: rincian };
  } catch {
    return { counts: {}, details: {} };
  }
}
