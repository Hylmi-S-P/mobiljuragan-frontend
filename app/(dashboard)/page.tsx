import type { Metadata } from "next";
import Link from "next/link";

import { PlateBadge } from "@/components/ui/PlateBadge";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import {
  IconArrowRight,
  IconCalendar,
  IconCar,
  IconInbox,
  IconTrendingUp,
} from "@/components/ui/icons";
import { BOOKING_STATUS, VEHICLE_STATUS } from "@/lib/labels";
import { formatDateRange } from "@/lib/format";
import { getAllVehicles, getBookings, getFleetCalendar } from "@/lib/operations";

export const metadata: Metadata = {
  title: "Ringkasan Operasional | MobilJuragan",
  description:
    "Ringkasan operasional harian MobilJuragan Merauke: ketersediaan armada, pesanan masuk, dan jadwal sewa.",
};

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [bookings, vehicles, calendar] = await Promise.all([
    getBookings(),
    getAllVehicles(),
    getFleetCalendar(),
  ]);

  const queue = bookings.filter((booking) => booking.status === "perlu_konfirmasi_tarif");
  const unitTersedia = vehicles.filter((vehicle) => vehicle.status === "tersedia");
  const unitDisewa = vehicles.filter((vehicle) => vehicle.status === "disewa");
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));

  const readinessPercent = Math.round(
    (unitTersedia.length / Math.max(vehicles.length, 1)) * 100,
  );

  return (
    <div className="space-y-6">
      {/* 4 KPI Quick Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Unit Tersedia */}
        <div className="rounded-card border border-rule bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-meta text-ink-soft">
            <span className="font-medium">Armada Siap Jalan</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <IconCar className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink tabular-nums">
            {unitTersedia.length}{" "}
            <span className="text-base font-normal text-ink-soft">/ {vehicles.length} Unit</span>
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-micro text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Kesiapan armada {readinessPercent}%</span>
          </div>
        </div>

        {/* Antrean Pesanan */}
        <div className="rounded-card border border-rule bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-meta text-ink-soft">
            <span className="font-medium">Pesanan Masuk</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <IconInbox className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink tabular-nums">
            {queue.length}{" "}
            <span className="text-base font-normal text-ink-soft">Menunggu</span>
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-micro text-ink-soft">
            <span>Perlu konfirmasi tarif resmi</span>
          </div>
        </div>

        {/* Armada Sedang Beroperasi */}
        <div className="rounded-card border border-rule bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-meta text-ink-soft">
            <span className="font-medium">Sedang Beroperasi</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy/10 text-navy">
              <IconCalendar className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink tabular-nums">
            {unitDisewa.length}{" "}
            <span className="text-base font-normal text-ink-soft">Unit Sewa</span>
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-micro text-ink-soft">
            <span>Jadwal aktif di lapangan</span>
          </div>
        </div>

        {/* Total Pesanan Tercatat */}
        <div className="rounded-card border border-rule bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-meta text-ink-soft">
            <span className="font-medium">Total Antrean</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <IconTrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink tabular-nums">
            {bookings.length}{" "}
            <span className="text-base font-normal text-ink-soft">Pesanan</span>
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-micro text-ink-soft">
            <span>Riwayat booking pelanggan</span>
          </div>
        </div>
      </div>

      {/* Tabel Pesanan Menunggu Konfirmasi */}
      <Panel
        title="Pesanan Menunggu Konfirmasi"
        icon={<IconInbox className="h-4 w-4" />}
        action={
          queue.length > 0 ? (
            <span className="text-meta tabular-nums text-ink-soft">
              {queue.length} antrean
            </span>
          ) : null
        }
      >
        {queue.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-md border border-rule bg-canvas px-4 py-5 text-meta text-ink-soft">
            <p className="font-semibold text-ink">Semua pesanan telah diproses.</p>
            <p>Tidak ada antrean yang menunggu konfirmasi saat ini.</p>
          </div>
        ) : (
          <Table caption="Antrean booking menunggu konfirmasi tarif">
            <TableHead>
              <TableRow>
                <TableHeaderCell className="w-[200px]">Pemesan &amp; Kode</TableHeaderCell>
                <TableHeaderCell className="w-[260px]">Armada</TableHeaderCell>
                <TableHeaderCell className="w-[180px]">Tanggal Sewa</TableHeaderCell>
                <TableHeaderCell className="w-[140px]">Status</TableHeaderCell>
                <TableHeaderCell className="w-[130px] text-right">Aksi</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {queue.map((booking) => {
                const vehicle = vehicleById.get(booking.vehicleId);
                const status = BOOKING_STATUS[booking.status];
                return (
                  <TableRow key={booking.id} className="hover:bg-canvas/50">
                    <TableCell className="text-left">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="block font-semibold text-ink hover:text-navy hover:underline"
                      >
                        {booking.customerName}
                      </Link>
                      <span className="block text-micro text-ink-soft">{booking.code}</span>
                    </TableCell>
                    <TableCell>
                      <span className="block font-medium text-ink">{vehicle?.name}</span>
                      {vehicle ? <PlateBadge plate={vehicle.plate} className="mt-1" /> : null}
                    </TableCell>
                    <TableCell className="tabular-nums text-meta text-ink">
                      {formatDateRange(booking.startDate, booking.endDate, booking.dayCount)}
                    </TableCell>
                    <TableCell>
                      <StatusChip tone={status.tone}>{status.label}</StatusChip>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="inline-flex items-center gap-1 rounded-sm px-2.5 py-1 text-meta font-medium text-navy hover:bg-navy/10"
                      >
                        Periksa
                        <IconArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>

      {/* Grid 2 Kolom: Status Kesiapan Armada & Jadwal Terdekat */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* Status Armada */}
        <Panel title="Status Armada Merauke" icon={<IconCar className="h-4 w-4" />}>
          <div className="grid gap-2 sm:grid-cols-2">
            {vehicles.map((vehicle) => {
              const isAvailable = vehicle.status === "tersedia";
              return (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between rounded-sm border border-rule/60 bg-canvas/40 p-2.5"
                >
                  <div className="min-w-0 pr-2">
                    <span className="block truncate text-body font-medium text-ink">
                      {vehicle.name}
                    </span>
                    <PlateBadge plate={vehicle.plate} className="mt-0.5" />
                  </div>
                  <StatusChip tone={VEHICLE_STATUS[vehicle.status].tone}>
                    {VEHICLE_STATUS[vehicle.status].label}
                  </StatusChip>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Jadwal Operasional Terdekat */}
        <Panel
          title="Jadwal Operasional Terdekat"
          icon={<IconCalendar className="h-4 w-4" />}
          action={
            <Link
              href="/fleet/calendar"
              className="inline-flex items-center gap-1 text-meta font-medium text-navy hover:underline"
            >
              Lihat Kalender Lengkap &rarr;
            </Link>
          }
        >
          {calendar.fleet.filter((v) => v.schedules.length > 0).length === 0 ? (
            <p className="rounded-sm border border-rule bg-canvas p-4 text-meta text-ink-soft">
              Tidak ada jadwal sewa aktif dalam waktu dekat.
            </p>
          ) : (
            <div className="divide-y divide-rule">
              {calendar.fleet
                .filter((v) => v.schedules.length > 0)
                .slice(0, 5)
                .map((vehicle) => {
                  const schedule = vehicle.schedules[0];
                  return (
                    <div key={vehicle.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <span className="font-semibold text-ink">{vehicle.name}</span>
                        <span className="ml-2 text-micro text-ink-soft">({vehicle.plate})</span>
                        <span className="block text-micro text-ink-soft">
                          Pemesan: {schedule?.customerName || "Pelanggan"}
                        </span>
                      </div>
                      <span className="text-meta font-medium text-navy">
                        {schedule?.bookingCode || "Booking"}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
