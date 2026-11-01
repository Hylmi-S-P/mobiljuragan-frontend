"use client";

import { useState, useTransition } from "react";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip, type ChipTone } from "@/components/ui/StatusChip";
import { verifyBookingDocumentsAction } from "@/app/actions";
import { isPdfUrl, resolveDocumentUrl } from "@/lib/documentUrl";
import type { Booking, BookingDocument, BookingDocumentStatus } from "@/lib/types";

/* Alamat API dipakai untuk tautan unduhan yang dibuka di tab baru (tidak lewat
   server action). */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

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

type DocumentTargetKey = "KTP" | "SIM" | "STATEMENT";

/* Satu penolakan bisa mengenai lebih dari satu dokumen: KTP buram dan SIM
   kedaluwarsa adalah dua masalah berbeda pada satu pengajuan. Karena itu ini
   pilihan berganda, bukan salah-satu. */
const TARGET_OPTIONS: { key: DocumentTargetKey; label: string; hint: string }[] = [
  { key: "KTP", label: "e-KTP", hint: "Foto KTP asli" },
  { key: "SIM", label: "SIM A", hint: "SIM A aktif" },
  { key: "STATEMENT", label: "Surat Pernyataan", hint: "TTD basah" },
];

/* Catatan cepat = jalan pintas menulis, bukan label terpisah. Yang dikirim ke
   pelanggan tetap satu kalimat di kolom catatan, dan admin boleh mengubahnya.
   Dikelompokkan supaya admin tidak memindai satu daftar panjang. */
const QUICK_NOTES: { group: string; notes: string[] }[] = [
  {
    group: "Kualitas foto",
    notes: [
      "Foto buram / tidak fokus",
      "Bagian dokumen terpotong",
      "Silau / pantulan cahaya",
      "Terlalu gelap untuk dibaca",
      "Foto hasil cetak ulang atau tangkapan layar",
    ],
  },
  {
    group: "Isi dokumen",
    notes: [
      "Nama tidak sesuai data pemesan",
      "Masa berlaku sudah habis",
      "SIM bukan golongan A",
      "Nomor identitas tidak terbaca",
    ],
  },
  {
    group: "Surat pernyataan",
    notes: [
      "Tanda tangan basah belum ada",
      "Meterai belum ditempel",
      "Kota dan tanggal belum diisi",
    ],
  },
  {
    group: "Lainnya",
    notes: [
      "Berkas yang diunggah bukan dokumen yang diminta",
      "Dokumen perlu diperiksa langsung di kantor",
      "Unggahan gagal terbaca oleh sistem, mohon kirim ulang",
    ],
  },
];

const TARGET_LABEL: Record<DocumentTargetKey, string> = {
  KTP: "e-KTP",
  SIM: "SIM A",
  STATEMENT: "Surat Pernyataan",
};

export function LepasKunciDocumentReviewCard({ booking, onDocumentUpdated }: Props) {
  const [document, setDocument] = useState<BookingDocument | null>(booking.document ?? null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [previewModalTitle, setPreviewModalTitle] = useState<string>("");
  const [previewFailed, setPreviewFailed] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionTargets, setRejectionTargets] = useState<DocumentTargetKey[]>([]);
  const [notice, setNotice] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleTarget(key: DocumentTargetKey) {
    setRejectionTargets((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  }

  function handleAppendReason(reason: string) {
    setRejectionReason((prev) => {
      const trimmed = prev.trim();
      // Kalimat yang sudah ada tidak ditambahkan dua kali saat chip diklik ulang.
      if (trimmed.toLowerCase().includes(reason.toLowerCase())) {
        return trimmed;
      }
      if (!trimmed) return reason;
      return `${trimmed.replace(/[.;]+$/, "")}. ${reason}`;
    });
  }

  function handleRemoveReason(reason: string) {
    // Catatan disusun sebagai kalimat yang dipisah titik; menghapus chip berarti
    // membuang kalimat yang persis sama, bukan memotong teks di tengah kata.
    setRejectionReason((prev) =>
      prev
        .split(". ")
        .map((part) => part.replace(/\.$/, "").trim())
        .filter((part) => part.toLowerCase() !== reason.toLowerCase())
        .join(". "),
    );
  }

  function resetRejectForm() {
    setIsRejectModalOpen(false);
    setRejectionReason("");
    setRejectionTargets([]);
  }

  const currentStatus: BookingDocumentStatus = document?.status ?? "PENDING_UPLOAD";
  const config = STATUS_CONFIG[currentStatus];

  const hasStatement = Boolean(document?.statementLetterUrl);
  const hasKtp = Boolean(document?.ktpUrl);
  const hasSim = Boolean(document?.simUrl);
  const uploadedCount = [hasStatement, hasKtp, hasSim].filter(Boolean).length;

  function handleVerify(action: "APPROVE" | "REJECT", reason?: string, targets?: string[]) {
    startTransition(async () => {
      setNotice(null);
      const res = await verifyBookingDocumentsAction(booking.id, action, reason, targets);

      if (res.success && res.data) {
        setDocument(res.data);
        onDocumentUpdated?.(res.data);
        setNotice({ text: res.message || "Status dokumen berhasil diperbarui." });
        if (action === "REJECT") {
          resetRejectForm();
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
    setPreviewFailed(false);
    setPreviewModalUrl(resolveDocumentUrl(url));
    setPreviewModalTitle(title);
  }

  function closePreview() {
    setPreviewModalUrl(null);
    setPreviewFailed(false);
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
            {/* Dokumen yang ditolak ditampilkan terpisah supaya admin berikutnya
                tahu berkas mana yang sedang menunggu perbaikan. */}
            {currentStatus === "REJECTED" && (document?.rejectionTargets?.length ?? 0) > 0 && (
              <p className="mt-1.5 text-micro text-ink-soft">
                <span className="font-semibold text-danger">Perlu difoto ulang: </span>
                {document!.rejectionTargets!
                  .map((target) => TARGET_LABEL[target as DocumentTargetKey] ?? target)
                  .join(", ")}
              </p>
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
            {/* Blanko kosong, bukan surat terisi otomatis: yang sah adalah hasil
                pindaian bertanda tangan basah dari penyewa. */}
            <a
              href={`${API_BASE_URL}/documents/template/surat-pernyataan-lepas-kunci.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-micro font-medium text-navy hover:underline inline-flex items-center gap-1.5"
            >
              Unduh Template Surat Pernyataan (PDF)
            </a>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {uploadedCount < 3 && currentStatus !== "VERIFIED" && currentStatus !== "REJECTED" && (
                <span className="text-micro text-amber-800">
                  Menunggu pelanggan mengunggah seluruh dokumen ({uploadedCount}/3).
                </span>
              )}
              {currentStatus === "REJECTED" && (
                <span className="text-micro text-danger font-medium">
                  Dokumen ditolak. Menunggu revisi pelanggan ({uploadedCount}/3 berkas).
                </span>
              )}
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
                  disabled={isPending || uploadedCount < 3 || currentStatus === "VERIFIED"}
                  onClick={() => handleVerify("APPROVE")}
                  className="rounded-sm bg-teal px-3.5 py-1.5 text-meta font-medium text-white hover:bg-teal/90 disabled:opacity-50"
                >
                  {isPending ? "Memproses..." : "Setujui Seluruh Dokumen"}
                </button>
              </div>
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
                onClick={closePreview}
                className="rounded-sm px-2 py-1 text-meta text-ink-soft hover:bg-canvas hover:text-ink"
              >
                Tutup
              </button>
            </div>

            <div className="mt-3 flex-1 overflow-auto rounded bg-canvas p-2 flex items-center justify-center min-h-[300px]">
              {previewFailed ? (
                <div className="rounded border border-danger/30 bg-danger-soft/10 p-4 text-meta text-danger">
                  Berkas tidak dapat ditampilkan. Kemungkinan berkas sudah dihapus dari
                  penyimpanan server atau sesi admin Anda berakhir — muat ulang halaman
                  lalu coba lagi.
                </div>
              ) : !isPdfUrl(previewModalUrl) ? (
                <div className="relative max-h-[70vh] w-full flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewModalUrl}
                    alt={previewModalTitle}
                    onError={() => setPreviewFailed(true)}
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
                onClick={closePreview}
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

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-micro font-semibold text-ink-soft mb-1.5">
                  1. Dokumen yang bermasalah{" "}
                  <span className="font-normal text-ink-soft">(boleh lebih dari satu)</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {TARGET_OPTIONS.map((option) => {
                    const active = rejectionTargets.includes(option.key);
                    return (
                      <button
                        key={option.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleTarget(option.key)}
                        className={`rounded border px-2 py-1.5 text-center transition-colors ${
                          active
                            ? "border-danger bg-danger/10 text-danger"
                            : "border-rule bg-surface text-ink-soft hover:border-ink-soft hover:text-ink"
                        }`}
                      >
                        <span className="block text-micro font-semibold">{option.label}</span>
                        <span className="block text-[10px] text-ink-soft">{option.hint}</span>
                      </button>
                    );
                  })}
                </div>
                {rejectionTargets.length === 0 && (
                  <p className="mt-1.5 text-micro text-ink-soft">
                    Pelanggan hanya akan diminta memfoto ulang dokumen yang dipilih di sini.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-micro font-semibold text-ink-soft mb-1.5">
                  2. Alasan cepat{" "}
                  <span className="font-normal text-ink-soft">
                    (klik untuk menambahkan ke catatan, klik lagi untuk membuang)
                  </span>
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {QUICK_NOTES.map((section) => (
                    <div key={section.group}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                        {section.group}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {section.notes.map((note) => {
                          const used = rejectionReason.toLowerCase().includes(note.toLowerCase());
                          return (
                            <button
                              key={note}
                              type="button"
                              aria-pressed={used}
                              onClick={() =>
                                used ? handleRemoveReason(note) : handleAppendReason(note)
                              }
                              className={`rounded border px-2 py-1 text-micro transition-colors ${
                                used
                                  ? "border-navy bg-navy text-white"
                                  : "border-rule bg-canvas text-ink hover:border-ink-soft hover:bg-surface"
                              }`}
                            >
                              {used ? "✓ " : "+ "}
                              {note}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="rejection-input" className="block text-micro font-semibold text-ink mb-1">
                  3. Catatan untuk pelanggan
                </label>
                <textarea
                  id="rejection-input"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Tulis sendiri, atau susun dari alasan cepat di atas."
                  className="w-full rounded border border-rule bg-canvas p-2.5 text-meta text-ink focus:border-navy focus:outline-none"
                />
              </div>

              <div className="rounded border border-rule bg-canvas p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                  Yang akan dilihat pelanggan
                </p>
                <p className="mt-1 text-meta font-medium text-ink">
                  {rejectionTargets.length > 0
                    ? rejectionTargets.map((key) => TARGET_LABEL[key]).join(", ")
                    : "Belum ada dokumen dipilih"}
                </p>
                <p className="mt-0.5 text-meta text-ink-soft">
                  Catatan Staf: &ldquo;{rejectionReason.trim() || "belum diisi"}&rdquo;
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetRejectForm}
                disabled={isPending}
                className="rounded-sm border border-rule px-3 py-1.5 text-meta font-medium text-ink hover:bg-canvas"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={
                  isPending || !rejectionReason.trim() || rejectionTargets.length === 0
                }
                onClick={() =>
                  handleVerify("REJECT", rejectionReason.trim(), rejectionTargets)
                }
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
