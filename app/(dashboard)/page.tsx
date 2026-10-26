import type { Metadata } from "next";
import Link from "next/link";

import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import { ComparisonMetricCard } from "@/components/ui/ComparisonMetricCard";
import {
  IconArrowRight,
  IconCalendar,
  IconCar,
  IconInbox,
  IconTrendingUp,
} from "@/components/ui/icons";
import { BOOKING_STATUS, VEHICLE_STATUS } from "@/lib/labels";
import { formatDateRange, formatDateSingle, formatRupiah } from "@/lib/format";
import {
  getAllVehicles,
  getBookings,
  getFleetCalendar,
  getFinanceSummary,
} from "@/lib/operations";

export const metadata: Metadata = {
  title: "Ringkasan Operasional | MobilJuragan",
  description:
    "Ringkasan operasional harian MobilJuragan Merauke: ketersediaan armada, pesanan masuk, dan jadwal sewa.",
};

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [bookings, vehicles, calendar, finance] = await Promise.all([
    getBookings(),
    getAllVehicles(),
    getFleetCalendar(),
    getFinanceSummary("all").catch(() => null),
  ]);

  const queue = bookings.filter((booking) => booking.status === "perlu_konfirmasi_tarif");
  const unitTersedia = vehicles.filter((vehicle) => vehicle.status === "tersedia");
  const unitDisewa = vehicles.filter((vehicle) => vehicle.status === "disewa");
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));

  // Data tren bulanan untuk sparkline ComparisonMetricCard
  const monthlyTrends = finance?.monthlyTrends ?? [];

  /* Jadwal terdekat disusun per jadwal, bukan per kendaraan, lalu diurutkan menurut
     tanggal mulai. */
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
      {/* 4 KPI Metric Cards (Pola Zoho IoT & Dribbble Clean Card) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1. Armada Siap Jalan */}
        <ComparisonMetricCard
          title="Armada Siap Jalan"
          value={unitTersedia.length}
          unitLabel={`/ ${vehicles.length} Unit`}
          icon={<IconCar className="h-4 w-4" />}
          iconBgColor="bg-emerald-50 text-emerald-600"
        />

        {/* 2. Pesanan Masuk dengan Sparkline Tren */}
        <ComparisonMetricCard
          title="Pesanan Masuk"
          value={queue.length}
          unitLabel="Menunggu"
          sparklineData={monthlyTrends.map((t) => t.bookings)}
          sparklineColor="#d97706"
          icon={<IconInbox className="h-4 w-4" />}
          iconBgColor="bg-amber-50 text-amber-600"
        />

        {/* 3. Armada Sedang Beroperasi */}
        <ComparisonMetricCard
          title="Sedang Beroperasi"
          value={unitDisewa.length}
          unitLabel="Unit Sewa"
          icon={<IconCalendar className="h-4 w-4" />}
          iconBgColor="bg-navy/10 text-navy"
        />

        {/* 4. Total Omzet Terverifikasi dengan Sparkline Tren Omzet */}
        <ComparisonMetricCard
          title="Total Omzet Terverifikasi"
          value={
            finance?.summary.totalRevenue
              ? formatRupiah(finance.summary.totalRevenue)
              : `${bookings.length} Pesanan`
          }
          sparklineData={monthlyTrends.map((t) => t.revenue)}
          sparklineColor="#059669"
          icon={<IconTrendingUp className="h-4 w-4" />}
          iconBgColor="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Antrean Pesanan Menunggu Konfirmasi (Format Grid Kartu Kompak) */}
      <Panel
        title="Pesanan Menunggu Konfirmasi"
        icon={<IconInbox className="h-4 w-4" />}
        action={
          queue.length > 0 ? (
            <span className="text-meta font-semibold tabular-nums text-ink-soft bg-canvas px-2.5 py-1 rounded-sm border border-rule">
              {queue.length} antrean
            </span>
          ) : null
        }
      >
        {queue.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-card border border-rule bg-canvas px-4 py-6 text-meta text-ink-soft sm:px-6">
            <p className="font-semibold text-ink text-body">Semua pesanan telah diproses.</p>
            <p>Tidak ada antrean yang menunggu konfirmasi saat ini.</p>
          </div>
        ) : (
          /* Antrean disajikan sebagai Grid Kartu Kompak Responsif */
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {queue.map((booking) => {
              const vehicle = vehicleById.get(booking.vehicleId);
              const status = BOOKING_STATUS[booking.status];
              return (
                <div
                  key={booking.id}
                  className="group flex flex-col justify-between rounded-card border border-rule bg-surface p-4 shadow-xs transition-all duration-200 hover:border-navy/40 hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="font-semibold text-ink text-body hover:text-navy hover:underline truncate"
                      >
                        {booking.customerName}
                      </Link>
                      <StatusChip tone={status.tone}>{status.label}</StatusChip>
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 text-micro text-ink-soft">
                      <span className="font-mono">{booking.code}</span>
                      <span>·</span>
                      <span className="truncate">{vehicle?.name ?? "Armada belum dipilih"}</span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-meta tabular-nums text-ink-soft">
                      <IconCalendar className="h-3.5 w-3.5 text-navy/70 shrink-0" />
                      <span>{formatDateRange(booking.startDate, booking.endDate, booking.dayCount)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-rule/60 flex items-center justify-between">
                    <span className="text-micro font-medium text-ink-soft truncate pr-2">
                      {booking.pickupRoute ? `Rute: ${booking.pickupRoute}` : "Operasional Merauke"}
                    </span>
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="inline-flex items-center gap-1 text-meta font-semibold text-navy hover:underline shrink-0"
                    >
                      <span>Periksa</span>
                      <IconArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Grid 2 Kolom: Status Armada & Jadwal Operasional */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* Status Armada Merauke */}
        <Panel title="Status Armada Merauke" icon={<IconCar className="h-4 w-4" />}>
          {/* Ringkasan jumlah unit siap jalan.

              Cincin persentase "Kesiapan X%" dihapus sesuai permintaan: angka
              persen kesiapan tidak dipakai untuk mengambil keputusan apa pun,
              sedangkan hitungan "X dari Y unit" sudah menyampaikan hal yang sama
              tanpa perlu membaca cincin kecil. */}
          <div className="mb-3.5 flex items-center justify-between rounded-sm border border-rule/60 bg-canvas/60 p-3">
            <div>
              <span className="block text-meta font-semibold text-ink">
                {unitTersedia.length} dari {vehicles.length} Armada Siap Jalan
              </span>
              <span className="text-micro text-ink-soft">
                {unitDisewa.length} sedang beroperasi, {vehicles.length - unitTersedia.length - unitDisewa.length} servis/pool
              </span>
            </div>
            <Link
              href="/fleet"
              className="text-micro font-semibold text-navy hover:underline shrink-0"
            >
              Lihat Katalog &rarr;
            </Link>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {vehicles.map((vehicle) => {
              return (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between rounded-sm border border-rule/60 bg-canvas/40 p-2.5"
                >
                  <div className="min-w-0 pr-2">
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

        {/* Jadwal Operasional */}
        <Panel
          title="Jadwal Operasional"
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
            <p className="rounded-card border border-rule bg-canvas p-4 text-meta text-ink-soft">
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
