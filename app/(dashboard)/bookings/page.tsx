import { Suspense } from "react";
import type { Metadata } from "next";
import { BookingCardGrid } from "@/components/bookings/BookingCardGrid";
import { getAllVehicles, getBookings } from "@/lib/operations";

export const metadata: Metadata = {
  title: "Pemesanan Masuk | MobilJuragan",
  description:
    "Pusat operasional antrean pesanan sewa armada CV. Mobil Juragan Express Transport Merauke.",
};

// Data antrean berubah secara dinamis setiap ada transaksi baru
export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const [bookings, vehicles] = await Promise.all([
    getBookings(),
    getAllVehicles(),
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-soft">Memuat antrean pesanan...</div>}>
      <BookingCardGrid initialBookings={bookings} vehicles={vehicles} />
    </Suspense>
  );
}
