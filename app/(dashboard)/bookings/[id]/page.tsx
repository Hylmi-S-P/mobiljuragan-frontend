import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookingDecisionPanel } from "@/components/bookings/BookingDecisionPanel";
import { DataField, PageLead, Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatDateRange } from "@/lib/format";
import { BOOKING_STATUS, DRIVER_STATUS } from "@/lib/labels";
import { getBookingById, getDrivers, getVehicleById } from "@/lib/operations";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const booking = await getBookingById(id).catch(() => null);

  if (!booking) {
    return { title: "Pemesanan Tidak Ditemukan | MobilJuragan" };
  }

  return {
    title: `Pemesanan ${booking.code} | MobilJuragan`,
    description: `Detail pemesanan ${booking.code} atas nama ${booking.customerName} beserta verifikasi tarif dan alokasi supir.`,
  };
}

// Detail pemesanan harus mengikuti status terkini, jadi dirender ulang tiap request.
export const dynamic = "force-dynamic";

export default async function BookingDetailPage({ params }: Params) {
  const { id } = await params;

  const booking = await getBookingById(id);
  if (!booking) notFound();

  const vehicle = await getVehicleById(booking.vehicleId);
  if (!vehicle) notFound();

  const isDriverService = booking.mode === "dengan_supir";
  const drivers = isDriverService ? await getDrivers() : [];
  const status = BOOKING_STATUS[booking.status];

  return (
    <>
      <PageLead lead={`${booking.code} • ${isDriverService ? "Dengan Supir" : "Lepas Kunci"}`} />

      <div className="mt-3 grid gap-4 lg:grid-cols-[688fr_424fr]">
        <div className="min-w-0">
          <Panel
            title="Informasi Pelanggan & Pemesanan"
            action={<StatusChip tone={status.tone}>{status.label}</StatusChip>}
          >
            <div className="grid gap-3.5 sm:grid-cols-3">
              <DataField label={isDriverService ? "Nama pemesan / PIC" : "Nama lengkap"}>
                {booking.customerName}
              </DataField>
              <DataField label="Nomor WhatsApp">
                {booking.customerContext ?? "Belum diverifikasi"}
              </DataField>
              <DataField label="Durasi sewa">
                {formatDateRange(booking.startDate, booking.endDate, booking.dayCount)}
              </DataField>
            </div>

            <div className="mt-4 grid gap-3.5 sm:grid-cols-3">
              {isDriverService ? (
                <div className="min-w-0">
                  <p className="text-micro font-bold uppercase text-ink-soft">Supir bertugas</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="truncate text-meta font-medium text-ink">
                      {booking.driverName ?? "Belum dialokasikan"}
                    </span>
                    {booking.driverStatus ? (
                      <StatusChip tone={DRIVER_STATUS[booking.driverStatus].tone}>
                        {DRIVER_STATUS[booking.driverStatus].label}
                      </StatusChip>
                    ) : null}
                  </div>
                </div>
              ) : (
                <DataField label="NIK KTP resmi">Belum diverifikasi</DataField>
              )}

              {isDriverService ? (
                <DataField label="Titik jemput & rute">{booking.pickupRoute}</DataField>
              ) : (
                <DataField label="Domisili pelanggan">Belum diverifikasi</DataField>
              )}

              <DataField label="Jenis layanan">{booking.serviceType}</DataField>
            </div>
          </Panel>
        </div>

        <div className="min-w-0">
          <BookingDecisionPanel booking={booking} vehicle={vehicle} availableDrivers={drivers} />
        </div>
      </div>
    </>
  );
}
