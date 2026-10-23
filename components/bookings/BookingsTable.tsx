"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { PlateBadge } from "@/components/ui/PlateBadge";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import { IconArrowRight } from "@/components/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatDateRange } from "@/lib/format";
import { BOOKING_MODE_LABEL, BOOKING_STATUS } from "@/lib/labels";
import { useDebounce } from "@/lib/useDebounce";
import type { Booking, BookingStatus, Vehicle } from "@/lib/types";

/* Label aksi mengikuti nama status pada siklus hidup backend. */
const ACTION_LABEL: Record<BookingStatus, string> = {
  perlu_konfirmasi_tarif: "Detail & Verifikasi",
  perlu_alokasi_sopir: "Detail & Verifikasi",
  tarif_terkonfirmasi: "Cek Status Pesanan",
  ditolak: "Lihat Alasan Penolakan",
};

type Props = {
  initialBookings: Booking[];
  vehicles: Vehicle[];
};

export function BookingsTable({ initialBookings, vehicles }: Props) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [status, setStatus] = useState<"semua" | BookingStatus>("semua");

  // Kendaraan dicari dari daftar yang dikirim server, bukan dari data contoh.
  const vehicleById = useMemo(() => {
    const byId = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
    return (id: string) => byId.get(id);
  }, [vehicles]);

  const filtered = useMemo(() => {
    const keyword = debouncedQuery.trim().toLowerCase();
    return initialBookings.filter((booking) => {
      if (status !== "semua" && booking.status !== status) return false;
      if (keyword.length === 0) return true;
      const vehicle = vehicleById(booking.vehicleId);
      return [
        booking.customerName,
        booking.customerContext ?? "",
        booking.code,
        vehicle?.name ?? "",
        vehicle?.plate ?? "",
      ].some((field) => field.toLowerCase().includes(keyword));
    });
  }, [debouncedQuery, status, initialBookings, vehicleById]);

  function resetFilters() {
    setQuery("");
    setStatus("semua");
  }

  return (
    <Panel>
      {/* Baris Pencarian Ter-debounce dan Filter Status Terpusat & Compact */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="booking-search" className="block text-meta font-medium text-ink">
              Cari pemesan, kode booking, atau plat nomor
            </label>
            <input
              id="booking-search"
              maxLength={80}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ketik untuk mencari (contoh: Maria, BK-MRK, PA8593GZ)..."
              className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
        </div>

        {/* Filter Status Compact & Sentral (Segmented Pills) */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-rule bg-canvas p-1.5">
          <button
            type="button"
            onClick={() => setStatus("semua")}
            className={`rounded-xs px-3 py-1.5 text-meta font-medium transition-colors ${
              status === "semua"
                ? "bg-surface font-semibold text-ink shadow-xs"
                : "text-ink-soft hover:bg-surface/50 hover:text-ink"
            }`}
          >
            Semua ({initialBookings.length})
          </button>
          {Object.entries(BOOKING_STATUS).map(([value, meta]) => {
            const count = initialBookings.filter((b) => b.status === value).length;
            const isSelected = status === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value as BookingStatus)}
                className={`flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-meta font-medium transition-colors ${
                  isSelected
                    ? "bg-surface font-semibold text-ink shadow-xs"
                    : "text-ink-soft hover:bg-surface/50 hover:text-ink"
                }`}
              >
                <span>{meta.label}</span>
                {count > 0 ? (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-micro ${
                      isSelected ? "bg-navy/10 text-navy font-bold" : "bg-rule text-ink-soft"
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-sm border border-rule bg-canvas px-4 py-5">
          {initialBookings.length === 0 ? (
            <>
              <p className="text-body font-semibold text-ink">Belum ada pesanan masuk.</p>
              <p className="mt-1 text-body text-ink-soft">
                Antrean ini terisi begitu pelanggan mengirim pemesanan dari aplikasi mobile.
              </p>
            </>
          ) : (
            <>
              <p className="text-body font-semibold text-ink">
                Tidak ada pesanan yang cocok dengan filter itu.
              </p>
              <p className="mt-1 text-body text-ink-soft">
                Kosongkan kata kunci atau pilih semua status untuk melihat seluruh antrean.
              </p>
              <Button variant="outline" className="mt-3" onClick={resetFilters}>
                Bersihkan filter
              </Button>
            </>
          )}
        </div>
      ) : (
        <Table caption="Antrean pesanan pelanggan">
          <TableHead>
            <TableRow>
              <TableHeaderCell className="w-[240px]">Pemesan &amp; Kode</TableHeaderCell>
              <TableHeaderCell className="w-[240px]">Armada</TableHeaderCell>
              <TableHeaderCell className="w-[180px]">Rentang Tanggal</TableHeaderCell>
              <TableHeaderCell className="w-[170px]">Status</TableHeaderCell>
              <TableHeaderCell className="w-[110px] text-right">Aksi</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((booking) => {
              const vehicle = vehicleById(booking.vehicleId);
              const statusMeta = BOOKING_STATUS[booking.status];
              return (
                <TableRow key={booking.id} className="hover:bg-canvas/50">
                  <TableCell className="text-left">
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="block text-body font-semibold text-ink hover:text-navy hover:underline"
                    >
                      {booking.customerName}
                    </Link>
                    <span className="mt-0.5 block text-micro text-ink-soft">
                      {booking.code} &bull; {BOOKING_MODE_LABEL[booking.mode]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block text-body font-medium text-ink">{vehicle?.name}</span>
                    {vehicle ? <PlateBadge plate={vehicle.plate} className="mt-1" /> : null}
                  </TableCell>
                  <TableCell className="text-body tabular-nums">
                    {formatDateRange(booking.startDate, booking.endDate, booking.dayCount)}
                  </TableCell>
                  <TableCell>
                    <StatusChip tone={statusMeta.tone}>{statusMeta.label}</StatusChip>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="inline-flex items-center gap-1 rounded-sm border border-rule bg-canvas px-2.5 py-1 text-meta font-medium text-ink hover:border-navy hover:text-navy transition-colors"
                    >
                      <span>Buka</span>
                      <IconArrowRight className="h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
