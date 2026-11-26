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
  /* Tab divalidasi di komponen hub; di sini cukup diteruskan apa adanya supaya
     tautan lama (?tab=pesanan) tetap mendarat di tab yang benar. */
  const initialTab = resolvedSearchParams?.tab;

  const emptyPayments: AdminPaymentsResponse = {
    items: [],
    pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
  };

  const [bookings, vehicles, payments] = await Promise.all([
    getBookings(),
    getAllVehicles(),
    getAdminPayments({ limit: 100 }).catch(() => emptyPayments),
  ]);

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
