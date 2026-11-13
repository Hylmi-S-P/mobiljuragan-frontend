import Link from "next/link";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatRupiah, formatDateTimeWit } from "@/lib/format";
import type { BookingRefund } from "@/lib/types";

/**
 * Ringkasan kewajiban pengembalian dana pada detail pesanan.
 *
 * Pesanan yang dibatalkan atau ditolak setelah dibayar menyisakan uang di kantor.
 * Sebelumnya angka ini hanya hidup di aplikasi mobile (85% dari total) dan tidak
 * pernah sampai ke server, sehingga tidak ada yang tahu nominal resminya. Kartu
 * ini menampilkan angka yang dihitung backend saat pembatalan.
 */

const LABEL_STATUS: Record<BookingRefund["status"], string> = {
  MENUNGGU: "Perlu ditransfer",
  DIPROSES: "Sedang diproses",
  SELESAI: "Sudah ditransfer",
};

const LABEL_ASAL: Record<BookingRefund["dibatalkanOleh"], string> = {
  PELANGGAN: "Dibatalkan pelanggan",
  ADMIN: "Dibatalkan admin",
  SISTEM: "Dibatalkan sistem",
};

export function RefundSummaryCard({ refund }: { refund: BookingRefund }) {
  return (
    <Panel className="mt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-title font-semibold text-ink">Pengembalian Dana</h2>
        <StatusChip tone={refund.status === "SELESAI" ? "available" : "pending"}>
          {LABEL_STATUS[refund.status]}
        </StatusChip>
      </div>

      <dl className="space-y-1.5 text-meta">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">Dibayar pelanggan</dt>
          <dd className="text-ink">{formatRupiah(refund.totalDibayar)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">Potongan</dt>
          <dd className="text-ink">{formatRupiah(refund.potongan)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-rule pt-1.5">
          <dt className="font-medium text-ink">Wajib dikembalikan</dt>
          <dd className="font-semibold text-ink">{formatRupiah(refund.nominal)}</dd>
        </div>
      </dl>

      <p className="mt-3 text-meta text-ink-soft">
        {LABEL_ASAL[refund.dibatalkanOleh]} · dicatat {formatDateTimeWit(refund.dicatatPada)}
      </p>

      {refund.nomorRekening ? (
        <p className="mt-1 text-meta text-ink-soft">
          Tujuan: {refund.namaBank ?? "-"} · {refund.nomorRekening} · {refund.namaPemilik ?? "-"}
        </p>
      ) : (
        <p className="mt-1 text-meta text-ink-soft">Rekening tujuan belum diisi.</p>
      )}

      <Link
        href="/refunds"
        className="mt-3 inline-block text-meta font-medium text-teal hover:underline"
      >
        Buka antrean pengembalian dana
      </Link>
    </Panel>
  );
}
