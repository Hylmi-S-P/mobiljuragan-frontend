"use client";

import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AutoGrowTextarea } from "@/components/ui/AutoGrowTextarea";
import { createBookingLineItemAction } from "@/app/actions";
import { formatCurrencyInput, formatRupiah } from "@/lib/format";
import { SURCHARGE_CATEGORIES } from "@/lib/uiText";
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

/* Komponen ini selalu di-mount ulang saat dibuka, jadi isian selalu mulai kosong. */
export function ManualSurchargeModal({ onClose, onSaved, booking }: Props) {
  const fieldId = useId();
  const [category, setCategory] = useState(SURCHARGE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"tambah" | "kurang">("tambah");
  const [justification, setJustification] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pesanGagal, setPesanGagal] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /* Tarif dasar yang sudah ditetapkan admin. Null berarti belum ada, dan itu
     dikatakan apa adanya, bukan diganti penanda "[nominal]". */
  const estimasiAwal = booking.quotedAmount;

  function handleApply() {
    const nextErrors: Record<string, string> = {};
    if (description.trim().length === 0)
      nextErrors.description = "Deskripsi penyesuaian wajib diisi.";
    if (amount.trim().length === 0) nextErrors.amount = "Nominal penyesuaian wajib diisi.";
    if (justification.trim().length === 0) {
      nextErrors.justification = "Catatan justifikasi wajib diisi untuk audit internal.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    /* Nominal di layar berformat "1.500.000"; yang dikirim harus angka murni. */
    const nominal = Number(amount.replace(/[^\d]/g, ""));
    if (!Number.isFinite(nominal) || nominal <= 0) {
      setErrors({ amount: "Nominal penyesuaian harus lebih dari 0." });
      return;
    }

    setPesanGagal(null);

    startTransition(async () => {
      const res = await createBookingLineItemAction(booking.id, {
        kategori: category,
        deskripsi: description.trim(),
        nominal,
        arah: direction === "tambah" ? "TAMBAH" : "KURANG",
        justifikasi: justification.trim(),
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
      title="Penyesuaian Biaya & Surcharge Manual"
      description={`${category} • ID Booking #${booking.code}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button variant="confirm" onClick={handleApply} disabled={isPending}>
            {isPending ? "Menyimpan..." : "Terapkan Penyesuaian Biaya"}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div>
          <label
            htmlFor={`${fieldId}-category`}
            className="block text-micro font-semibold text-ink"
          >
            Kategori penyesuaian biaya
          </label>
          <select
            id={`${fieldId}-category`}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink"
          >
            {SURCHARGE_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`${fieldId}-description`}
            className="block text-micro font-semibold text-ink"
          >
            Deskripsi rincian penyesuaian
          </label>
          <input
            id={`${fieldId}-description`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? `${fieldId}-description-error` : undefined}
            className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink"
            placeholder="Contoh: tambahan konsumsi BBM untuk rute tanah"
          />
          {errors.description ? (
            <p id={`${fieldId}-description-error`} className="mt-1 text-meta text-danger">
              {errors.description}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${fieldId}-amount`}
              className="block text-micro font-semibold text-ink"
            >
              Nominal penyesuaian
            </label>
            <input
              id={`${fieldId}-amount`}
              inputMode="numeric"
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
          </div>

          <fieldset>
            <legend className="text-micro font-semibold text-ink">Tipe perhitungan</legend>
            <div className="mt-1 flex gap-2">
              <Button
                variant={direction === "tambah" ? "confirm" : "outline"}
                onClick={() => setDirection("tambah")}
                aria-pressed={direction === "tambah"}
              >
                Penambahan
              </Button>
              <Button
                variant={direction === "kurang" ? "confirm" : "outline"}
                onClick={() => setDirection("kurang")}
                aria-pressed={direction === "kurang"}
              >
                Pengurangan
              </Button>
            </div>
          </fieldset>
        </div>

        <div>
          <label
            htmlFor={`${fieldId}-justification`}
            className="block text-micro font-semibold text-ink"
          >
            Catatan justifikasi operasional (wajib untuk audit internal)
          </label>
          <AutoGrowTextarea
            maxHeight={220}
            id={`${fieldId}-justification`}
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            aria-invalid={Boolean(errors.justification)}
            aria-describedby={errors.justification ? `${fieldId}-justification-error` : undefined}
            className="mt-1 w-full rounded-sm border border-rule-strong bg-canvas px-3 py-2 text-body text-ink"
            placeholder="Alasan operasional penyesuaian ini"
          />
          {errors.justification ? (
            <p id={`${fieldId}-justification-error`} className="mt-1 text-meta text-danger">
              {errors.justification}
            </p>
          ) : null}
        </div>

        <div className="rounded-sm border border-rule bg-canvas px-3.5 py-2.5 text-micro text-ink-soft">
          <p>
            Tarif dasar booking:{" "}
            {estimasiAwal != null ? formatRupiah(estimasiAwal) : "belum ditetapkan admin"}
          </p>
          <p className="mt-1">
            Penyesuaian manual: {amount.trim().length > 0 ? amount.trim() : "belum diisi"}
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

        <p className="text-micro text-ink-soft">
          Penyesuaian tersimpan di database dan tercatat pada audit log beserta alasannya.
        </p>
      </div>
    </Modal>
  );
}
