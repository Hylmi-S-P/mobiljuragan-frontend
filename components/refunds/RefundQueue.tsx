"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/PageLayout";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { useToast } from "@/components/ui/useToast";
import { unggahBuktiRefundAction, updateRefundAction } from "@/app/actions";
import { formatRupiah, formatDateTimeWit } from "@/lib/format";
import { tautanMedia } from "@/lib/media";
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

/** Umur antrean dalam hari, dipakai menandai refund yang rekeningnya tak kunjung diisi. */
function hariSejak(waktu: string): number {
  const mulai = new Date(waktu).getTime();
  if (Number.isNaN(mulai)) return 0;
  return Math.max(0, Math.floor((Date.now() - mulai) / 86_400_000));
}

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
  const router = useRouter();
  const { show } = useToast();
  const [aktif, setAktif] = useState<"SEMUA" | RefundStatus>(statusAwal ?? "SEMUA");
  const [terbuka, setTerbuka] = useState<string | null>(null);
  const [sedangSimpan, setSedangSimpan] = useState<string | null>(null);
  const [berkasBukti, setBerkasBukti] = useState<File | null>(null);
  const [konfirmasiRefund, setKonfirmasiRefund] = useState<BookingRefund | null>(null);
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
    setBerkasBukti(null);
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
      let buktiMediaId: string | undefined;
      if (berkasBukti) {
        const formData = new FormData();
        formData.append("berkas", berkasBukti);
        const unggah = await unggahBuktiRefundAction(formData);
        if (!unggah.success || !unggah.mediaId) {
          show(unggah.message ?? "Gagal mengunggah bukti transfer.", "error");
          return;
        }
        buktiMediaId = unggah.mediaId;
      }

      const hasil = await updateRefundAction(refund.id, {
        namaBank: ranah.namaBank.trim() || undefined,
        nomorRekening: ranah.nomorRekening.trim() || undefined,
        namaPemilik: ranah.namaPemilik.trim() || undefined,
        nominal: ranah.nominal.trim() ? Number(ranah.nominal) : undefined,
        buktiMediaId,
        catatan: ranah.catatan.trim() || undefined,
        status,
      });

      if (hasil.success) {
        show(hasil.message ?? "Tersimpan.", "success");
        setTerbuka(null);
        setBerkasBukti(null);
        router.refresh();
      } else {
        show(hasil.message ?? "Gagal menyimpan.", "error");
      }
    } finally {
      setSedangSimpan(null);
    }
  }

  async function konfirmasiDana(refund: BookingRefund, ada: boolean) {
    setSedangSimpan(refund.id);
    try {
      const hasil = await updateRefundAction(refund.id, { konfirmasiDana: ada });
      if (hasil.success) {
        show(hasil.message ?? "Tersimpan.", "success");
        setTerbuka(null);
        router.refresh();
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
                    {!refund.danaTerverifikasi && refund.status !== "SELESAI" ? (
                      <p className="text-meta font-semibold text-amber-800">
                        Bukti transfer belum diverifikasi: cocokkan mutasi bank dan konfirmasi dana
                        masuk sebelum mentransfer balik.
                      </p>
                    ) : null}
                    {!refund.nomorRekening && refund.status !== "SELESAI" ? (
                      <p className="text-meta font-semibold text-amber-800">
                        Rekening belum diklaim pelanggan
                        {hariSejak(refund.dicatatPada) >= 3
                          ? `, sudah ${hariSejak(refund.dicatatPada)} hari. Hubungi pelanggan.`
                          : "."}
                      </p>
                    ) : null}
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
                        maxLength={30}
                          />
                      </label>
                      <label className="text-meta text-ink-soft">
                        Nomor rekening
                        <input
                          value={ranah.nomorRekening}
                          onChange={(e) => setRanah({ ...ranah, nomorRekening: e.target.value })}
                          className="mt-1 w-full rounded-sm border border-rule bg-canvas px-3 py-2 text-meta text-ink"
                          placeholder="1234567890"
                        maxLength={20}
                          />
                      </label>
                      <label className="text-meta text-ink-soft">
                        Nama pemilik rekening
                        <input
                          value={ranah.namaPemilik}
                          onChange={(e) => setRanah({ ...ranah, namaPemilik: e.target.value })}
                          className="mt-1 w-full rounded-sm border border-rule bg-canvas px-3 py-2 text-meta text-ink"
                        maxLength={60}
                          />
                      </label>
                      <label className="text-meta text-ink-soft">
                        Nominal yang ditransfer
                        <input
                          value={ranah.nominal}
                          onChange={(e) => setRanah({ ...ranah, nominal: e.target.value })}
                          inputMode="numeric"
                          maxLength={11}
                          className="mt-1 w-full rounded-sm border border-rule bg-canvas px-3 py-2 text-meta text-ink"
                        />
                      </label>
                      <label className="text-meta text-ink-soft sm:col-span-2">
                        Catatan {refund.buktiUrl || berkasBukti ? "(opsional)" : "(wajib jika tanpa bukti)"}
                        {refund.alasan ? (
                          <span className="mt-1 block rounded-sm border border-rule bg-surface px-2.5 py-1.5 text-micro text-ink-soft">
                            Catatan tersimpan: {refund.alasan}
                          </span>
                        ) : null}
                        <input
                          value={ranah.catatan}
                          onChange={(e) => setRanah({ ...ranah, catatan: e.target.value })}
                          className="mt-1 w-full rounded-sm border border-rule bg-canvas px-3 py-2 text-meta text-ink"
                          placeholder="Tambahkan catatan baru, misal: ditransfer 13 Nov via BCA"
                          maxLength={300}
                        />
                        <span className="mt-1 block text-right text-micro tabular-nums text-ink-soft">
                          {ranah.catatan.length}/300
                        </span>
                      </label>
                      <div className="text-meta text-ink-soft sm:col-span-2">
                        {refund.buktiUrl ? (
                          <div className="mb-1.5 flex flex-wrap items-center gap-2 rounded-sm border border-rule bg-surface px-3 py-2">
                            <span className="text-meta font-medium text-ink">
                              Bukti transfer sudah tersimpan.
                            </span>
                            <a
                              href={tautanMedia(refund.buktiUrl) ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-meta font-semibold text-teal hover:underline"
                            >
                              Lihat bukti transfer
                            </a>
                          </div>
                        ) : null}
                        <label className="block">
                          {refund.buktiUrl
                            ? "Ganti foto bukti transfer (opsional)"
                            : "Foto bukti transfer (opsional)"}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setBerkasBukti(e.target.files?.[0] ?? null)}
                            className="mt-1 block w-full rounded-sm border border-rule bg-canvas px-3 py-2 text-meta text-ink file:mr-3 file:rounded-xs file:border-0 file:bg-ink/10 file:px-2.5 file:py-1 file:text-meta file:font-medium file:text-ink"
                          />
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                        <button
                          type="button"
                          disabled={sedangSimpan === refund.id || !refund.danaTerverifikasi}
                          onClick={() => kirim(refund)}
                          className="rounded-sm border border-rule bg-surface px-3 py-1.5 text-meta font-medium text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Simpan draft
                        </button>
                        <button
                          type="button"
                          disabled={
                            sedangSimpan === refund.id ||
                            refund.status === "SELESAI" ||
                            !refund.danaTerverifikasi
                          }
                          onClick={() => setKonfirmasiRefund(refund)}
                          className="rounded-sm bg-ink px-3 py-1.5 text-meta font-semibold text-surface hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Konfirmasi Pengembalian
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
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-meta text-ink-soft">
                          {refund.status === "SELESAI" && refund.diselesaikanPada
                            ? `Selesai ${formatDateTimeWit(refund.diselesaikanPada)}`
                            : "Belum ditransfer."}
                        </p>
                        {refund.buktiUrl ? (
                          <a
                            href={tautanMedia(refund.buktiUrl) ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-meta font-medium text-teal hover:underline"
                          >
                            Lihat bukti transfer
                          </a>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {!refund.danaTerverifikasi && refund.status !== "SELESAI" ? (
                          <>
                            <button
                              type="button"
                              disabled={sedangSimpan === refund.id}
                              onClick={() => konfirmasiDana(refund, true)}
                              className="rounded-sm border border-rule bg-surface px-3 py-1.5 text-meta font-medium text-ink hover:bg-canvas disabled:opacity-60"
                            >
                              Dana sudah masuk
                            </button>
                            <button
                              type="button"
                              disabled={sedangSimpan === refund.id}
                              onClick={() => konfirmasiDana(refund, false)}
                              className="rounded-sm border border-rule bg-surface px-3 py-1.5 text-meta font-medium text-ink-soft hover:bg-canvas disabled:opacity-60"
                            >
                              Dana tidak masuk
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          disabled={!refund.danaTerverifikasi && refund.status !== "SELESAI"}
                          onClick={() => bukaForm(refund)}
                          className="rounded-sm border border-rule bg-surface px-3 py-1.5 text-meta font-medium text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {refund.status === "SELESAI" ? "Lihat / ubah catatan" : "Proses pengembalian"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Modal
        open={Boolean(konfirmasiRefund)}
        onClose={() => {
          if (!sedangSimpan) setKonfirmasiRefund(null);
        }}
        title="Konfirmasi Pengembalian Dana"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              variant="ghost"
              disabled={Boolean(sedangSimpan)}
              onClick={() => setKonfirmasiRefund(null)}
            >
              Batal
            </Button>
            <Button
              variant="confirm"
              disabled={Boolean(sedangSimpan)}
              onClick={async () => {
                if (!konfirmasiRefund) return;
                const target = konfirmasiRefund;
                setKonfirmasiRefund(null);
                await kirim(target, "SELESAI");
              }}
            >
              {sedangSimpan ? "Menyimpan..." : "Ya, Konfirmasi Selesai"}
            </Button>
          </div>
        }
      >
        {konfirmasiRefund ? (
          <div className="space-y-3 text-meta text-ink">
            <p className="text-ink-soft">
              Pastikan dana sudah benar-benar ditransfer. Setelah dikonfirmasi, baris pengembalian
              ini ditutup permanen.
            </p>
            <div className="space-y-1.5 rounded-sm border border-rule bg-canvas p-3">
              <div className="flex justify-between gap-2">
                <span className="text-ink-soft">Pesanan</span>
                <span className="font-semibold">#{konfirmasiRefund.bookingCode}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-ink-soft">Bank & Rekening</span>
                <span className="font-medium">
                  {(ranah.namaBank.trim() || konfirmasiRefund.namaBank || "-")} ·{" "}
                  {(ranah.nomorRekening.trim() || konfirmasiRefund.nomorRekening || "-")}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-ink-soft">Pemilik</span>
                <span className="font-medium">
                  {ranah.namaPemilik.trim() || konfirmasiRefund.namaPemilik || "-"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-ink-soft">Nominal</span>
                <span className="font-semibold text-navy">
                  {formatRupiah(
                    ranah.nominal.trim() ? Number(ranah.nominal) : konfirmasiRefund.nominal,
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-ink-soft">Bukti Transfer</span>
                <span className="font-medium">
                  {berkasBukti
                    ? `Berkas baru (${berkasBukti.name})`
                    : konfirmasiRefund.buktiUrl
                      ? "Sudah tersimpan"
                      : "Tidak ada berkas"}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

