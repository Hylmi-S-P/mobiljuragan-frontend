"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { IconTrash } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { DRIVER_LICENSE, DRIVER_ROUTE } from "@/lib/labels";
import type { Driver, DriverLicenseType, DriverRoute } from "@/lib/types";

type Props = {
  driver?: Driver;
  onClose: () => void;
  onSave: (driver: Driver) => void;
  /** Dipanggil saat admin meminta penghapusan dari dalam modal kelola. */
  onRequestDelete?: (driverId: string) => void;
};

export function DriverFormModal({ driver, onClose, onSave, onRequestDelete }: Props) {
  const fieldId = useId();
  const [hapusDiminta, setHapusDiminta] = useState(false);
  const [label, setLabel] = useState(driver?.label ?? "");
  const [contact, setContact] = useState(driver?.contact ?? "");
  const [route, setRoute] = useState<DriverRoute>(driver?.route ?? "dalam_kota");
  const [licenseType, setLicenseType] = useState<DriverLicenseType | "">(
    driver?.licenseType ?? "",
  );
  const [licensePhotoUrl, setLicensePhotoUrl] = useState<string | null>(
    driver?.licensePhotoUrl ?? null,
  );
  const [fotoError, setFotoError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Membaca foto SIM yang dipilih admin.
   *
   * Ukuran dan jenis diperiksa SEBELUM file dibaca penuh, supaya berkas 40 MB
   * tidak sempat dimuat ke memori hanya untuk ditolak. Batasnya sama dengan
   * yang dipakai server: 5 MB, hanya PNG dan JPEG.
   */
  function handlePilihFoto(file: File | null) {
    setFotoError(null);

    if (!file) {
      setLicensePhotoUrl(null);
      return;
    }

    const BATAS = 5 * 1024 * 1024;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setFotoError("Foto SIM harus berformat PNG atau JPG.");
      return;
    }
    if (file.size > BATAS) {
      setFotoError(
        `Foto SIM ${(file.size / 1024 / 1024).toFixed(1)} MB, melebihi batas 5 MB.`,
      );
      return;
    }

    const pembaca = new FileReader();
    pembaca.onload = () => {
      setLicensePhotoUrl(typeof pembaca.result === "string" ? pembaca.result : null);
    };
    pembaca.onerror = () => setFotoError("Foto gagal dibaca. Coba berkas lain.");
    pembaca.readAsDataURL(file);
  }

  function handleSave() {
    const nextErrors: Record<string, string> = {};
    if (label.trim().length === 0) nextErrors.label = "Nama lengkap supir wajib diisi.";

    const trimmedContact = contact.trim();
    if (trimmedContact.length > 0) {
      const digits = trimmedContact.replace(/[^\d]/g, "");
      if (digits.length < 8) {
        nextErrors.contact =
          "Nomor kontak minimal 8 angka, boleh memakai tanda + atau tanda hubung.";
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSave({
      id: driver?.id ?? `d-${Date.now()}`,
      label: label.trim(),
      route,
      contact: trimmedContact.length > 0 ? trimmedContact : null,
      /* Nomor SIM tidak lagi diisi dari form. Kelayakan mengemudi diperiksa saat
         wawancara dengan melihat dokumen fisik, jadi kolom ini hanya dipertahankan
         agar data lama tidak terhapus saat profil supir disunting. */
      licenseNumber: driver?.licenseNumber ?? null,
      licenseType: licenseType === "" ? null : licenseType,
      licensePhotoUrl,
      status: driver?.status ?? "siaga",
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={driver ? "Edit Data Supir" : "Tambah Supir Baru"}
      description="Pendaftaran supir resmi MobilJuragan untuk penugasan armada sewa dengan supir."
      footer={
        <>
          {driver && onRequestDelete ? (
            <div className="mr-auto flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-meta text-ink">
                <input
                  type="checkbox"
                  data-testid="hapus-diminta"
                  checked={hapusDiminta}
                  onChange={(event) => setHapusDiminta(event.target.checked)}
                  className="h-4 w-4 accent-danger"
                />
                <span>Hapus supir ini</span>
              </label>
              <Button
                variant="danger"
                disabled={!hapusDiminta}
                onClick={() => onRequestDelete(driver.id)}
              >
                <IconTrash className="h-4 w-4" />
                Hapus Supir
              </Button>
            </div>
          ) : null}
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="confirm" onClick={handleSave}>
            {driver ? "Simpan Perubahan" : "+ Simpan Supir"}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div>
          <label htmlFor={`${fieldId}-label`} className="block text-meta font-medium text-ink">
            Nama lengkap supir
          </label>
          <input
            id={`${fieldId}-label`}
            maxLength={80}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            aria-invalid={Boolean(errors.label)}
            aria-describedby={errors.label ? `${fieldId}-label-error` : undefined}
            className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink"
            placeholder="Nama sesuai KTP"
          />
          {errors.label ? (
            <p id={`${fieldId}-label-error`} className="mt-1 text-meta text-danger">
              {errors.label}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={`${fieldId}-contact`} className="block text-meta font-medium text-ink">
            Nomor kontak WhatsApp
          </label>
          <input
            id={`${fieldId}-contact`}
            inputMode="tel"
            maxLength={20}
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            aria-invalid={Boolean(errors.contact)}
            aria-describedby={
              errors.contact ? `${fieldId}-contact-error` : `${fieldId}-contact-hint`
            }
            className="tabular-nums mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink"
            placeholder="+62 ..."
          />
          {errors.contact ? (
            <p id={`${fieldId}-contact-error`} className="mt-1 text-meta text-danger">
              {errors.contact}
            </p>
          ) : (
            <p id={`${fieldId}-contact-hint`} className="mt-1 text-micro text-ink-soft">
              Diisi manual oleh admin, bukan data contoh dari sistem.
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${fieldId}-route`} className="block text-meta font-medium text-ink">
            Rute penugasan operasional
          </label>
          <select
            id={`${fieldId}-route`}
            value={route}
            onChange={(event) => setRoute(event.target.value as DriverRoute)}
            className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink"
          >
            {Object.entries(DRIVER_ROUTE).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${fieldId}-license`} className="block text-meta font-medium text-ink">
            Golongan SIM
          </label>
          <select
            id={`${fieldId}-license`}
            value={licenseType}
            onChange={(event) => setLicenseType(event.target.value as DriverLicenseType | "")}
            className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink"
          >
            {/* Pilihan kosong supaya admin tidak dipaksa memilih saat datanya belum ada. */}
            <option value="">Belum ditetapkan</option>
            {Object.entries(DRIVER_LICENSE).map(([value, info]) => (
              <option key={value} value={value}>
                {info.label} — {info.keterangan}
              </option>
            ))}
          </select>
          <p className="mt-1 text-micro text-ink-soft">
            Nomor SIM tidak diisi di sini: kelayakan mengemudi diperiksa saat wawancara
            dengan melihat dokumen fisik.
          </p>
        </div>

        <div>
          <label htmlFor={`${fieldId}-license-photo`} className="block text-meta font-medium text-ink">
            Foto SIM
          </label>
          <input
            id={`${fieldId}-license-photo`}
            type="file"
            accept="image/png,image/jpeg"
            onChange={(event) => handlePilihFoto(event.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-meta text-ink file:mr-3 file:rounded-sm file:border file:border-rule-strong file:bg-canvas file:px-3 file:py-1.5 file:text-meta file:font-medium file:text-ink hover:file:border-navy"
          />
          <p className="mt-1 text-micro text-ink-soft">
            PNG atau JPG, maksimal 5 MB.
          </p>
          {fotoError ? (
            <p className="mt-1 text-meta text-danger">{fotoError}</p>
          ) : null}
          {licensePhotoUrl ? (
            <div className="mt-2 flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- foto SIM adalah data URL
                  Base64 dari unggahan admin, bukan aset statis yang bisa dioptimalkan Next. */}
              <img
                src={licensePhotoUrl}
                alt="Pratinjau foto SIM supir"
                className="h-20 w-32 rounded-sm border border-rule object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setLicensePhotoUrl(null);
                  setFotoError(null);
                }}
                className="rounded-sm border border-rule px-2.5 py-1 text-meta font-medium text-danger hover:bg-danger/10"
              >
                Hapus foto
              </button>
            </div>
          ) : null}
        </div>

        {driver ? null : (
          <p className="text-micro text-ink-soft">
            Status awal supir baru adalah Siaga. Ubah lewat sakelar di roster kalau belum bisa
            ditugaskan.
          </p>
        )}
      </div>
    </Modal>
  );
}
