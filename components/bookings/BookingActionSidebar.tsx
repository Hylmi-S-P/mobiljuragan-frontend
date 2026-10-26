"use client";

import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatRupiah, formatRupiahDots, parseRupiahDots } from "@/lib/format";
import { BOOKING_STATUS } from "@/lib/labels";
import { TARIFF_PENDING_NOTE } from "@/lib/uiText";
import type { Booking, BookingDocument, BookingStatus, CanonicalBookingStatus } from "@/lib/types";

type Props = {
  booking: Booking;
  document?: BookingDocument | null;
  status: BookingStatus;
  rawStatus: CanonicalBookingStatus;
  quotedAmount: number;
  onQuotedAmountChange: (amount: number) => void;
  totalCleanBill: number;
  hasAssignedDriver: boolean;
  isDriverService: boolean;
  isPending: boolean;
  notice: { text: string; isError?: boolean } | null;
  onConfirmBooking: () => void;
  onOpenRejectModal: () => void;
  onTransitionStatus: (status: CanonicalBookingStatus, note?: string) => void;
  whatsappUrl: string | null;
};

export function BookingActionSidebar({
  booking,
  document,
  status,
  rawStatus,
  quotedAmount,
  onQuotedAmountChange,
  totalCleanBill,
  hasAssignedDriver,
  isDriverService,
  isPending,
  notice,
  onConfirmBooking,
  onOpenRejectModal,
  onTransitionStatus,
  whatsappUrl,
}: Props) {
  const canDecide = rawStatus === "CREATED" || rawStatus === "PENDING_CONFIRMATION";
  const isConfirmed = rawStatus === "CONFIRMED";
  const isInProgress = rawStatus === "IN_PROGRESS";
  const isCompleted = rawStatus === "COMPLETED";
  const isRejected = rawStatus === "REJECTED" || rawStatus === "CANCELLED";

  const statusMeta = BOOKING_STATUS[status] ?? {
    label: rawStatus,
    tone: "neutral" as const,
  };

  // Validasi tombol setujui
  const isDriverBlocked = isDriverService && !hasAssignedDriver;
  const isDocumentBlocked = !isDriverService && (document?.status ?? booking.document?.status) !== "VERIFIED";

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

      {/* Notice / Feedback Banner */}
      {notice ? (
        <div
          className={`rounded-md border p-3 text-meta ${
            notice.isError
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-teal/40 bg-teal/10 text-teal"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="font-bold">{notice.isError ? "!" : "&#10003;"}</span>
            <p className="text-meta">{notice.text}</p>
          </div>
        </div>
      ) : null}

      {/* Form Input Nominal Tarif Sewa Resmi */}
      {canDecide ? (
        <div className="rounded-md border border-rule bg-canvas p-3.5 space-y-2">
          <label htmlFor="sidebar-quoted-amount" className="block text-meta font-semibold text-ink">
            Nominal Tarif Sewa Dasar
          </label>
          <div className="relative flex items-center">
            <span className="inline-flex h-11 items-center rounded-l-sm border border-r-0 border-rule-strong bg-rule/20 px-3.5 text-body font-bold text-ink">
              Rp
            </span>
            <input
              id="sidebar-quoted-amount"
              type="text"
              inputMode="numeric"
              value={quotedAmount ? formatRupiahDots(quotedAmount) : ""}
              onChange={(e) => {
                const parsed = parseRupiahDots(e.target.value);
                onQuotedAmountChange(Math.min(100000000, parsed));
              }}
              placeholder="Contoh: 750.000"
              className="tabular-nums h-11 w-full rounded-r-sm border border-rule-strong bg-surface px-3 text-body font-bold text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-rule bg-canvas p-3">
          <p className="text-micro font-bold uppercase text-ink-soft">Tarif Sewa Dasar Resmi</p>
          <p className="mt-1 text-subtitle font-bold text-ink tabular-nums">
            {formatRupiah(quotedAmount)}
          </p>
        </div>
      )}

      {/* Total Tagihan Bersih (Live Clean Bill) */}
      <div className="rounded-md border border-rule bg-canvas p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-micro font-bold uppercase tracking-wider text-ink-soft">
            Total Tagihan Bersih
          </span>
          <span className="text-subtitle font-bold text-ink tabular-nums">
            {canDecide && totalCleanBill === 0
              ? "Belum ditetapkan"
              : formatRupiah(totalCleanBill)}
          </span>
        </div>
      </div>

      {/* Primary Decision Actions (CREATED / PENDING_CONFIRMATION) */}
      {canDecide ? (
        <div className="space-y-2.5 pt-1">
          {isDriverBlocked ? (
            <p className="text-micro text-amber-800 bg-amber-50 border border-amber-300 rounded-sm p-2">
              Pilih supir di kolom kiri sebelum menyetujui pesanan.
            </p>
          ) : null}

          {isDocumentBlocked ? (
            <p className="text-micro text-amber-800 bg-amber-50 border border-amber-300 rounded-sm p-2">
              Verifikasi seluruh 3 dokumen lepas kunci di panel kiri sebelum mengonfirmasi tarif.
            </p>
          ) : null}

          <Button
            variant="confirm"
            size="md"
            className="w-full"
            disabled={isPending || isDriverBlocked || isDocumentBlocked}
            onClick={onConfirmBooking}
          >
            {isPending ? "Memproses..." : "Konfirmasi Tarif & Setujui Booking"}
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

      {/* Lifecycle Advance Actions */}
      {isConfirmed ? (
        <div className="rounded-md border border-rule bg-canvas p-3 space-y-2.5">
          <p className="text-meta font-semibold text-ink">Serah Terima Armada</p>
          <p className="text-micro text-ink-soft">
            Pembayaran telah diverifikasi atau COD disepakati. Serahkan kunci dan unit armada untuk memulai masa sewa berjalan.
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
        </div>
      ) : null}

      {isInProgress ? (
        <div className="rounded-md border border-rule bg-canvas p-3 space-y-2.5">
          <p className="text-meta font-semibold text-ink">Pengembalian &amp; Penyelesaian</p>
          <p className="text-micro text-ink-soft">
            Periksa kondisi fisik unit, tingkat BBM, dan lepaskan supir kembali ke status Siaga di kantor Merauke.
          </p>
          <Button
            variant="confirm"
            size="md"
            className="w-full"
            disabled={isPending}
            onClick={() =>
              onTransitionStatus(
                "COMPLETED",
                "Unit armada dikembalikan dalam kondisi baik. Sewa selesai.",
              )
            }
          >
            {isPending ? "Memproses..." : "Selesaikan Sewa & Kembalikan Armada"}
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

      {/* WhatsApp Intent Link */}
      {whatsappUrl ? (
        <div className="border-t border-rule/60 pt-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-[#25D366] bg-[#25D366]/10 text-body font-semibold text-[#128C7E] hover:bg-[#25D366]/20 transition-colors"
          >
            Buka Pesan WhatsApp Konfirmasi
          </a>
        </div>
      ) : null}
    </aside>
  );
}
