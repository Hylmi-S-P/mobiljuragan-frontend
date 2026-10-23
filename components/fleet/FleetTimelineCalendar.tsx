"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PlateBadge } from "@/components/ui/PlateBadge";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  IconCalendar,
  IconChevronDown,
  IconArrowRight,
} from "@/components/ui/icons";
import { VEHICLE_STATUS } from "@/lib/labels";
import type { FleetCalendar, FleetEntry } from "@/lib/operations";

type Props = {
  calendar: FleetCalendar;
};

function formatDayName(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(date);
}

function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(date);
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function FleetTimelineCalendar({ calendar }: Props) {
  // Mode tampilan: "timeline" (Gantt visual) vs "table" (Tabel ringkas)
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");

  // Offset hari dari hari ini untuk navigasi timeline (0 = mulai hari ini)
  const [dayOffset, setDayOffset] = useState<number>(0);
  const daysToShow = 7; // Menampilkan 7 hari berturut-turut

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const timelineDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + dayOffset + i);
      dates.push(d);
    }
    return dates;
  }, [today, dayOffset]);

  const activeVehicles = calendar.fleet;

  return (
    <div className="space-y-4">
      {/* Bilah Kontrol Kalender & Legenda */}
      <div className="flex flex-col gap-3 rounded-md border border-rule bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        {/* Navigasi Tanggal */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDayOffset((prev) => prev - 7)}
            className="inline-flex h-9 items-center justify-center rounded-sm border border-rule bg-canvas px-3 text-meta font-medium text-ink hover:bg-surface hover:border-rule-strong"
          >
            &larr; 7 Hari Lalu
          </button>
          <button
            type="button"
            onClick={() => setDayOffset(0)}
            className={`inline-flex h-9 items-center justify-center rounded-sm border px-3 text-meta font-medium transition-colors ${
              dayOffset === 0
                ? "border-navy bg-navy text-white"
                : "border-rule bg-canvas text-ink hover:bg-surface"
            }`}
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => setDayOffset((prev) => prev + 7)}
            className="inline-flex h-9 items-center justify-center rounded-sm border border-rule bg-canvas px-3 text-meta font-medium text-ink hover:bg-surface hover:border-rule-strong"
          >
            7 Hari Depan &rarr;
          </button>

          <span className="ml-2 text-meta font-medium text-ink-soft">
            {formatDateShort(timelineDates[0])} – {formatDateShort(timelineDates[timelineDates.length - 1])}
          </span>
        </div>

        {/* Pilihan Mode & Legenda */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Legenda Warna */}
          <div className="hidden items-center gap-3 text-micro text-ink-soft md:flex">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Tersedia
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-navy" /> Disewa / Berjalan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gold" /> Booking Masuk
            </span>
          </div>

          {/* Switch Mode */}
          <div className="flex items-center rounded-sm border border-rule bg-canvas p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className={`rounded-xs px-2.5 py-1 text-meta font-medium ${
                viewMode === "timeline" ? "bg-surface font-semibold text-ink shadow-xs" : "text-ink-soft"
              }`}
            >
              Timeline
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-xs px-2.5 py-1 text-meta font-medium ${
                viewMode === "table" ? "bg-surface font-semibold text-ink shadow-xs" : "text-ink-soft"
              }`}
            >
              Tabel
            </button>
          </div>
        </div>
      </div>

      {viewMode === "timeline" ? (
        /* Matriks Gantt Visual */
        <div className="overflow-x-auto rounded-lg border border-rule bg-surface shadow-card">
          <div className="min-w-[860px]">
            {/* Header Kalender */}
            <div className="grid grid-cols-8 border-b border-rule bg-canvas text-center">
              <div className="col-span-2 border-r border-rule p-3 text-left text-meta font-semibold text-ink">
                Armada ({activeVehicles.length} Unit)
              </div>
              {timelineDates.map((date) => {
                const isCurrent = isSameDay(date, today);
                return (
                  <div
                    key={date.toISOString()}
                    className={`border-r border-rule p-2.5 text-center last:border-r-0 ${
                      isCurrent ? "bg-teal/10 font-bold text-teal" : "text-ink"
                    }`}
                  >
                    <span className="block text-micro uppercase tracking-wider text-ink-soft">
                      {formatDayName(date)}
                    </span>
                    <span className="block text-body font-semibold">{formatDateShort(date)}</span>
                    {isCurrent ? (
                      <span className="mt-0.5 inline-block rounded-full bg-teal px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                        Hari Ini
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Baris per Kendaraan */}
            <div className="divide-y divide-rule">
              {activeVehicles.map((vehicle) => {
                return (
                  <div key={vehicle.id} className="grid grid-cols-8 hover:bg-canvas/40 transition-colors">
                    {/* Info Kendaraan */}
                    <div className="col-span-2 border-r border-rule p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-body font-semibold text-ink">{vehicle.name}</span>
                        <StatusChip tone={VEHICLE_STATUS[vehicle.status].tone}>
                          {VEHICLE_STATUS[vehicle.status].label}
                        </StatusChip>
                      </div>
                      <PlateBadge plate={vehicle.plate} className="mt-1" />
                    </div>

                    {/* Kolom 6 Hari */}
                    {timelineDates.map((date) => {
                      const isCurrent = isSameDay(date, today);

                      // Cek apakah tanggal ini bertabrakan dengan jadwal sewa kendaraan
                      const activeSchedule = vehicle.schedules?.find((sch) => {
                        const start = new Date(sch.startDateTime);
                        start.setHours(0, 0, 0, 0);
                        const end = new Date(sch.endDateTime);
                        end.setHours(23, 59, 59, 999);
                        return date >= start && date <= end;
                      });

                      return (
                        <div
                          key={date.toISOString()}
                          className={`relative border-r border-rule p-1.5 last:border-r-0 flex items-center justify-center ${
                            isCurrent ? "bg-teal/5" : ""
                          }`}
                        >
                          {activeSchedule ? (
                            <div
                              title={`Pesanan ${activeSchedule.bookingCode || "Booking"}: ${activeSchedule.customerName || "Pelanggan"}`}
                              className={`w-full rounded-xs px-2 py-1.5 text-center transition-all ${
                                activeSchedule.status === "CONFIRMED" || activeSchedule.status === "IN_PROGRESS"
                                  ? "bg-navy text-white"
                                  : "bg-gold/20 text-ink border border-gold/40"
                              }`}
                            >
                              <span className="block truncate text-micro font-bold">
                                {activeSchedule.bookingCode || "Sewa"}
                              </span>
                              <span className="block truncate text-[10px] opacity-90">
                                {activeSchedule.customerName || "Pelanggan"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-micro text-ink-soft/40">—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Tabel Ringkas Alternatif */
        <div className="overflow-x-auto rounded-lg border border-rule bg-surface shadow-card">
          <table className="w-full text-left">
            <thead className="border-b border-rule bg-canvas text-meta font-semibold text-ink">
              <tr>
                <th className="px-4 py-3">Kendaraan & Plat</th>
                <th className="px-4 py-3">Status Armada</th>
                <th className="px-4 py-3">Jadwal Terdekat</th>
                <th className="px-4 py-3">Pelanggan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule text-body">
              {activeVehicles.map((vehicle) => {
                const nearest = vehicle.schedules?.[0];
                return (
                  <tr key={vehicle.id} className="hover:bg-canvas/50">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-ink">{vehicle.name}</span>
                      <PlateBadge plate={vehicle.plate} className="mt-1" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip tone={VEHICLE_STATUS[vehicle.status].tone}>
                        {VEHICLE_STATUS[vehicle.status].label}
                      </StatusChip>
                    </td>
                    <td className="px-4 py-3 text-meta">
                      {nearest ? (
                        <span className="font-medium text-ink">
                          {formatDateShort(new Date(nearest.startDateTime))} – {formatDateShort(new Date(nearest.endDateTime))}
                        </span>
                      ) : (
                        <span className="text-ink-soft">Tidak ada jadwal aktif</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-meta text-ink">
                      {nearest?.customerName ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
