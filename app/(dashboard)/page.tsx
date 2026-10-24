import type { Metadata } from "next";
import Link from "next/link";

import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  IconArrowRight,
  IconCalendar,
  IconCar,
  IconInbox,
  IconTrendingUp,
} from "@/components/ui/icons";
import { BOOKING_STATUS, VEHICLE_STATUS } from "@/lib/labels";
import { formatDateRange, formatDateSingle } from "@/lib/format";
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

  /* Jadwal terdekat disusun per jadwal, bukan per kendaraan, lalu diurutkan menurut
     tanggal mulai. Sebelumnya daftar mengikuti urutan armada dan hanya mengambil
     jadwal pertama tiap unit, sehingga jadwal paling dekat bisa tidak muncul sama
     sekali hanya karena unitnya kebetulan berada di urutan belakang. */
  const jadwalTerdekat = calendar.fleet
    .flatMap((entry) =>
      entry.schedules.map((schedule) => {
        const mulai = new Date(schedule.startDateTime).getTime();
        const selesai = new Date(schedule.endDateTime).getTime();
        const jumlahHari = Math.max(
          1,
          Math.ceil((selesai - mulai) / (1000 * 60 * 60 * 24)),
        );

        return {
          vehicleId: entry.id,
          vehicleName: entry.name,
          plate: entry.plate,
          bookingCode: schedule.bookingCode,
          customerName: schedule.customerName,
          mulai,
          tanggalMulai: formatDateSingle(schedule.startDateTime),
          durasi: `${jumlahHari} hari`,
        };
      }),
    )
    .sort((a, b) => a.mulai - b.mulai)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 4 KPI Quick Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Unit Tersedia */}
        <div className="rounded-card border border-rule bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-subtitle font-semibold text-ink">Armada Siap Jalan</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <IconCar className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink tabular-nums">
            {unitTersedia.length}{" "}
            <span className="text-base font-normal text-ink-soft">/ {vehicles.length} Unit</span>
          </p>
        </div>

        {/* Antrean Pesanan */}
        <div className="rounded-card border border-rule bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-subtitle font-semibold text-ink">Pesanan Masuk</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <IconInbox className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink tabular-nums">
            {queue.length}{" "}
            <span className="text-base font-normal text-ink-soft">Menunggu</span>
          </p>
        </div>

        {/* Armada Sedang Beroperasi */}
        <div className="rounded-card border border-rule bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-subtitle font-semibold text-ink">Sedang Beroperasi</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy/10 text-navy">
              <IconCalendar className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink tabular-nums">
            {unitDisewa.length}{" "}
            <span className="text-base font-normal text-ink-soft">Unit Sewa</span>
          </p>
        </div>

        {/* Total Pesanan Tercatat */}
        <div className="rounded-card border border-rule bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-subtitle font-semibold text-ink">Total Antrean</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <IconTrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink tabular-nums">
            {bookings.length}{" "}
            <span className="text-base font-normal text-ink-soft">Pesanan</span>
          </p>
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
          /* Antrean disajikan sebagai kartu, bukan tabel. Di layar sempit tabel lima
             kolom memaksa gulir mendatar, sementara tiap baris sebenarnya hanya
             membawa satu keputusan: periksa pesanan ini. */
          <ul className="space-y-2.5">
            {queue.map((booking) => {
              const vehicle = vehicleById.get(booking.vehicleId);
              const status = BOOKING_STATUS[booking.status];
              return (
                <li key={booking.id}>
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-canvas/40 px-3.5 py-3 transition-colors hover:border-navy/40 hover:bg-canvas"
                  >
                    <div className="min-w-0">
                      <span className="block font-semibold text-ink">
                        {booking.customerName}
                      </span>
                      <span className="block text-micro text-ink-soft">
                        {booking.code} · {vehicle?.name ?? "Armada belum dipilih"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-meta tabular-nums text-ink-soft">
                        {formatDateRange(booking.startDate, booking.endDate, booking.dayCount)}
                      </span>
                      <StatusChip tone={status.tone}>{status.label}</StatusChip>
                      <span className="inline-flex items-center gap-1 text-meta font-medium text-navy">
                        Periksa
                        <IconArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
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
                    {/* Plat nomor tidak ditampilkan di sini. Panel ini untuk melihat
                        kesiapan unit sekilas, dan plat sudah tersedia di katalog serta
                        kalender armada. */}
                    <span className="block truncate text-body font-medium text-ink">
                      {vehicle.name}
                    </span>
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
          {jadwalTerdekat.length === 0 ? (
            <p className="rounded-sm border border-rule bg-canvas p-4 text-meta text-ink-soft">
              Tidak ada jadwal sewa aktif dalam waktu dekat.
            </p>
          ) : (
            <div className="divide-y divide-rule">
              {jadwalTerdekat.map((item) => (
                <div key={`${item.vehicleId}-${item.bookingCode}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <span className="font-semibold text-ink">{item.vehicleName}</span>
                    <span className="ml-2 text-micro text-ink-soft">({item.plate})</span>
                    <span className="block text-micro text-ink-soft">
                      Pemesan: {item.customerName || "Pelanggan"}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block text-meta font-medium text-navy">
                      {item.tanggalMulai}
                    </span>
                    <span className="block text-micro text-ink-soft">{item.durasi}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
