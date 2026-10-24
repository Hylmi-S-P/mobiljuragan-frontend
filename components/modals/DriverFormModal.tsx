"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { IconTrash } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { DRIVER_ROUTE } from "@/lib/labels";
import type { Driver, DriverRoute } from "@/lib/types";

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
  const [errors, setErrors] = useState<Record<string, string>>({});

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
