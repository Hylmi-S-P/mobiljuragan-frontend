"use client";

import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AutoGrowTextarea } from "@/components/ui/AutoGrowTextarea";
import { createBookingLineItemAction } from "@/app/actions";
import { formatCurrencyInput, formatRupiah } from "@/lib/format";
import type { Booking } from "@/lib/types";

type Props = {
  onClose: () => void;
  /**
   * Dipanggil setelah penyesuaian biaya benar-benar tersimpan di backend.
   *
   * Dulu modal ini hanya menambah baris ke state React lewat `onApply`, sehingga
   * deskripsi, nominal, dan justifikasi audit yang wajib diisi hilang begitu
   * halaman dimuat ulang — tanpa jejak apa pun. Sekarang penyimpanannya terjadi
   * di dalam modal, dan `onSaved` hanya dipakai untuk menyegarkan tampilan.
   */
  onSaved?: () => void;
  booking: Booking;
};

/**
 * Kategori yang dikirim ke server untuk setiap baris penyesuaian manual.
 *
 * Dulu admin memilih kategori dari daftar tetap ("Luar kota", "Menginap supir",
 * dan seterusnya). Daftar itu tidak pernah cocok dengan alasan yang sebenarnya
 * terjadi di lapangan, dan pilihannya hanya menambah satu isian tanpa menambah
 * ketelitian. Sekarang satu kategori tetap, sedangkan kekhususan ditulis di nama
 * dan catatan.
 */
const KATEGORI_PENYESUAIAN = "Surcharge Manual";

/* Komponen ini selalu di-mount ulang saat dibuka, jadi isian selalu mulai kosong. */
export function ManualSurchargeModal({ onClose, onSaved, booking }: Props) {
  const fieldId = useId();
  const [nama, setNama] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"tambah" | "kurang">("tambah");
  const [catatan, setCatatan] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pesanGagal, setPesanGagal] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /* Tarif dasar yang sudah ditetapkan admin. Null berarti belum ada, dan itu
     dikatakan apa adanya, bukan diganti penanda "[nominal]". */
  const estimasiAwal = booking.quotedAmount;

  function handleApply() {
    const nextErrors: Record<string, string> = {};
    if (nama.trim().length === 0) nextErrors.nama = "Nama surcharge wajib diisi.";
    if (amount.trim().length === 0) nextErrors.amount = "Nominal wajib diisi.";
    if (catatan.trim().length === 0) {
      nextErrors.catatan = "Catatan wajib diisi supaya alasan biaya ini bisa ditelusuri.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    /* Nominal di layar berformat "1.500.000"; yang dikirim harus angka murni. */
    const nominal = Number(amount.replace(/[^\d]/g, ""));
    if (!Number.isFinite(nominal) || nominal <= 0) {
      setErrors({ amount: "Nominal harus lebih dari 0." });
      return;
    }

    setPesanGagal(null);

    startTransition(async () => {
      const res = await createBookingLineItemAction(booking.id, {
        kategori: KATEGORI_PENYESUAIAN,
        deskripsi: nama.trim(),
        nominal,
        arah: direction === "tambah" ? "TAMBAH" : "KURANG",
        justifikasi: catatan.trim(),
      });

      if (!res.success) {
        /* Modal tetap terbuka supaya isian tidak hilang saat penyimpanan gagal. */
        setPesanGagal(res.message ?? "Gagal menyimpan penyesuaian biaya.");
        return;
      }

      onSaved?.();
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Surcharge Manual"
      description={`ID Booking #${booking.code}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button variant="confirm" onClick={handleApply} disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan Surcharge"}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div>
          <label htmlFor={`${fieldId}-nama`} className="block text-micro font-semibold text-ink">
            Nama Surcharge Tambahan
          </label>
          <input
            id={`${fieldId}-nama`}
            value={nama}
            onChange={(event) => setNama(event.target.value)}
            aria-invalid={Boolean(errors.nama)}
            aria-describedby={errors.nama ? `${fieldId}-nama-error` : undefined}
            className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink"
            placeholder="Contoh: Tambahan BBM rute tanah"
          maxLength={150}
            />
          {errors.nama ? (
            <p id={`${fieldId}-nama-error`} className="mt-1 text-meta text-danger">
              {errors.nama}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={`${fieldId}-amount`} className="block text-micro font-semibold text-ink">
            Nominal
          </label>
          <input
            id={`${fieldId}-amount`}
            inputMode="numeric"
            maxLength={14}
            value={amount}
            onChange={(event) => setAmount(formatCurrencyInput(event.target.value))}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? `${fieldId}-amount-error` : undefined}
            className="tabular-nums mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink"
            placeholder="Rp 0"
          />
          {errors.amount ? (
            <p id={`${fieldId}-amount-error`} className="mt-1 text-meta text-danger">
              {errors.amount}
            </p>
          ) : null}

          {/* Arah biaya. Diskon dicatat sebagai pengurangan, bukan nominal negatif,
              supaya angka yang tersimpan selalu positif dan arahnya eksplisit. */}
          <div className="mt-2 flex gap-2">
            <Button
              variant={direction === "tambah" ? "confirm" : "outline"}
              onClick={() => setDirection("tambah")}
              aria-pressed={direction === "tambah"}
            >
              Menambah tagihan
            </Button>
            <Button
              variant={direction === "kurang" ? "confirm" : "outline"}
              onClick={() => setDirection("kurang")}
              aria-pressed={direction === "kurang"}
            >
              Mengurangi tagihan
            </Button>
          </div>
        </div>

        <div>
          <label htmlFor={`${fieldId}-catatan`} className="block text-micro font-semibold text-ink">
            Catatan
          </label>
          <AutoGrowTextarea
            maxHeight={220}
            id={`${fieldId}-catatan`}
            value={catatan}
            onChange={(event) => setCatatan(event.target.value)}
            aria-invalid={Boolean(errors.catatan)}
            aria-describedby={errors.catatan ? `${fieldId}-catatan-error` : undefined}
            className="mt-1 w-full rounded-sm border border-rule-strong bg-canvas px-3 py-2 text-body text-ink"
            placeholder="Alasan biaya ini, misalnya medan ekstrem atau diskon pelanggan baru"
          maxLength={300}
            />
          <p className="mt-1 text-right text-micro tabular-nums text-ink-soft">
            {catatan.length}/300
          </p>
          {errors.catatan ? (
            <p id={`${fieldId}-catatan-error`} className="mt-1 text-meta text-danger">
              {errors.catatan}
            </p>
          ) : null}
        </div>

        <div className="rounded-sm border border-rule bg-canvas px-3.5 py-2.5 text-micro text-ink-soft">
          <p>
            Tarif dasar booking:{" "}
            {estimasiAwal != null ? formatRupiah(estimasiAwal) : "belum ditetapkan admin"}
          </p>
          <p className="mt-1">
            Surcharge: {amount.trim().length > 0 ? amount.trim() : "belum diisi"}
          </p>
          <p className="mt-1 font-bold text-ink">
            Total tagihan baru dihitung oleh sistem setelah tarif dasar dikonfirmasi.
          </p>
        </div>

        {pesanGagal ? (
          <p role="alert" className="text-meta text-danger">
            {pesanGagal}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
