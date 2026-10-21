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

  const hasGenuineNote = Boolean(
    booking.customerContext && !hasValidPhone && booking.customerContext.trim().length > 0,
  );

  return (
    <Panel
      title="Informasi Pelanggan & Pemesanan"
      action={
        <div className="flex items-center gap-1.5">
          <StatusChip tone={isDriverService ? "busy" : "available"}>
            {isDriverService ? "Dengan Supir" : "Lepas Kunci"}
          </StatusChip>
          {isLuarKota ? <StatusChip tone="pending">Luar Kota</StatusChip> : null}
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <DataField label={isDriverService ? "Nama pemesan / PIC" : "Nama lengkap"}>
          {booking.customerName}
        </DataField>

        <div className="min-w-0">
          <p className="text-micro font-semibold uppercase text-ink-soft">Nomor WhatsApp</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="truncate text-meta font-medium text-ink tabular-nums">
              {rawContact || "Belum diverifikasi"}
            </span>
            {hasValidPhone && waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-micro font-medium text-teal hover:underline inline-flex items-center gap-0.5"
              >
                Hubungi WA ↗
              </a>
            ) : null}
          </div>
        </div>

        <DataField label="Durasi sewa">
          {formatDateRange(booking.startDate, booking.endDate, booking.dayCount)}
        </DataField>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3 border-t border-rule/50 pt-3.5">
        <DataField label="Titik jemput">
          {booking.pickupRoute || "Kantor MobilJuragan"}
        </DataField>

        <DataField label="Rute perjalanan">
          {isLuarKota ? "Luar Kota Merauke" : "Dalam Kota Merauke"}
        </DataField>

        <DataField label="Jenis layanan">
          {booking.serviceType || (isDriverService ? "Dengan Supir" : "Lepas Kunci")}
        </DataField>
      </div>

      {/* Catatan Kebutuhan Perjalanan Khusus — hanya tampil jika ada catatan nyata */}
      {hasGenuineNote ? (
        <div className="mt-3.5 rounded-sm border border-rule bg-canvas p-3">
          <p className="text-micro font-bold uppercase text-ink-soft">Catatan Pelanggan</p>
          <p className="mt-1 text-meta text-ink leading-relaxed">{booking.customerContext}</p>
        </div>
      ) : null}
    </Panel>
  );
}
