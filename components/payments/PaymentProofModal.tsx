"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusChip } from "@/components/ui/StatusChip";
import { IconAlert, IconCreditCard } from "@/components/ui/icons";
import { formatRupiah } from "@/lib/format";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS } from "@/lib/labels";
import { apiClient } from "@/lib/axios";
import type { AdminPaymentItem } from "@/lib/types";

type Props = {
  payment: AdminPaymentItem | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (updated: AdminPaymentItem, action: "APPROVE" | "REJECT") => void;
};

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const cleanBase = baseUrl.replace(/\/api\/v1\/?$/, "");
  return `${cleanBase}${url.startsWith("/") ? url : `/${url}`}`;
}

export function PaymentProofModal({ payment, open, onClose, onSuccess }: Props) {
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  if (!payment) return null;

  const resolvedImageUrl = resolveImageUrl(payment.proofImageUrl);
  const isPending = payment.status === "PENDING_VERIFICATION";
  const statusConfig = PAYMENT_STATUS[payment.status] ?? {
    label: payment.status,
    tone: "neutral" as const,
  };

  async function handleVerify(action: "APPROVE" | "REJECT") {
    if (!payment) return;
    if (action === "REJECT" && !notes.trim()) {
      setError("Mohon isi alasan penolakan pada kolom catatan verifikasi.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await apiClient.patch(`/admin/payments/${encodeURIComponent(payment.id)}/verify`, {
        action,
        notes: notes.trim() || undefined,
      });

      const updated = (res.data?.data || res.data) as AdminPaymentItem;
      onSuccess?.(updated, action);
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || "Gagal memproses verifikasi pembayaran. Silakan coba lagi.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const modalFooter = (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
        Tutup
      </Button>

      {isPending ? (
        <div className="flex items-center gap-2">
          <Button
            variant="danger"
            onClick={() => handleVerify("REJECT")}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Memproses..." : "Tolak Pembayaran"}
          </Button>
          <Button
            variant="confirm"
            onClick={() => handleVerify("APPROVE")}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Memproses..." : "Setujui Pembayaran"}
          </Button>
        </div>
      ) : (
        <div className="text-meta text-ink-soft">
          {payment.status === "PAID"
            ? "Pembayaran ini sudah lunas terverifikasi."
            : "Status pembayaran: " + statusConfig.label}
        </div>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Periksa Bukti & Verifikasi Pembayaran"
      description={`Kode Booking: ${payment.booking?.bookingCode || payment.bookingId}`}
      footer={modalFooter}
    >
      <div className="space-y-4">
        {error ? (
          <div className="flex items-start gap-2.5 rounded-sm border border-danger/20 bg-danger/5 p-3 text-meta text-danger">
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1">{error}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Kolom Kiri: Pratinjau Gambar Bukti Transfer */}
          <div className="flex flex-col gap-2">
            <p className="text-micro font-semibold uppercase text-ink-soft">
              Bukti Transfer Pelanggan
            </p>
            <div className="relative flex min-h-[260px] flex-col items-center justify-center overflow-hidden rounded-md border border-rule-strong bg-canvas p-2">
              {resolvedImageUrl && !imageError ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolvedImageUrl}
                    alt="Bukti Transfer Pelanggan"
                    onError={() => setImageError(true)}
                    className="max-h-[340px] w-auto max-w-full rounded object-contain shadow-xs transition-transform hover:scale-[1.02]"
                  />
                  <div className="mt-2 flex w-full justify-center">
                    <a
                      href={resolvedImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-micro font-medium text-teal hover:underline"
                    >
                      Buka Gambar Asli di Tab Baru &rarr;
                    </a>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-ink-soft">
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-soft shadow-xs">
                    <IconCreditCard className="h-6 w-6" />
                  </div>
                  <p className="text-meta font-medium text-ink">
                    {payment.method === "QRIS"
                      ? "Pembayaran Otomatis QRIS"
                      : payment.method === "CASH"
                        ? "Pembayaran Tunai di Tempat (COD)"
                        : "Tidak Ada Gambar Bukti"}
                  </p>
                  <p className="mt-1 max-w-[28ch] text-micro">
                    {payment.method === "QRIS"
                      ? "Verifikasi mutasi QRIS Gopay Merchant diverifikasi melalui webhook atau pencocokan nominal pas."
                      : payment.method === "CASH"
                        ? "Pelanggan membayar secara tunai saat serah terima unit di Merauke."
                        : "Pelanggan belum mengunggah gambar struk transfer."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Rincian Pembayaran & Rekonsiliasi */}
          <div className="flex flex-col gap-3.5">
            <div className="rounded-md border border-rule bg-canvas p-3.5">
              <p className="text-micro font-semibold uppercase text-ink-soft">
                Rincian Tagihan & Kode Unik
              </p>

              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-meta">
                  <span className="text-ink-soft">Tarif Dasar Sewa:</span>
                  <span className="font-medium text-ink tabular-nums">
                    {formatRupiah(payment.baseAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-meta">
                  <span className="text-ink-soft">Kode Unik 3-Digit:</span>
                  <span className="rounded-xs bg-gold/30 px-1.5 py-0.5 font-semibold text-ink tabular-nums">
                    +{formatRupiah(payment.uniqueCode)}
                  </span>
                </div>
                <div className="border-t border-rule pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-body font-semibold text-ink">Total Nominal Pas:</span>
                    <span className="text-subtitle font-bold text-navy tabular-nums">
                      {formatRupiah(payment.totalAmount)}
                    </span>
                  </div>
                  <p className="mt-1 text-micro text-ink-soft">
                    *Nominal mutasi rekening harus sama persis hingga 3 digit terakhir.
                  </p>
                </div>
              </div>
            </div>

            {/* Informasi Pelanggan & Rekening */}
            <div className="grid grid-cols-2 gap-2 text-meta">
              <div>
                <p className="text-micro font-semibold uppercase text-ink-soft">Pelanggan</p>
                <p className="font-medium text-ink">
                  {payment.booking?.customer?.fullName || "Pelanggan"}
                </p>
                {payment.booking?.customer?.phoneNumber ? (
                  <p className="text-micro text-ink-soft">
                    {payment.booking.customer.phoneNumber}
                  </p>
                ) : null}
              </div>

              <div>
                <p className="text-micro font-semibold uppercase text-ink-soft">Status Tagihan</p>
                <div className="mt-1">
                  <StatusChip tone={statusConfig.tone}>{statusConfig.label}</StatusChip>
                </div>
              </div>

              <div>
                <p className="text-micro font-semibold uppercase text-ink-soft">Metode Bayar</p>
                <p className="font-medium text-ink">
                  {PAYMENT_METHOD_LABEL[payment.method] || payment.method}
                </p>
                {payment.bankName ? (
                  <p className="text-micro text-ink-soft">{payment.bankName}</p>
                ) : null}
              </div>

              <div>
                <p className="text-micro font-semibold uppercase text-ink-soft">Rekening Pengirim</p>
                <p className="font-medium text-ink">
                  {payment.senderAccount || "-"}
                </p>
              </div>
            </div>

            {/* Input Catatan Staf / Alasan Penolakan */}
            <div className="mt-1">
              <label htmlFor="verify-notes" className="block text-meta font-medium text-ink">
                Catatan Verifikasi / Alasan Penolakan {isPending ? "(Wajib jika ditolak)" : ""}
              </label>
              <textarea
                id="verify-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tuliskan catatan rekonsiliasi m-banking atau alasan jika menolak bukti..."
                className="mt-1 w-full rounded-sm border border-rule-strong bg-surface p-2.5 text-body text-ink placeholder:text-ink-soft/60 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
