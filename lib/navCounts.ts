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

/**
 * Rincian angka untuk satu menu.
 *
 * baru    : tiket yang belum pernah disentuh admin sama sekali.
 * dibalas : tiket yang pelanggannya sudah membalas, jadi giliran admin.
 *
 * Keduanya sama-sama menunggu tindakan, tetapi artinya berbeda bagi admin:
 * yang pertama belum pernah dilihat, yang kedua sudah dijawab dan ditunggu.
 */
export type NavDetail = { baru: number; dibalas: number };
export type NavDetails = Record<string, NavDetail>;

export async function getNavCounts(): Promise<{ counts: NavCounts; details: NavDetails }> {
  try {
    const [bookings, tickets, payments] = await Promise.all([
      getBookings(),
      getSupportTickets(),
      getAdminPayments({ status: "PENDING_VERIFICATION", limit: 100 }).catch(() => null),
    ]);

    const antreanPesanan = bookings.filter(
      (booking) => booking.status === "perlu_konfirmasi_tarif",
    ).length;
    /* Dua jenis tiket yang sama-sama menunggu admin:
       - "baru": belum pernah disentuh sama sekali.
       - "menunggu_pelanggan": tim sudah membalas, pelanggan membalas lagi, jadi
         giliran admin. Sebelumnya jenis ini tidak dihitung, sehingga tiket yang
         pelanggannya sedang menunggu tidak pernah muncul di sidebar. */
    const tiketBaru = tickets.filter((ticket) => ticket.status === "baru").length;
    const tiketDibalas = tickets.filter(
      (ticket) => ticket.status === "menunggu_pelanggan",
    ).length;
    const totalTiket = tiketBaru + tiketDibalas;
    const pendingBayar = payments?.items?.length ?? 0;

    const hasil: NavCounts = {};
    const rincian: NavDetails = {};
    /* Satu angka untuk menu Pemesanan Masuk, berisi dua pekerjaan yang sama-sama
       menunggu admin: pesanan yang perlu dikonfirmasi tarifnya dan bukti transfer
       yang perlu diverifikasi. Sebelumnya angkanya hanya menghitung pesanan,
       sehingga bukti transfer yang menumpuk tidak terlihat dari sidebar. */
    const totalPemesanan = antreanPesanan + pendingBayar;
    if (totalPemesanan > 0) hasil["/bookings"] = totalPemesanan;
    if (totalTiket > 0) {
      hasil["/customer-care"] = totalTiket;
      rincian["/customer-care"] = { baru: tiketBaru, dibalas: tiketDibalas };
    }
    if (pendingBayar > 0) {
      hasil["/payments"] = pendingBayar;
    }
    return { counts: hasil, details: rincian };
  } catch {
    return { counts: {}, details: {} };
  }
}
