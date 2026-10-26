"use client";

import { useState, useTransition } from "react";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip, type ChipTone } from "@/components/ui/StatusChip";
import { verifyBookingDocumentsAction } from "@/app/actions";
import type { Booking, BookingDocument, BookingDocumentStatus } from "@/lib/types";

type Props = {
  booking: Booking;
  onDocumentUpdated?: (doc: BookingDocument) => void;
};

const STATUS_CONFIG: Record<
  BookingDocumentStatus,
  { label: string; tone: ChipTone; description: string }
> = {
  PENDING_UPLOAD: {
    label: "Menunggu Unggahan",
    tone: "neutral",
    description:
      "Pelanggan belum mengunggah seluruh dokumen persyaratan. Pelanggan juga dapat mengisi formulir fisik saat serah terima di kantor Merauke.",
  },
  PENDING_VERIFICATION: {
    label: "Menunggu Verifikasi",
    tone: "pending",
    description:
      "Pelanggan telah mengunggah dokumen persyaratan. Harap periksa keabsahan KTP, SIM A aktif, dan tanda tangan basah pada surat pernyataan.",
  },
  VERIFIED: {
    label: "Terverifikasi & Disetujui",
    tone: "available",
    description:
      "Seluruh dokumen persyaratan telah diperiksa dan dinyatakan memenuhi standar sewa lepas kunci PT MobilJuragan Trans Merauke.",
  },
  REJECTED: {
    label: "Ditolak (Perlu Perbaikan)",
    tone: "danger",
    description:
      "Dokumen belum memenuhi kualifikasi. Pelanggan telah diminta memperbaiki atau melengkapi dokumen melalui aplikasi mobile.",
  },
};

export function LepasKunciDocumentReviewCard({ booking, onDocumentUpdated }: Props) {
  const [document, setDocument] = useState<BookingDocument | null>(booking.document ?? null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [previewModalTitle, setPreviewModalTitle] = useState<string>("");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [notice, setNotice] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentStatus: BookingDocumentStatus = document?.status ?? "PENDING_UPLOAD";
  const config = STATUS_CONFIG[currentStatus];

  const hasStatement = Boolean(document?.statementLetterUrl);
  const hasKtp = Boolean(document?.ktpUrl);
  const hasSim = Boolean(document?.simUrl);
  const uploadedCount = [hasStatement, hasKtp, hasSim].filter(Boolean).length;

  function handleVerify(action: "APPROVE" | "REJECT", reason?: string) {
    startTransition(async () => {
      setNotice(null);
      const res = await verifyBookingDocumentsAction(booking.id, action, reason);

      if (res.success && res.data) {
        setDocument(res.data);
        onDocumentUpdated?.(res.data);
        setNotice({ text: res.message || "Status dokumen berhasil diperbarui." });
        if (action === "REJECT") {
          setIsRejectModalOpen(false);
          setRejectionReason("");
        }
      } else {
        setNotice({
          text: res.message || "Gagal memproses verifikasi dokumen.",
          isError: true,
        });
      }
    });
  }

  function openPreview(url: string, title: string) {
    setPreviewModalUrl(url);
    setPreviewModalTitle(title);
  }

  return (
    <>
      <Panel
        title="Dokumen Persyaratan Lepas Kunci"
        action={<StatusChip tone={config.tone}>{config.label}</StatusChip>}
      >
        <div className="space-y-4">
          {notice && (
            <div
              className={`rounded-md border p-3 text-meta ${
                notice.isError
                  ? "border-danger/40 bg-danger-soft/10 text-danger"
                  : "border-teal/40 bg-teal/10 text-teal"
              }`}
            >
              {notice.text}
            </div>
          )}

          {/* Deskripsi status dan catatan penolakan jika ada */}
          <div className="rounded-md border border-rule bg-canvas p-3.5 space-y-1.5">
            <p className="text-meta font-medium text-ink">{config.description}</p>
            {document?.rejectionReason && currentStatus === "REJECTED" && (
              <div className="mt-2 rounded border border-danger/30 bg-surface p-2 text-micro text-danger">
                <span className="font-semibold">Alasan Penolakan: </span>
                {document.rejectionReason}
              </div>
            )}
            {document?.verifiedBy && currentStatus === "VERIFIED" && (
              <p className="text-micro text-ink-soft">
                Diverifikasi oleh: <span className="font-medium text-ink">{document.verifiedBy}</span>
                {document.verifiedAt ? ` pada ${new Date(document.verifiedAt).toLocaleString("id-ID")}` : ""}
              </p>
            )}
          </div>

          {/* Ringkasan status kelengkapan 3 slot berkas */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Slot 1: Surat Pernyataan Tanda Tangan Basah */}
            <div className="flex flex-col justify-between rounded-md border border-rule bg-surface p-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-micro font-semibold uppercase text-ink-soft tracking-wider">
                    Surat Pernyataan
                  </span>
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      hasStatement ? "bg-teal" : "bg-rule-strong"
                    }`}
                  />
                </div>
                <p className="mt-1 text-meta font-medium text-ink">
                  Bebas Narkoba &amp; Anti Penggelapan
                </p>
                <p className="mt-0.5 text-micro text-ink-soft">Wajib tanda tangan basah penyewa</p>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {hasStatement ? (
                  <button
                    type="button"
                    onClick={() => openPreview(document!.statementLetterUrl!, "Surat Pernyataan TTD Basah")}
                    className="flex-1 rounded border border-navy bg-navy/5 py-1.5 text-center text-micro font-medium text-navy hover:bg-navy/10"
                  >
                    Lihat Berkas
                  </button>
                ) : (
                  <span className="flex-1 rounded border border-dashed border-rule py-1.5 text-center text-micro text-ink-soft">
                    Belum Diunggah
                  </span>
                )}
              </div>
            </div>

            {/* Slot 2: Foto KTP Asli */}
            <div className="flex flex-col justify-between rounded-md border border-rule bg-surface p-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-micro font-semibold uppercase text-ink-soft tracking-wider">
                    Identitas KTP
                  </span>
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      hasKtp ? "bg-teal" : "bg-rule-strong"
                    }`}
                  />
                </div>
                <p className="mt-1 text-meta font-medium text-ink">Foto Fisik e-KTP Asli</p>
                <p className="mt-0.5 text-micro text-ink-soft">Nama harus sesuai data pemesan</p>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {hasKtp ? (
                  <button
                    type="button"
                    onClick={() => openPreview(document!.ktpUrl!, "Foto Fisik e-KTP Asli")}
                    className="flex-1 rounded border border-navy bg-navy/5 py-1.5 text-center text-micro font-medium text-navy hover:bg-navy/10"
                  >
                    Lihat Foto
                  </button>
                ) : (
                  <span className="flex-1 rounded border border-dashed border-rule py-1.5 text-center text-micro text-ink-soft">
                    Belum Diunggah
                  </span>
                )}
              </div>
            </div>

            {/* Slot 3: Foto SIM A Aktif */}
            <div className="flex flex-col justify-between rounded-md border border-rule bg-surface p-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-micro font-semibold uppercase text-ink-soft tracking-wider">
                    Lisensi SIM A
                  </span>
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      hasSim ? "bg-teal" : "bg-rule-strong"
                    }`}
                  />
                </div>
                <p className="mt-1 text-meta font-medium text-ink">Foto Fisik SIM A Aktif</p>
                <p className="mt-0.5 text-micro text-ink-soft">Masa berlaku masih aktif</p>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {hasSim ? (
                  <button
                    type="button"
                    onClick={() => openPreview(document!.simUrl!, "Foto Fisik SIM A Aktif")}
                    className="flex-1 rounded border border-navy bg-navy/5 py-1.5 text-center text-micro font-medium text-navy hover:bg-navy/10"
                  >
                    Lihat Foto
                  </button>
                ) : (
                  <span className="flex-1 rounded border border-dashed border-rule py-1.5 text-center text-micro text-ink-soft">
                    Belum Diunggah
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Unduhan template acuan dan aksi verifikasi admin */}
          <div className="flex flex-col gap-3 pt-2 border-t border-rule sm:flex-row sm:items-center sm:justify-between">
            <a
              href="http://localhost:4000/api/v1/documents/template/surat-pernyataan-lepas-kunci.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-micro font-medium text-navy hover:underline inline-flex items-center gap-1.5"
            >
              Unduh Template Resmi Surat Pernyataan (PDF)
            </a>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPending || uploadedCount === 0}
                onClick={() => setIsRejectModalOpen(true)}
                className="rounded-sm border border-danger/40 px-3 py-1.5 text-meta font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
              >
                Tolak / Minta Revisi
              </button>

              <button
                type="button"
                disabled={isPending || uploadedCount === 0 || currentStatus === "VERIFIED"}
                onClick={() => handleVerify("APPROVE")}
                className="rounded-sm bg-teal px-3.5 py-1.5 text-meta font-medium text-white hover:bg-teal/90 disabled:opacity-50"
              >
                {isPending ? "Memproses..." : "Setujui Seluruh Dokumen"}
              </button>
            </div>
          </div>
        </div>
      </Panel>

      {/* Modal Pratinjau Gambar / Dokumen */}
      {previewModalUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-md border border-rule bg-surface p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-rule">
              <h3 className="text-subtitle font-bold text-ink">{previewModalTitle}</h3>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="rounded-sm px-2 py-1 text-meta text-ink-soft hover:bg-canvas hover:text-ink"
              >
                Tutup
              </button>
            </div>

            <div className="mt-3 flex-1 overflow-auto rounded bg-canvas p-2 flex items-center justify-center min-h-[300px]">
              {previewModalUrl.startsWith("data:image/") ||
              (previewModalUrl.startsWith("http") && !previewModalUrl.endsWith(".pdf")) ? (
                <div className="relative max-h-[70vh] w-full flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewModalUrl}
                    alt={previewModalTitle}
                    className="max-h-[70vh] max-w-full rounded object-contain"
                  />
                </div>
              ) : (
                <iframe
                  src={previewModalUrl}
                  title={previewModalTitle}
                  className="h-[65vh] w-full rounded border border-rule"
                />
              )}
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="rounded-sm border border-rule bg-surface px-4 py-1.5 text-meta font-medium text-ink hover:bg-canvas"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Alasan Penolakan Dokumen */}
      {isRejectModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-md border border-rule bg-surface p-5 shadow-lg">
            <h3 className="text-subtitle font-bold text-ink">Alasan Penolakan Dokumen</h3>
            <p className="mt-1.5 text-meta text-ink-soft">
              Berikan penjelasan spesifik agar pelanggan dapat segera memperbaiki dokumen yang diunggah
              melalui aplikasi mobile.
            </p>

            <div className="mt-4 space-y-2">
              <label htmlFor="rejection-input" className="block text-micro font-semibold text-ink">
                Catatan Penolakan / Permintaan Revisi:
              </label>
              <textarea
                id="rejection-input"
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Contoh: Foto SIM buram pada bagian masa berlaku, mohon ambil foto ulang dengan pencahayaan jelas."
                className="w-full rounded border border-rule bg-canvas p-2.5 text-meta text-ink focus:border-navy focus:outline-none"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectionReason("");
                }}
                disabled={isPending}
                className="rounded-sm border border-rule px-3 py-1.5 text-meta font-medium text-ink hover:bg-canvas"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending || !rejectionReason.trim()}
                onClick={() => handleVerify("REJECT", rejectionReason.trim())}
                className="rounded-sm bg-danger px-4 py-1.5 text-meta font-medium text-white hover:bg-danger/90 disabled:opacity-50"
              >
                {isPending ? "Mengirim..." : "Kirim Penolakan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
