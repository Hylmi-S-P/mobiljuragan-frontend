"use client";

import React, { useEffect, useState } from "react";
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
 */
export function Toast({
  message,
  tone = "success",
  durationMs = 3000,
  onClose,
}: ToastProps) {
  const [progress, setProgress] = useState(100);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onCloseRef.current();
      }
    }, 50);

    return () => clearInterval(interval);
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
      className={`fixed bottom-5 right-5 z-50 flex max-w-sm flex-col overflow-hidden rounded-md border shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 ${toneConfig.bg}`}
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

      {/* Progress bar timer auto dismiss */}
      <div className="h-0.5 w-full bg-canvas">
        <div
          className={`h-full transition-all duration-75 ${toneConfig.barBg}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
