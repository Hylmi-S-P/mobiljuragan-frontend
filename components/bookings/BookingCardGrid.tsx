"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { PlateBadge } from "@/components/ui/PlateBadge";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  IconArrowRight,
  IconCalendar,
  IconCar,
  IconSearch,
  IconUser,
} from "@/components/ui/icons";
import { formatDateRange, formatRupiah } from "@/lib/format";
import { BOOKING_MODE_LABEL, BOOKING_STATUS } from "@/lib/labels";
import { useDebounce } from "@/lib/useDebounce";
import type { Booking, BookingStatus, Vehicle } from "@/lib/types";

/* Label aksi spesifik sesuai alur konfirmasi dan penugasan operasional. */
const ACTION_BUTTON_TEXT: Record<BookingStatus, string> = {
  perlu_konfirmasi_tarif: "Konfirmasi Tarif",
  perlu_alokasi_sopir: "Pilih Supir",
  tarif_terkonfirmasi: "Cek Status Pesanan",
  ditolak: "Lihat Alasan",
};

type Props = {
  initialBookings: Booking[];
  vehicles: Vehicle[];
};

/**
 * BookingCardGrid: Grid kartu responsif untuk antrean pesanan masuk MobilJuragan.
 * Menggantikan tabel datar 5-kolom agar nyaman diakses di ponsel/tablet tanpa gulir horizontal.
 */
export function BookingCardGrid({ initialBookings, vehicles }: Props) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [status, setStatus] = useState<"semua" | BookingStatus>("semua");

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
      {/* Baris Pencarian Ter-debounce & Segmented Pill Filter */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="booking-search" className="block text-meta font-medium text-ink">
              Cari pemesan, kode booking, atau armada
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-soft">
                <IconSearch className="h-4 w-4" />
              </span>
              <input
                id="booking-search"
                maxLength={80}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ketik nama pelanggan, BK-MRK, atau plat nomor..."
                className="h-11 w-full rounded-sm border border-rule-strong bg-canvas pl-9 pr-3 text-body text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
          </div>
        </div>

        {/* Filter Segmented Pills */}
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

      {/* Grid Kartu Pesanan atau Empty State */}
      {filtered.length === 0 ? (
        <div className="rounded-card border border-rule bg-canvas px-4 py-8 text-center sm:px-6">
          {initialBookings.length === 0 ? (
            <>
              <p className="text-body font-semibold text-ink">Belum ada pesanan masuk.</p>
              <p className="mt-1 text-meta text-ink-soft">
                Antrean ini terisi otomatis saat pelanggan mengirimkan sewa dari aplikasi mobile.
              </p>
            </>
          ) : (
            <>
              <p className="text-body font-semibold text-ink">
                Tidak ada pesanan yang sesuai dengan filter.
              </p>
              <p className="mt-1 text-meta text-ink-soft">
                Coba sesuaikan kata kunci atau bersihkan filter status untuk melihat antrean lainnya.
              </p>
              <Button variant="outline" className="mt-4" onClick={resetFilters}>
                Bersihkan Filter
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((booking) => {
            const vehicle = vehicleById(booking.vehicleId);
            const statusMeta = BOOKING_STATUS[booking.status];
            const actionText = ACTION_BUTTON_TEXT[booking.status] ?? "Detail & Verifikasi";
            const isUrgent = booking.status === "perlu_konfirmasi_tarif" || booking.status === "perlu_alokasi_sopir";

            return (
              <div
                key={booking.id}
                className="group relative flex flex-col justify-between rounded-card border border-rule bg-surface p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-navy/40 hover:shadow-sm"
              >
                <div>
                  {/* Header Kartu: Nama Pemesan & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="block font-semibold text-ink text-subtitle hover:text-navy hover:underline truncate"
                      >
                        {booking.customerName}
                      </Link>
                      <span className="mt-0.5 inline-block font-mono text-micro text-ink-soft">
                        {booking.code}
                      </span>
                    </div>
                    <StatusChip tone={statusMeta.tone}>{statusMeta.label}</StatusChip>
                  </div>

                  {/* Info Armada & Plat */}
                  <div className="mt-3.5 flex items-center justify-between gap-2 rounded-sm border border-rule/60 bg-canvas/60 p-2.5">
                    <div className="min-w-0 flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy/10 text-navy">
                        <IconCar className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate text-body font-medium text-ink">
                          {vehicle?.name ?? "Armada belum dipilih"}
                        </span>
                        <span className="text-micro text-ink-soft">
                          {BOOKING_MODE_LABEL[booking.mode]}
                        </span>
                      </div>
                    </div>
                    {vehicle ? <PlateBadge plate={vehicle.plate} /> : null}
                  </div>

                  {/* Rentang Tanggal & Durasi */}
                  <div className="mt-3 flex items-center gap-2 text-meta text-ink-soft">
                    <IconCalendar className="h-4 w-4 shrink-0 text-navy/70" />
                    <span className="tabular-nums">
                      {formatDateRange(booking.startDate, booking.endDate, booking.dayCount)}
                    </span>
                  </div>

                  {/* Catatan Rute / Nominal Biaya */}
                  <div className="mt-2.5 flex items-center justify-between text-micro text-ink-soft pt-2 border-t border-rule/50">
                    <span>
                      {booking.pickupRoute
                        ? `Rute: ${booking.pickupRoute}`
                        : `Layanan: ${booking.serviceType || "Standard"}`}
                    </span>
                    {booking.quotedAmount ? (
                      <span className="font-semibold text-ink tabular-nums text-body">
                        {formatRupiah(booking.quotedAmount)}
                      </span>
                    ) : (
                      <span className="italic text-ink-soft">Tarif belum ditetapkan</span>
                    )}
                  </div>

                  {/* Lencana Status Pembayaran / Bukti Transfer */}
                  {booking.payment ? (
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      {booking.payment.status === "PAID" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-micro font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Pembayaran Lunas
                        </span>
                      ) : booking.payment.proofImageUrl || booking.payment.status === "PENDING_VERIFICATION" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-micro font-semibold text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Bukti Transfer Terlampir
                        </span>
                      ) : booking.payment.status === "FAILED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200/80 px-2 py-0.5 text-micro font-semibold text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Bukti Ditolak
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-micro font-medium text-slate-600">
                          Menunggu Pembayaran
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Footer Tombol Aksi */}
                <div className="mt-4 pt-3 border-t border-rule/60 flex items-center justify-between gap-2">
                  <span className="text-micro font-medium text-ink-soft">
                    {booking.driverName ? `Supir: ${booking.driverName}` : "Belum ada supir"}
                  </span>
                  <Link
                    href={`/bookings/${booking.id}`}
                    className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-meta font-semibold transition-colors ${
                      isUrgent
                        ? "bg-navy text-white hover:bg-navy-hover shadow-xs"
                        : "border border-rule bg-canvas text-ink hover:border-navy hover:text-navy"
                    }`}
                  >
                    <span>{actionText}</span>
                    <IconArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
