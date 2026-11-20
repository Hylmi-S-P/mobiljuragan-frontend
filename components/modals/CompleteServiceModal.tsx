"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Vehicle } from "@/lib/types";

type Props = {
  vehicle: Vehicle;
  onClose: () => void;
  onConfirm: (note: string) => void;
};

/**
 * Menutup masa pemeriksaan unit yang baru dikembalikan pelanggan.
 *
 * Catatan wajib diisi karena menjadi satu-satunya keterangan kondisi unit saat
 * diterima kembali. Tanpa catatan, riwayat inspeksi hanya berisi stempel waktu
 * yang tidak menjelaskan apa pun saat ditanyakan kemudian.
 */
export function CompleteServiceModal({ vehicle, onClose, onConfirm }: Props) {
  const [catatan, setCatatan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);

  function handleConfirm() {
    const isi = catatan.trim();
    if (isi.length < 3) {
      setGalat("Catatan inspeksi wajib diisi minimal 3 karakter.");
      return;
    }
    onConfirm(isi);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Selesai Inspeksi Armada"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="confirm" onClick={handleConfirm}>
            Selesai Inspeksi
          </Button>
        </>
      }
    >
      <p className="text-body text-ink">
        Unit {vehicle.name} dengan plat {vehicle.plate} sedang dalam masa pemeriksaan setelah sewa
        berakhir. Setelah inspeksi selesai, unit kembali muncul di katalog pelanggan.
      </p>

      <label htmlFor="catatan-inspeksi" className="mt-4 block text-meta font-medium text-ink">
        Catatan Inspeksi <span className="text-danger">*</span>
      </label>
      <textarea
        id="catatan-inspeksi"
        value={catatan}
        onChange={(event) => {
          setCatatan(event.target.value);
          if (galat) setGalat(null);
        }}
        maxLength={300}
        rows={3}
        placeholder="Contoh: Body bersih, bahan bakar tersisa setengah, tidak ada kerusakan baru."
        className="mt-1 w-full rounded-sm border border-rule-strong bg-canvas px-3 py-2 text-body text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-micro text-ink-soft">{catatan.length}/300</span>
        {galat ? <span className="text-micro font-medium text-danger">{galat}</span> : null}
      </div>
    </Modal>
  );
}
