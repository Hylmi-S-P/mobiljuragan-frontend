import type { Metadata } from "next";
import { BookingCardGrid } from "@/components/bookings/BookingCardGrid";
import { getAllVehicles, getBookings } from "@/lib/operations";

export const metadata: Metadata = {
  title: "Pesanan Masuk | MobilJuragan",
  description:
    "Antrean pesanan sewa yang masuk dari aplikasi pelanggan MobilJuragan Merauke, siap diverifikasi tim operasional.",
};

// Antrean pesanan berubah setiap ada pemesanan baru, jadi data diambil segar tiap request.
export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const [bookings, vehicles] = await Promise.all([getBookings(), getAllVehicles()]);

  return <BookingCardGrid initialBookings={bookings} vehicles={vehicles} />;
}
