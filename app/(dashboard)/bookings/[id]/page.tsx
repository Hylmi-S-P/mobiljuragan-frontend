import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookingDetailClient } from "@/components/bookings/BookingDetailClient";
import { PageLead } from "@/components/ui/PageLayout";
import {
  getBookingById,
  getBookingDetailWithVehicle,
  getDrivers,
  getVehicleById,
} from "@/lib/operations";

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

  const detail = await getBookingDetailWithVehicle(id);
  if (!detail) notFound();

  const { booking } = detail;
  const isDriverService = booking.mode === "dengan_supir";

  const [vehicle, drivers] = await Promise.all([
    detail.vehicle ? Promise.resolve(detail.vehicle) : getVehicleById(booking.vehicleId),
    isDriverService ? getDrivers() : Promise.resolve([]),
  ]);
  if (!vehicle) notFound();

  return (
    <>
      <PageLead lead={`${booking.code} • ${isDriverService ? "Dengan Supir" : "Lepas Kunci"}`} />
      <BookingDetailClient
        booking={booking}
        vehicle={vehicle}
        availableDrivers={drivers}
      />
    </>
  );
}

