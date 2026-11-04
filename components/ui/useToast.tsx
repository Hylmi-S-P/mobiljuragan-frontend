"use client";

import { useCallback, useRef, useState } from "react";
import { Toast, type ToastTone } from "./Toast";

type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
};

/**
 * Satu-satunya cara menampilkan notifikasi mengambang di dashboard.
 *
 * Sebelumnya tiap halaman menyimpan sendiri state-nya, dan bentuknya berbeda-beda:
 * ada yang dua state terpisah (`toastMessage` + `toastTone`), ada yang satu objek
 * `{ text, tone }`, ada yang memakai boolean `isError`. Akibatnya durasi tampil
 * ikut berbeda (3000 vs 3500 ms) dan cara menyatakan tone tidak seragam.
 *
 * `id` yang selalu naik dipakai sebagai `key` pada `Toast`. Ini bukan hiasan:
 * `Toast` hanya memasang ulang pengatur waktunya ketika `durationMs` berubah.
 * Tanpa `key`, notifikasi kedua mewarisi sisa waktu notifikasi pertama, sehingga
 * bisa muncul sekejap lalu hilang. Dengan `key` yang berbeda, komponen dipasang
 * ulang dan pengatur waktunya mulai dari nol.
 */
export function useToast(durationMs = 3500) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const urutan = useRef(0);

  const show = useCallback((message: string, tone: ToastTone = "success") => {
    urutan.current += 1;
    setToast({ id: urutan.current, message, tone });
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  const node = toast ? (
    <Toast
      key={toast.id}
      message={toast.message}
      tone={toast.tone}
      durationMs={durationMs}
      onClose={dismiss}
    />
  ) : null;

  return { show, dismiss, node };
}
