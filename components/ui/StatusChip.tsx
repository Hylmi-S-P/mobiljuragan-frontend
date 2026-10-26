import type { ReactNode } from "react";

export type ChipTone =
  | "available"
  | "busy"
  | "service"
  | "pending"
  | "neutral"
  | "danger"
  /* Nada khusus status armada. Dipisahkan dari nada umum karena arti warnanya
     berbeda per domain: "servis" pada armada berarti sedang dirawat (kuning),
     sedangkan tone "service" yang lama juga dipakai status pembayaran
     "Dikembalikan". Mengubah tone umum akan ikut mengubah arti di domain lain. */
  | "vehicleService"
  | "vehicleUnavailable";

const TONES: Record<ChipTone, string> = {
  available: "border-teal text-teal",
  busy: "border-navy text-navy",
  service: "border-rule-strong text-ink-soft",
  pending: "border-transparent bg-gold text-ink",
  neutral: "border-rule text-ink-soft",
  danger: "border-danger text-danger",
  vehicleService: "border-gold text-gold",
  vehicleUnavailable: "border-danger-soft text-danger-soft",
};

/* Status selalu membawa teks, tidak pernah hanya warna, supaya tetap terbaca
   oleh pengguna dengan gangguan penglihatan warna. */
export function StatusChip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-meta font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
