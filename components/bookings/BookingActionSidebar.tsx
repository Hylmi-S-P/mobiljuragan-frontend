"use client";

import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatRupiah } from "@/lib/format";
import { BOOKING_STATUS } from "@/lib/labels";
import type { Booking, BookingDocument, BookingStatus, CanonicalBookingStatus } from "@/lib/types";

type Props = {
  booking: Booking;
  document?: BookingDocument | null;
  status: BookingStatus;
  rawStatus: CanonicalBookingStatus;
  /* Tarif jasa supir global, dipakai untuk menampilkan rincian perkiraan.
     Angka final tetap dihitung server saat konfirmasi. */
  driverDailyRate: number;
  totalCleanBill: number;
  hasAssignedDriver: boolean;
  isDriverService: boolean;
  isPending: boolean;
  /* Tahap 1: menerima permintaan masuk (CREATED -> PENDING_CONFIRMATION).
     Dipisah dari penetapan tarif karena keduanya keputusan berbeda: menerima
     pesanan, lalu menetapkan harganya. */
  onAcceptRequest: () => void;
  onConfirmBooking: () => void;
  onOpenRejectModal: () => void;
  onTransitionStatus: (status: CanonicalBookingStatus, note?: string) => void;
  /* Membuka modal verifikasi pembayaran dari halaman ini. Tanpa ini admin harus
     kembali ke tab "Verifikasi Pembayaran" lalu mencari pesanan yang sama. */
  onOpenPaymentVerification?: () => void;
  /* Membatalkan pesanan yang sudah dikonfirmasi. Dulu tombol ini hanya ada di
     modal verifikasi pembayaran; sekarang satu pintu di sini supaya staf tidak
     mencari tombol pembatalan di dalam layar verifikasi uang. */
  onOpenCancelModal?: () => void;
};

export function BookingActionSidebar({
  booking,
  document,
  status,
  rawStatus,
  driverDailyRate,
  totalCleanBill,
  hasAssignedDriver,
  isDriverService,
  isPending,
  onAcceptRequest,
  onConfirmBooking,
  onOpenRejectModal,
  onTransitionStatus,
  onOpenPaymentVerification,
  onOpenCancelModal,
}: Props) {
  /* Dua langkah, bukan satu: pesanan diterima dulu, tarifnya ditetapkan kemudian.
     Sebelumnya tombol tunggal mengirim CONFIRMED langsung dari CREATED, dan
     backend menolaknya karena PENDING_CONFIRMATION belum pernah dilewati. */
  const isRequestIncoming = rawStatus === "CREATED";
  const isQuoting = rawStatus === "PENDING_CONFIRMATION";
  const isConfirmed = rawStatus === "CONFIRMED";
  const isInProgress = rawStatus === "IN_PROGRESS";
  const isCompleted = rawStatus === "COMPLETED";
  const isRejected = rawStatus === "REJECTED" || rawStatus === "CANCELLED";

  const statusMeta = BOOKING_STATUS[status] ?? {
    label: rawStatus,
    tone: "neutral" as const,
  };

  /* Jumlah baris penyesuaian manual (diskon, cashback, biaya rute). Ditampilkan
     sebagai satu baris di panel katalog supaya komponen di atasnya benar-benar
     berjumlah sama dengan total di bawahnya. */
  const penyesuaianManual = (booking.lineItems ?? [])
    .filter((item) => item.kind === "penyesuaian")
    .reduce((jumlah, item) => {
      const mentah = item.amount ?? "";
      const negatif = mentah.startsWith("-");
      const angka = Number(mentah.replace(/[^\d]/g, "")) || 0;
      return jumlah + (negatif ? -angka : angka);
    }, 0);

  // Validasi tombol setujui
  const isDriverBlocked = isDriverService && !hasAssignedDriver;
  const isDocumentBlocked = !isDriverService && (document?.status ?? booking.document?.status) !== "VERIFIED";

  /* Penyewa tidak boleh membawa unit keluar sebelum uangnya masuk.
     Pemeriksaan yang sama juga dipasang di backend (`updateStatusWithHistoryAndAudit`),
     jadi tombol yang lolos di sini tetap akan ditolak server; status ini hanya
     supaya alasannya terlihat sebelum admin menekan apa pun. */
  const statusPembayaran = booking.payment?.status ?? null;
  const isPaymentBlocked = statusPembayaran !== "PAID";
  const isPaymentPendingVerification = statusPembayaran === "PENDING_VERIFICATION";

  return (
    <aside className="rounded-lg border border-rule bg-surface p-4 shadow-card space-y-4">
      {/* Header Panel */}
      <div className="border-b border-rule/60 pb-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-body font-bold text-ink">Keputusan &amp; Pengesahan</h2>
          <StatusChip tone={statusMeta.tone}>{statusMeta.label}</StatusChip>
        </div>
        <p className="mt-1 text-micro text-ink-soft">
          ID Pemesanan: <span className="font-semibold text-ink">#{booking.code}</span>
        </p>
      </div>


      {/* Rincian tarif — hanya pada tahap penetapan tarif.
          Nominalnya tidak bisa diketik: server menghitung dari harga katalog unit
          ditambah tarif supir global. Penyesuaian (diskon, tambahan medan) masuk
          lewat baris penyesuaian biaya yang punya justifikasi.

          Bentuknya sengaja ringkas: judul komponen dan harganya saja, lalu satu
          angka total di bawah. Rincian berpanjang (satuan per hari, justifikasi)
          ada di kartu Komponen Biaya, supaya staf tidak melihat dua angka besar
          berbeda di layar yang sama. */}
      {isQuoting ? (
        <div className="rounded-md border border-rule bg-canvas p-3.5 space-y-2">
          <p className="text-meta font-semibold text-ink">Tarif Dihitung dari Katalog</p>
          <dl className="space-y-1 text-micro text-ink-soft">
            <div className="flex items-baseline justify-between gap-2">
              <dt>Sewa unit</dt>
              <dd className="tabular-nums font-semibold text-ink">
                {booking.pricePerDay
                  ? formatRupiah(booking.pricePerDay * (booking.dayCount || 1))
                  : "Harga katalog belum tersedia"}
              </dd>
            </div>
            {isDriverService ? (
              <div className="flex items-baseline justify-between gap-2">
                <dt>Jasa supir</dt>
                <dd className="tabular-nums font-semibold text-ink">
                  {driverDailyRate > 0
                    ? formatRupiah(driverDailyRate * (booking.dayCount || 1))
                    : "Tarif supir belum dimuat"}
                </dd>
              </div>
            ) : null}
            {penyesuaianManual !== 0 ? (
              <div className="flex items-baseline justify-between gap-2">
                <dt>Penyesuaian manual</dt>
                <dd
                  className={`tabular-nums font-semibold ${
                    penyesuaianManual < 0 ? "text-emerald-700" : "text-ink"
                  }`}
                >
                  {`${penyesuaianManual < 0 ? "-" : "+"} ${formatRupiah(
                    Math.abs(penyesuaianManual),
                  )}`}
                </dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between gap-2 border-t border-rule/60 pt-1">
              <dt className="font-semibold text-ink">Total tagihan bersih</dt>
              <dd className="tabular-nums font-bold text-ink">
                {totalCleanBill > 0 ? formatRupiah(totalCleanBill) : "Belum ditetapkan"}
              </dd>
            </div>
          </dl>
        </div>
      ) : isRequestIncoming ? (
        /* Tahap 1: tarif belum ditetapkan. Yang ditampilkan acuan harga katalog,
           supaya admin tidak menyetujui pesanan tanpa gambaran biaya. Sebutannya
           "harga awal", bukan "perkiraan": layar ini dipakai staf, bukan pelanggan,
           jadi tidak perlu bahasa yang meminta maaf atas angka yang belum final. */
        <div className="rounded-md border border-rule bg-canvas p-3">
          <p className="text-micro font-bold uppercase text-ink-soft">Harga Awal</p>
          <p className="mt-1 text-subtitle font-bold text-ink tabular-nums">
            {booking.pricePerDay
              ? formatRupiah(booking.pricePerDay * (booking.dayCount || 1))
              : "Harga katalog belum tersedia"}
          </p>
          {booking.pricePerDay ? (
            <p className="mt-0.5 text-micro text-ink-soft tabular-nums">
              {`${formatRupiah(booking.pricePerDay)}/hari × ${booking.dayCount} hari`}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Total Tagihan Bersih (Live Clean Bill).
          Pada tahap permintaan masuk belum ada tagihan sama sekali, dan pada tahap
          penetapan tarif angkanya sudah menjadi baris penutup di panel katalog —
          jadi kartu ini hanya muncul setelah tarif resmi tersimpan. */}
      {isRequestIncoming || isQuoting ? null : (
        <div className="rounded-md border border-rule bg-canvas p-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-micro font-bold uppercase tracking-wider text-ink-soft">
              Total Tagihan Bersih
            </span>
            <span className="text-subtitle font-bold text-ink tabular-nums">
              {totalCleanBill === 0 ? "Belum ditetapkan" : formatRupiah(totalCleanBill)}
            </span>
          </div>
        </div>
      )}

      {/*
        Tahap 1 — Permintaan Masuk.

        Tombolnya hanya "Terima Permintaan". Tarif belum ditetapkan di sini, dan
        dokumen/supir belum perlu lengkap: yang diputuskan adalah apakah pesanan
        ini diterima, bukan berapa harganya. Memisahkan dua keputusan ini membuat
        admin bisa menerima pesanan lebih dulu lalu menetapkan tarif setelah
        memeriksa ketersediaan unit.
      */}
      {isRequestIncoming ? (
        <div className="space-y-2.5 pt-1">
          <p className="rounded-sm border border-rule bg-canvas p-2.5 text-micro text-ink-soft">
            Setelah diterima, pesanan masuk tahap <strong>Konfirmasi Tarif</strong>.
            Tarif belum ditetapkan pada langkah ini.
          </p>

          {isDocumentBlocked ? (
            <p className="text-micro text-amber-800 bg-amber-50 border border-amber-300 rounded-sm p-2">
              Periksa dan setujui seluruh dokumen lepas kunci di panel kiri sebelum menerima
              permintaan. Menerima permintaan akan menahan unit dari katalog.
            </p>
          ) : null}

          <Button
            variant="confirm"
            size="md"
            className="w-full"
            disabled={isPending || isDocumentBlocked}
            onClick={onAcceptRequest}
          >
            {isPending ? "Memproses..." : "Terima Permintaan"}
          </Button>

          <Button
            variant="outline"
            size="md"
            className="w-full border-rose-300 bg-rose-50/60 font-semibold text-rose-700 hover:border-rose-500 hover:bg-rose-100"
            disabled={isPending}
            onClick={onOpenRejectModal}
          >
            Tolak Permintaan Sewa
          </Button>
        </div>
      ) : null}

      {/*
        Tahap 2 — Konfirmasi Tarif.

        Baru di sini nominal ditetapkan. Syaratnya dokumen terverifikasi (lepas
        kunci) atau supir sudah ditugaskan (dengan sopir), karena setelah ini
        pelanggan menerima tagihan dan masuk tahap menunggu pembayaran.
      */}
      {isQuoting ? (
        <div className="space-y-2.5 pt-1">
          {isDriverBlocked ? (
            <p className="text-micro text-amber-800 bg-amber-50 border border-amber-300 rounded-sm p-2">
              Pilih supir di kolom kiri sebelum menetapkan tarif.
            </p>
          ) : null}

          {isDocumentBlocked ? (
            <p className="text-micro text-amber-800 bg-amber-50 border border-amber-300 rounded-sm p-2">
              Verifikasi seluruh 3 dokumen lepas kunci di panel kiri sebelum menetapkan tarif.
            </p>
          ) : null}

          {/* Rute tidak lagi dipilih di sini. Biaya rute, diskon, dan cashback
              semuanya dicatat sebagai baris penyesuaian manual (surcharge) di
              kartu rincian biaya, sesuai ketentuan kantor. */}
          <Button
            variant="confirm"
            size="md"
            className="w-full"
            disabled={isPending || isDriverBlocked || isDocumentBlocked}
            onClick={onConfirmBooking}
          >
            {isPending ? "Memproses..." : "Tetapkan Tarif & Lanjutkan"}
          </Button>

          <p className="text-micro text-ink-soft">
            Setelah tarif ditetapkan, pesanan masuk tahap <strong>Menunggu Pembayaran</strong> dan
            pelanggan menerima tagihan.
          </p>

          <Button
            variant="outline"
            size="md"
            className="w-full border-rose-300 bg-rose-50/60 font-semibold text-rose-700 hover:border-rose-500 hover:bg-rose-100"
            disabled={isPending}
            onClick={onOpenRejectModal}
          >
            Tolak Permintaan Sewa
          </Button>
        </div>
      ) : null}

      {/* Lifecycle Advance Actions */}
      {isConfirmed ? (
        <div className="rounded-md border border-rule bg-canvas p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-meta font-semibold text-ink">
              {isPaymentBlocked ? "Menunggu Pembayaran" : "Siap Serah Terima"}
            </p>
            <StatusChip tone={isPaymentBlocked ? "pending" : "available"}>
              {isPaymentBlocked ? "Belum Lunas" : "Siap Serah Terima"}
            </StatusChip>
          </div>

          {isPaymentBlocked ? (
            <>
              <p
                className={
                  statusPembayaran === "FAILED"
                    ? "text-micro text-rose-800 bg-rose-50 border border-rose-300 rounded-sm p-2"
                    : "text-micro text-amber-800 bg-amber-50 border border-amber-300 rounded-sm p-2"
                }
              >
                {statusPembayaran === "FAILED"
                  ? "Bukti transfer sebelumnya ditolak. Menunggu pelanggan mengunggah ulang bukti baru sebelum verifikasi dapat dilanjutkan."
                  : statusPembayaran === "PENDING_VERIFICATION"
                    ? "Pembayaran pesanan ini belum diverifikasi (bukti transfer sudah diunggah, menunggu pemeriksaan admin). Verifikasi dulu sebelum menyerahkan armada."
                    : "Pembayaran pesanan ini belum diverifikasi. Menunggu pelanggan menyelesaikan pembayaran sebelum menyerahkan armada."}
              </p>
              <Button
                variant="outline"
                size="md"
                className="w-full border-navy font-semibold text-navy hover:bg-navy/5"
                disabled={isPending || !onOpenPaymentVerification}
                onClick={onOpenPaymentVerification}
              >
                {statusPembayaran === "FAILED"
                  ? "Lihat Bukti Ditolak"
                  : "Verifikasi Pembayaran"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-micro text-ink-soft">
                Pembayaran sudah terverifikasi lunas. Serahkan kunci dan unit armada untuk
                memulai masa sewa berjalan.
              </p>
              <Button
                variant="confirm"
                size="md"
                className="w-full"
                disabled={isPending}
                onClick={() =>
                  onTransitionStatus("IN_PROGRESS", "Unit diserahkan kepada penyewa. Sewa berjalan.")
                }
              >
                {isPending ? "Memproses..." : "Serahkan Armada (Mulai Sewa Berjalan)"}
              </Button>
            </>
          )}

          {onOpenCancelModal ? (
            <div className="space-y-1.5">
              <Button
                variant="outline"
                size="md"
                className="w-full border-rose-300 bg-rose-50/60 font-semibold text-rose-700 hover:border-rose-500 hover:bg-rose-100"
                disabled={isPending || isPaymentPendingVerification}
                onClick={onOpenCancelModal}
              >
                Batalkan Pesanan
              </Button>
              {isPaymentPendingVerification ? (
                <p className="text-micro text-amber-800">
                  Pembatalan dikunci selama bukti bayar menunggu pemeriksaan. Verifikasi bukti
                  pembayaran terlebih dahulu.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {isInProgress ? (
        <div className="rounded-md border border-rule bg-canvas p-3 space-y-2.5">
          <p className="text-meta font-semibold text-ink">Pengembalian &amp; Penyelesaian</p>
          <p className="text-micro text-ink-soft">
            Sewa selesai otomatis begitu jadwalnya berakhir. Tombol di bawah hanya untuk
            pengembalian lebih awal: periksa kondisi fisik unit, tingkat BBM, lalu lepaskan
            supir kembali ke status Siaga.
          </p>
          <Button
            variant="confirm"
            size="md"
            className="w-full"
            disabled={isPending}
            onClick={() =>
              onTransitionStatus(
                "COMPLETED",
                "Unit armada dikembalikan lebih awal dalam kondisi baik. Sewa selesai.",
              )
            }
          >
            {isPending ? "Memproses..." : "Selesaikan Lebih Awal (Unit Dikembalikan)"}
          </Button>
        </div>
      ) : null}

      {isCompleted ? (
        <div className="rounded-md border border-teal/40 bg-teal/10 p-3 text-meta text-teal">
          <p className="font-semibold">Pemesanan ini telah selesai.</p>
          <p className="mt-0.5 text-micro text-ink">
            Armada telah kembali ke kantor dan seluruh kewajiban sewa telah terpenuhi.
          </p>
        </div>
      ) : null}

      {isRejected ? (
        <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-meta text-danger">
          <p className="font-semibold">Pemesanan ditolak / dibatalkan.</p>
          <p className="mt-0.5 text-micro text-ink">
            Tidak ada tindakan operasional lebih lanjut yang diperlukan.
          </p>
        </div>
      ) : null}
    </aside>
  );
}
