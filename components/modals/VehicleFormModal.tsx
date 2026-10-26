"use client";

import { useEffect, useId, useState } from "react";

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
const JENIS_FOTO = ["image/png", "image/jpeg"];

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
  const [priceInput, setPriceInput] = useState<string>(() => {
    const p = vehicle?.pricePerDay ?? 400000;
    return p > 0 ? p.toLocaleString("id-ID") : "400.000";
  });
  const [status, setStatus] = useState<VehicleStatus>(vehicle?.status ?? "tersedia");
  const [modes, setModes] = useState<BookingMode[]>(
    vehicle?.allowedModes ?? ["lepas_kunci", "dengan_supir"],
  );
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  /* Foto disimpan sebagai data URL di state, terpisah dari pratinjau.
     Pratinjau memakai object URL yang dibebaskan saat modal ditutup; data URL
     inilah yang benar-benar dikirim ke server. Sebelumnya tidak ada, sehingga
     foto hanya terlihat di layar lalu hilang. */
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(vehicle?.imageUrl ?? null);

  /* Object URL pratinjau harus dibebaskan saat modal ditutup. Tanpa ini, setiap
     berkas yang pernah dipilih tetap tertahan di memori sampai halaman dimuat ulang. */
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleMode(mode: BookingMode) {
    setModes((current) =>
      current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode],
    );
  }

  function handlePhoto(file: File | undefined) {
    if (!file) {
      setPhotoName(null);
      bebaskanPratinjau();
      return;
    }

    /* Jenis berkas diperiksa di sini, bukan hanya lewat atribut accept. Atribut itu
       hanya menyaring dialog pemilih berkas; berkas lain tetap bisa masuk lewat
       seret-lepas atau dengan mengganti pilihan ke semua berkas. */
    if (!JENIS_FOTO.includes(file.type)) {
      setErrors((current) => ({ ...current, photo: "Berkas harus PNG atau JPG." }));
      setPhotoName(null);
      bebaskanPratinjau();
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setErrors((current) => ({ ...current, photo: "Ukuran berkas melebihi 5 MB." }));
      setPhotoName(null);
      bebaskanPratinjau();
      return;
    }

    setErrors((current) => {
      if (!current.photo) return current;
      const next = { ...current };
      delete next.photo;
      return next;
    });
    setPhotoName(file.name);
    tampilkanPratinjau(file);

    /* Pembacaan dilakukan sekali di sini, bukan saat menyimpan, supaya kegagalan
       baca berkas langsung terlihat dan tidak menahan proses simpan. */
    const pembaca = new FileReader();
    pembaca.onload = () => {
      if (typeof pembaca.result === "string") setPhotoDataUrl(pembaca.result);
    };
    pembaca.readAsDataURL(file);
  }

  /* Pratinjau memakai object URL, bukan pembacaan base64. Berkas 5 MB menjadi sekitar
     6,7 MB teks kalau diubah ke base64, dan itu menahan seluruh isi berkas di memori
     hanya untuk menampilkan gambar. URL dibebaskan lagi supaya tidak bocor. */
  function tampilkanPratinjau(file: File) {
    bebaskanPratinjau();
    setPhotoUrl(URL.createObjectURL(file));
  }

  function bebaskanPratinjau() {
    setPhotoUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
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
      seats: vehicle?.seats ?? 7,
      pricePerDay: numericPrice,
      imageUrl: photoDataUrl,
      /* Karakteristik penggunaan sengaja tidak lagi diisi dari form. Field-nya
         dihapus karena tidak pernah tampil di antarmuka dan tidak pernah diteruskan
         backend, jadi nilai lama dipertahankan agar data yang sudah ada tidak hilang
         saat unit disunting. */
      usage: vehicle?.usage ?? null,
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

        <div className="grid gap-3.5 sm:grid-cols-2">
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
                {/* Keterangan "(Operasional 10 Jam/Hari)" sengaja dilepas: durasi
                    operasional berbeda per paket sewa, jadi menuliskannya di sini
                    justru membuat admin mengira itu angka tetap. */}
                {BOOKING_MODE_LABEL[mode]}
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

          {photoUrl ? (
            <div className="mt-2 flex items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt={`Pratinjau foto ${name || "unit armada"}`}
                className="h-20 w-28 rounded-sm border border-rule object-cover"
              />
              <p className="text-micro text-ink-soft">
                Pratinjau berkas yang dipilih. Berkas belum diunggah ke server.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
