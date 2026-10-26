"use client";

import { useEffect } from "react";
import { IconClose } from "./icons";

export type ToastTone = "success" | "error" | "info";

export type ToastProps = {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
  onClose: () => void;
};

/**
 * Toast feedback notifikasi mengambang dengan durasi auto-dismiss 2.5 - 4 detik,
 * garis progres waktu, dan tombol tutup instan.
 *
 * Posisinya di kanan atas, bukan kanan bawah: pada layar ponsel bagian bawah
 * sering tertutup tombol aksi atau keyboard, sehingga notifikasi di sana mudah
 * terlewat.
 */
export function Toast({
  message,
  tone = "success",
  durationMs = 3000,
  onClose,
}: ToastProps) {
  /* Hanya satu pengatur waktu, tanpa state yang diperbarui terus-menerus.
     Sebelumnya garis progres memakai `setProgress` tiap 50 ms, yang memicu
     render ulang puluhan kali selama 3 detik dan membuat elemen lain di halaman
     tampak berkedip. Sekarang garis progres dianimasikan CSS, dan React hanya
     dipakai untuk menutup notifikasi sekali di akhir. */
  useEffect(() => {
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
    /* `onClose` sengaja tidak masuk daftar ketergantungan. Kalau dimasukkan,
       setiap render induk membuat fungsi baru dan pengatur waktu ikut diulang,
       sehingga notifikasi tidak pernah selesai menutup sendiri. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs]);

  const toneConfig = {
    success: {
      bg: "bg-surface border-teal/40 text-ink",
      iconColor: "text-teal",
      barBg: "bg-teal",
    },
    error: {
      bg: "bg-surface border-danger/40 text-ink",
      iconColor: "text-danger",
      barBg: "bg-danger",
    },
    info: {
      bg: "bg-surface border-navy/40 text-ink",
      iconColor: "text-navy",
      barBg: "bg-navy",
    },
  }[tone];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed right-5 top-5 z-50 flex max-w-sm flex-col overflow-hidden rounded-md border shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${toneConfig.bg}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-body font-medium text-ink">{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup notifikasi"
          className="rounded p-1 text-ink-soft hover:bg-canvas hover:text-ink transition-colors"
        >
          <IconClose className="h-4 w-4" />
        </button>
      </div>

      {/* Garis waktu. Dianimasikan CSS dari lebar penuh ke nol, jadi tidak ada
          render ulang React selama notifikasi tampil. */}
      <div className="h-0.5 w-full bg-canvas">
        <div
          className={`h-full ${toneConfig.barBg} animate-toast-progress`}
          style={{ animationDuration: `${durationMs}ms` }}
        />
      </div>
    </div>
  );
}