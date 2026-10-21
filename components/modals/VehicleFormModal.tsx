"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { IconTrash } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import {
  BOOKING_MODE_LABEL,
  VEHICLE_CATEGORY_OPTIONS,
  VEHICLE_TRANSMISSION_OPTIONS,
} from "@/lib/labels";
import type { BookingMode, Vehicle, VehicleStatus } from "@/lib/types";

type Props = {
  vehicle?: Vehicle;
  existingPlates: string[];
  onClose: () => void;
  onSave: (vehicle: Vehicle) => void;
  /** Dipanggil saat admin meminta penghapusan dari dalam modal kelola. */
  onRequestDelete?: (vehicleId: string) => void;
};

const STATUS_OPTIONS: { value: VehicleStatus; label: string }[] = [
  { value: "tersedia", label: "Tersedia" },
  { value: "servis", label: "Servis" },
  { value: "tidak_tersedia", label: "Tidak Tersedia" },
];

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function VehicleFormModal({
  vehicle,
  existingPlates,
  onClose,
  onSave,
  onRequestDelete,
}: Props) {
  const fieldId = useId();
  const [hapusDiminta, setHapusDiminta] = useState(false);
  const [name, setName] = useState(vehicle?.name ?? "");
  const [plate, setPlate] = useState(vehicle?.plate ?? "");
  const [category, setCategory] = useState(vehicle?.category ?? VEHICLE_CATEGORY_OPTIONS[0]);
  const [transmission, setTransmission] = useState(
    vehicle?.transmission ?? VEHICLE_TRANSMISSION_OPTIONS[0],
  );
  const [seats, setSeats] = useState<number>(vehicle?.seats ?? 7);
  const [usage, setUsage] = useState(vehicle?.usage ?? "");
  const [priceInput, setPriceInput] = useState<string>(() => {
    const p = vehicle?.pricePerDay ?? 400000;
    return p > 0 ? p.toLocaleString("id-ID") : "400.000";
  });
  const [status, setStatus] = useState<VehicleStatus>(vehicle?.status ?? "tersedia");
  const [modes, setModes] = useState<BookingMode[]>(
    vehicle?.allowedModes ?? ["lepas_kunci", "dengan_supir"],
  );
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleMode(mode: BookingMode) {
    setModes((current) =>
      current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode],
    );
  }

  function handlePhoto(file: File | undefined) {
    if (!file) {
      setPhotoName(null);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setErrors((current) => ({ ...current, photo: "Ukuran berkas melebihi 5 MB." }));
      setPhotoName(null);
      return;
    }
    setErrors((current) => {
      if (!current.photo) return current;
      const next = { ...current };
      delete next.photo;
      return next;
    });
    setPhotoName(file.name);
  }

  function handleSave() {
    const nextErrors: Record<string, string> = {};
    if (name.trim().length === 0) nextErrors.name = "Nama model kendaraan wajib diisi.";
    const normalizedPlate = plate.trim().toUpperCase();
    if (normalizedPlate.length === 0) nextErrors.plate = "Nomor plat wajib diisi.";
    else if (existingPlates.some((item) => item.toUpperCase() === normalizedPlate)) {
      nextErrors.plate = "Plat ini sudah dipakai unit lain di katalog.";
    }
    if (modes.length === 0) nextErrors.modes = "Pilih minimal satu moda rental yang diizinkan.";
    const numericPrice = Number(priceInput.replace(/[^\d]/g, "")) || 0;
    if (numericPrice <= 0) {
      nextErrors.pricePerDay = "Tarif sewa harian harus bernilai lebih dari 0.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSave({
      id: vehicle?.id ?? `v-${Date.now()}`,
      name: name.trim().toUpperCase(),
      plate: normalizedPlate,
      status,
      category,
      transmission,
      seats,
      pricePerDay: numericPrice,
      usage: usage.trim().length > 0 ? usage.trim() : null,
      allowedModes: modes,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={vehicle ? "Edit Spesifikasi Armada" : "Tambah Armada Baru"}
      description="Lengkapi spesifikasi unit untuk ditampilkan pada katalog pelanggan aplikasi MobilJuragan."
      footer={
        <>
          {vehicle && onRequestDelete ? (
            <div className="mr-auto flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-meta text-ink">
                <input
                  type="checkbox"
                  data-testid="hapus-diminta"
                  checked={hapusDiminta}
                  onChange={(event) => setHapusDiminta(event.target.checked)}
                  className="h-4 w-4 accent-danger"
                />
                <span>Hapus unit ini</span>
              </label>
              <Button
                variant="danger"
                disabled={!hapusDiminta}
                onClick={() => onRequestDelete(vehicle.id)}
              >
                <IconTrash className="h-4 w-4" />
                Hapus Unit
              </Button>
            </div>
          ) : null}
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="confirm" onClick={handleSave}>
            Simpan ke Katalog
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div>
          <label htmlFor={`${fieldId}-name`} className="block text-meta font-medium text-ink">
            Nama lengkap model kendaraan
          </label>
          <input
            id={`${fieldId}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${fieldId}-name-error` : undefined}
            className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink"
            placeholder="Contoh: AVANZA G PUTIH"
          />
          {errors.name ? (
            <p id={`${fieldId}-name-error`} className="mt-1 text-meta text-danger">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={`${fieldId}-plate`} className="block text-meta font-medium text-ink">
            Nomor plat kendaraan (Merauke)
          </label>
          <input
            id={`${fieldId}-plate`}
            value={plate}
            onChange={(event) => setPlate(event.target.value)}
            aria-invalid={Boolean(errors.plate)}
            aria-describedby={errors.plate ? `${fieldId}-plate-error` : undefined}
            className="tabular-nums mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink"
            placeholder="Contoh: PS1692B"
          />
          {errors.plate ? (
            <p id={`${fieldId}-plate-error`} className="mt-1 text-meta text-danger">
              {errors.plate}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3.5 sm:grid-cols-3">
          <div>
            <label htmlFor={`${fieldId}-category`} className="block text-meta font-medium text-ink">
              Kategori armada
            </label>
            <select
              id={`${fieldId}-category`}
              value={category ?? ""}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink"
            >
              {VEHICLE_CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`${fieldId}-transmission`}
              className="block text-meta font-medium text-ink"
            >
              Tipe transmisi
            </label>
            <select
              id={`${fieldId}-transmission`}
              value={transmission ?? ""}
              onChange={(event) => setTransmission(event.target.value)}
              className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink"
            >
              {VEHICLE_TRANSMISSION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`${fieldId}-seats`} className="block text-meta font-medium text-ink">
              Kapasitas kursi
            </label>
            <div className="relative mt-1">
              <input
                id={`${fieldId}-seats`}
                type="number"
                min={1}
                max={30}
                value={seats}
                onChange={(event) => setSeats(Math.max(1, Number(event.target.value) || 1))}
                className="tabular-nums h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 pr-14 text-body font-semibold text-ink"
                placeholder="7"
              />
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-meta text-ink-soft">
                Kursi
              </span>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor={`${fieldId}-price`} className="block text-meta font-medium text-ink">
            Tarif sewa harian dasar (Rp / Hari)
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-body font-semibold text-ink-soft">
              Rp
            </span>
            <input
              id={`${fieldId}-price`}
              type="text"
              inputMode="numeric"
              value={priceInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, "");
                setPriceInput(raw ? Number(raw).toLocaleString("id-ID") : "");
              }}
              aria-invalid={Boolean(errors.pricePerDay)}
              aria-describedby={errors.pricePerDay ? `${fieldId}-price-error` : undefined}
              className="tabular-nums h-11 w-full rounded-sm border border-rule-strong bg-canvas pl-10 pr-3 text-body font-semibold text-ink placeholder:font-normal placeholder:text-ink-soft"
              placeholder="Contoh: 400.000"
            />
          </div>
          <p className="mt-1 text-micro text-ink-soft">
            Nominal tarif dasar sewa per hari yang tampil secara dinamis pada katalog aplikasi mobile pelanggan.
          </p>
          {errors.pricePerDay ? (
            <p id={`${fieldId}-price-error`} className="mt-1 text-meta text-danger">
              {errors.pricePerDay}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={`${fieldId}-usage`} className="block text-meta font-medium text-ink">
            Karakteristik penggunaan
          </label>
          <input
            id={`${fieldId}-usage`}
            value={usage}
            onChange={(event) => setUsage(event.target.value)}
            className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink"
            placeholder="Contoh: keluarga, efisien BBM, mobilitas dalam kota"
          />
        </div>

        <fieldset>
          <legend className="text-meta font-medium text-ink">Status operasional armada</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={status === option.value ? "confirm" : "outline"}
                aria-pressed={status === option.value}
                onClick={() => setStatus(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <p className="mt-1.5 text-micro text-ink-soft">
            Status Disewa diisi otomatis dari pesanan aktif, jadi tidak bisa dipilih manual di sini.
          </p>
        </fieldset>

        <fieldset>
          <legend className="text-meta font-medium text-ink">
            Pilihan moda rental yang diizinkan
          </legend>
          <div className="mt-1.5 flex flex-wrap gap-3">
            {(["lepas_kunci", "dengan_supir"] as BookingMode[]).map((mode) => (
              <label key={mode} className="flex items-center gap-2 text-body text-ink">
                <input
                  type="checkbox"
                  checked={modes.includes(mode)}
                  onChange={() => toggleMode(mode)}
                  className="h-5 w-5 rounded-sm border border-rule-strong accent-teal"
                />
                {mode === "dengan_supir"
                  ? `${BOOKING_MODE_LABEL[mode]} (Operasional 10 Jam/Hari)`
                  : BOOKING_MODE_LABEL[mode]}
              </label>
            ))}
          </div>
          {errors.modes ? <p className="mt-1 text-meta text-danger">{errors.modes}</p> : null}
        </fieldset>

        <div>
          <label htmlFor={`${fieldId}-photo`} className="block text-meta font-medium text-ink">
            Foto unit armada (tampak depan atau samping)
          </label>
          <input
            id={`${fieldId}-photo`}
            type="file"
            accept="image/png,image/jpeg"
            onChange={(event) => handlePhoto(event.target.files?.[0])}
            className="mt-1 w-full rounded-sm border border-rule-strong bg-canvas px-3 py-1.5 text-meta text-ink file:mr-3 file:h-8 file:rounded-sm file:border-0 file:bg-navy file:px-3 file:text-meta file:font-medium file:text-white"
          />
          {errors.photo ? <p className="mt-1 text-meta text-danger">{errors.photo}</p> : null}
          <p className="mt-1 text-micro text-ink-soft">
            {photoName ? `Berkas dipilih: ${photoName}.` : "PNG atau JPG, maksimal 5 MB."}
          </p>
        </div>
      </div>
    </Modal>
  );
}
