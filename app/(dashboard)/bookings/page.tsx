import { Suspense } from "react";
import type { Metadata } from "next";
import { BookingsUnifiedHub } from "@/components/bookings/BookingsUnifiedHub";
import { getAllVehicles, getBookings, getAdminPayments } from "@/lib/operations";
import type { AdminPaymentsResponse } from "@/lib/types";

export const metadata: Metadata = {
  title: "Pemesanan Masuk | MobilJuragan",
  description:
    "Pusat operasional antrean pesanan sewa armada dan verifikasi bukti pembayaran CV. Mobil Juragan Express Transport Merauke.",
};

// Data antrean berubah secara dinamis setiap ada transaksi baru
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function BookingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialTab = resolvedSearchParams?.tab === "pembayaran" ? "pembayaran" : "pesanan";

  let payments: AdminPaymentsResponse = {
    items: [],
    pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
  };

  const [bookings, vehicles] = await Promise.all([
    getBookings(),
    getAllVehicles(),
  ]);

  try {
    payments = await getAdminPayments({ limit: 100 });
  } catch {
    payments = {
      items: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
    };
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-soft">Memuat antrean...</div>}>
      <BookingsUnifiedHub
        initialBookings={bookings}
        vehicles={vehicles}
        initialPayments={payments}
        initialTab={initialTab}
      />
    </Suspense>
  );
}
