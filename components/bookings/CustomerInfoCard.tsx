"use client";

import { useMemo } from "react";
import { DataField, Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatDateRange } from "@/lib/format";
import type { Booking } from "@/lib/types";

type Props = {
  booking: Booking;
};

const LUAR_KOTA_KEYWORDS = [
  "sota",
  "kurik",
  "tanah miring",
  "muting",
  "okaba",
  "ilwayab",
  "semangga",
  "kimaam",
  "naukenjerai",
  "luar kota",
  "bovendigoel",
  "boven digoel",
];

export function CustomerInfoCard({ booking }: Props) {
  const isDriverService = booking.mode === "dengan_supir";

  // Deteksi rute luar kota Merauke
  const isLuarKota = useMemo(() => {
    const loc = (booking.pickupRoute ?? "").toLowerCase();
    const note = (booking.customerContext ?? "").toLowerCase();
    return LUAR_KOTA_KEYWORDS.some((kw) => loc.includes(kw) || note.includes(kw));
  }, [booking.pickupRoute, booking.customerContext]);

  // Ekstraksi nomor WhatsApp pelanggan jika ada
  const rawContact = booking.customerContext ?? "";
  const phoneDigits = rawContact.replace(/\D/g, "");
  const hasValidPhone = phoneDigits.length >= 9;

  let waUrl: string | null = null;
  if (hasValidPhone) {
    const normalizedPhone = phoneDigits.startsWith("0")
      ? `62${phoneDigits.slice(1)}`
      : phoneDigits.startsWith("62")
        ? phoneDigits
        : `62${phoneDigits}`;
    waUrl = `https://wa.me/${normalizedPhone}`;
  }

  return (
    <Panel
      title="Informasi Pelanggan & Pemesanan"
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusChip tone={isDriverService ? "busy" : "available"}>
            {isDriverService ? "Dengan Supir Resmi" : "Lepas Kunci (Self-Drive)"}
          </StatusChip>
          <StatusChip tone={isLuarKota ? "pending" : "neutral"}>
            {isLuarKota ? "Rute Luar Kota Merauke" : "Rute Dalam Kota Merauke"}
          </StatusChip>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <DataField label={isDriverService ? "Nama pemesan / PIC" : "Nama lengkap"}>
          {booking.customerName}
        </DataField>

        <div className="min-w-0">
          <p className="text-micro font-semibold uppercase text-ink-soft">Nomor WhatsApp</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="truncate text-meta font-medium text-ink tabular-nums">
              {rawContact || "Belum diverifikasi"}
            </span>
            {hasValidPhone && waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-sm border border-teal/40 bg-teal/10 px-1.5 py-0.5 text-micro font-medium text-teal hover:bg-teal/20 transition-colors"
                title="Buka WhatsApp Pelanggan"
              >
                <span>Terverifikasi</span>
                <span className="text-[10px]">&#8599;</span>
              </a>
            ) : (
              <span className="inline-flex items-center rounded-sm border border-rule px-1.5 py-0.5 text-micro text-ink-soft">
                Belum diverifikasi
              </span>
            )}
          </div>
        </div>

        <DataField label="Durasi sewa">
          {formatDateRange(booking.startDate, booking.endDate, booking.dayCount)}
        </DataField>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3 border-t border-rule/50 pt-3.5">
        <DataField label="Titik jemput">
          {booking.pickupRoute || "Kantor MobilJuragan (Jl. Raya Mandala, Merauke)"}
        </DataField>

        <DataField label="Rute perjalanan">
          {isLuarKota ? "Luar Kota (Lintas Distrik)" : "Dalam Kota Merauke"}
        </DataField>

        <DataField label="Jenis layanan">
          {booking.serviceType || (isDriverService ? "Rental Dengan Supir" : "Rental Lepas Kunci")}
        </DataField>
      </div>

      {/* Catatan Kebutuhan Perjalanan Khusus */}
      <div className="mt-3.5 rounded-sm border border-rule bg-canvas p-3">
        <p className="text-micro font-bold uppercase text-ink-soft">
          Catatan Khusus &amp; Konteks Perjalanan
        </p>
        <p className="mt-1 text-meta text-ink leading-relaxed">
          {booking.customerContext && !hasValidPhone
            ? booking.customerContext
            : "Pemesanan sewa unit operasional resmi untuk kebutuhan mobilitas di area Merauke dan sekitarnya."}
        </p>
      </div>
    </Panel>
  );
}
