"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import { useToast } from "@/components/ui/useToast";
import { updateRefundAction } from "@/app/actions";
import { formatRupiah, formatDateTimeWit } from "@/lib/format";
import type { BookingRefund, RefundStatus } from "@/lib/types";

/**
 * Antrean pengembalian dana.
 *
 * Daftar ini adalah pekerjaan kantor, bukan laporan: setiap baris berarti ada
 * pelanggan yang sudah membayar lalu pesanannya batal/ditolak, dan uangnya harus
 * ditransfer balik. Angkanya dihitung server saat pembatalan, jadi tidak ada
 * kolom yang boleh diisi staf untuk membuat nominal baru â€” staf hanya mencatat
 * rekening tujuan dan bukti transfer.
 */

const TAB: Array<{ id: "SEMUA" | RefundStatus; label: string }> = [
  { id: "SEMUA", label: "Semua" },
  { id: "MENUNGGU", label: "Menunggu" },
  { id: "DIPROSES", label: "Diproses" },
  { id: "SELESAI", label: "Selesai" },
];

const CHIP_STATUS: Record<RefundStatus, string> = {
  MENUNGGU: "Perlu Ditransfer",
  DIPROSES: "Sedang Diproses",
  SELESAI: "Sudah Ditransfer",
};

const ASAL_PEMBATAL: Record<BookingRefund["dibatalkanOleh"], string> = {
  PELANGGAN: "Pelanggan (potongan Rp 50.000)",
  ADMIN: "Admin (dikembalikan penuh)",
  SISTEM: "Sistem (dikembalikan penuh)",
};

type Props = {
  initialRefunds: BookingRefund[];
  statusAwal: RefundStatus | null;
  galat: string | null;
};

type Ranah = {
  namaBank: string;
  nomorRekening: string;
  namaPemilik: string;
  nominal: string;
  catatan: string;
};

export function RefundQueue({ initialRefunds, statusAwal, galat }: Props) {
  const { show } = useToast();
  const [aktif, setAktif] = useState<"SEMUA" | RefundStatus>(statusAwal ?? "SEMUA");
  const [terbuka, setTerbuka] = useState<string | null>(null);
  const [sedangSimpan, setSedangSimpan] = useState<string | null>(null);
  const [ranah, setRanah] = useState<Ranah>({
    namaBank: "",
    nomorRekening: "",
    namaPemilik: "",
    nominal: "",
    catatan: "",
  });

  const tersaring = initialRefunds.filter((r) => aktif === "SEMUA" || r.status === aktif);

  const jumlah = (status: RefundStatus) =>
    initialRefunds.filter((r) => r.status === status).length;

  function bukaForm(refund: BookingRefund) {
    setTerbuka(refund.id);
    setRanah({
      namaBank: refund.namaBank ?? "",
      nomorRekening: refund.nomorRekening ?? "",
      namaPemilik: refund.namaPemilik ?? "",
      nominal: String(refund.nominal),
      catatan: "",
    });
  }

  async function kirim(refund: BookingRefund, status?: RefundStatus) {
    setSedangSimpan(refund.id);
    try {
      const hasil = await updateRefundAction(refund.id, {
        namaBank: ranah.namaBank.trim() || undefined,
        nomorRekening: ranah.nomorRekening.trim() || undefined,
        namaPemilik: ranah.namaPemilik.trim() || undefined,
        nominal: ranah.nominal.trim() ? Number(ranah.nominal) : undefined,
        catatan: ranah.catatan.trim() || undefined,
        status,
      });

      if (hasil.success) {
        show(hasil.message ?? "Tersimpan.", "success");
        setTerbuka(null);
      } else {
        show(hasil.message ?? "Gagal menyimpan.", "error");
      }
    } finally {
      setSedangSimpan(null);
    }
  }

  return (
    <div className="space-y-4">
      <Panel>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1 rounded-sm border border-rule bg-canvas p-1">
            {TAB.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAktif(t.id)}
                className={`rounded-xs px-3 py-1.5 text-meta font-medium transition-colors ${
                  aktif === t.id
                    ? "bg-surface font-semibold text-ink shadow-xs"
                    : "text-ink-soft hover:bg-surface/50 hover:text-ink"
                }`}
              >
                {t.label}
                {t.id !== "SEMUA" && jumlah(t.id) > 0 ? ` (${jumlah(t.id)})` : ""}
              </button>
            ))}
          </div>

          <p className="text-meta text-ink-soft">
            Total antrean: {initialRefunds.filter((r) => r.status !== "SELESAI").length} baris
          </p>
        </div>

        {galat ? (
          <p className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-meta text-danger">
            {galat}
          </p>
        ) : tersaring.length === 0 ? (
          <div className="rounded-sm border border-dashed border-rule px-6 py-10 text-center">
            <p className="text-body font-semibold text-ink">Tidak ada pengembalian dana</p>
            <p className="mt-1 text-meta text-ink-soft">
              Baris baru muncul otomatis begitu ada pesanan yang dibatalkan atau ditolak setelah
              dibayar.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tersaring.map((refund) => (
              <div key={refund.id} className="rounded-sm border border-rule bg-surface">
                <div className="flex flex-col gap-3 border-b border-rule px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-body font-semibold text-ink">#{refund.bookingCode}</span>
                      <StatusChip tone={refund.status === "SELESAI" ? "available" : "pending"}>
                        {CHIP_STATUS[refund.status]}
                      </StatusChip>
                    </div>
                    <p className="text-meta text-ink-soft">
                      {refund.customerName}
                      {refund.customerPhone ? ` · ${refund.customerPhone}` : ""} · dicatat{" "}
                      {formatDateTimeWit(refund.dicatatPada)}
                    </p>
                    <p className="text-meta text-ink-soft">{ASAL_PEMBATAL[refund.dibatalkanOleh]}</p>
                    {refund.alasan ? (
                      <p className="text-meta text-ink-soft">Alasan: {refund.alasan}</p>
                    ) : null}
                  </div>

                  <div className="text-right">
                    <p className="text-meta text-ink-soft">Dibayar {formatRupiah(refund.totalDibayar)}</p>
                    <p className="text-meta text-ink-soft">Potongan {formatRupiah(refund.potongan)}</p>
                    <p className="text-title font-semibold text-ink whitespace-nowrap">
                      Kembalikan {formatRupiah(refund.nominal)}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-3">
                  {refund.nomorRekening ? (
                    <p className="mb-2 text-meta text-ink">
                      Tujuan: {refund.namaBank ?? "-"} · {refund.nomorRekening} ·{" "}
                      {refund.namaPemilik ?? "-"}
                    </p>
                  ) : (
                    <p className="mb-2 text-meta text-ink-soft">
                      Rekening tujuan belum diisi. Minta data rekening pelanggan lalu simpan di sini.
                    </p>
                  )}

                  {terbuka === refund.id ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-meta text-ink-soft">
                        Nama bank
                        <input
                          value={ranah.namaBank}
                          onChange={(e) => setRanah({ ...ranah, namaBank: e.target.value })}
                          className="mt-1 w-full rounded-sm border border-rule bg-canvas px-3 py-2 text-meta text-ink"
                          placeholder="BRI / Mandiri / BCA"
                        />
                      </label>
                      <label className="text-meta text-ink-soft">
                        Nomor rekening
                        <input
                          value={ranah.nomorRekening}
                          onChange={(e) => setRanah({ ...ranah, nomorRekening: e.target.value })}
                          className="mt-1 w-full rounded-sm border border-rule bg-canvas px-3 py-2 text-meta text-ink"
                          placeholder="1234567890"
                        />
                      </label>
                      <label className="text-meta text-ink-soft">
                        Nama pemilik rekening
                        <input
                          value={ranah.namaPemilik}
                          onChange={(e) => setRanah({ ...ranah, namaPemilik: e.target.value })}
                          className="mt-1 w-full rounded-sm border border-rule bg-canvas px-3 py-2 text-meta text-ink"
                        />
                      </label>
                      <label className="text-meta text-ink-soft">
                        Nominal yang ditransfer
                        <input
                          value={ranah.nominal}
                          onChange={(e) => setRanah({ ...ranah, nominal: e.target.value })}
                          inputMode="numeric"
                          className="mt-1 w-full rounded-sm border border-rule bg-canvas px-3 py-2 text-meta text-ink"
                        />
                      </label>
                      <label className="text-meta text-ink-soft sm:col-span-2">
                        Catatan (wajib saat menutup baris ini)
                        <input
                          value={ranah.catatan}
                          onChange={(e) => setRanah({ ...ranah, catatan: e.target.value })}
                          className="mt-1 w-full rounded-sm border border-rule bg-canvas px-3 py-2 text-meta text-ink"
                          placeholder="Contoh: ditransfer 13 Nov, bukti dikirim via WhatsApp"
                        />
                      </label>

                      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                        <button
                          type="button"
                          disabled={sedangSimpan === refund.id}
                          onClick={() => kirim(refund)}
                          className="rounded-sm border border-rule bg-surface px-3 py-1.5 text-meta font-medium text-ink hover:bg-canvas disabled:opacity-60"
                        >
                          Simpan data rekening
                        </button>
                        <button
                          type="button"
                          disabled={sedangSimpan === refund.id || refund.status === "SELESAI"}
                          onClick={() => kirim(refund, "SELESAI")}
                          className="rounded-sm bg-ink px-3 py-1.5 text-meta font-semibold text-surface hover:opacity-90 disabled:opacity-50"
                        >
                          Tandai sudah ditransfer
                        </button>
                        <button
                          type="button"
                          onClick={() => setTerbuka(null)}
                          className="ml-auto text-meta text-ink-soft hover:text-ink"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-meta text-ink-soft">
                        {refund.status === "SELESAI" && refund.diselesaikanPada
                          ? `Selesai ${formatDateTimeWit(refund.diselesaikanPada)}`
                          : "Belum ditransfer."}
                      </p>
                      <button
                        type="button"
                        onClick={() => bukaForm(refund)}
                        className="rounded-sm border border-rule bg-surface px-3 py-1.5 text-meta font-medium text-ink hover:bg-canvas"
                      >
                        {refund.status === "SELESAI" ? "Lihat / ubah catatan" : "Proses pengembalian"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

