"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookingCardGrid } from "@/components/bookings/BookingCardGrid";
import { PaymentVerificationHub } from "@/components/payments/PaymentVerificationHub";
import { Tabs } from "@/components/ui/Tabs";
import type { AdminPaymentsResponse, Booking, Vehicle } from "@/lib/types";

type Props = {
  initialBookings: Booking[];
  vehicles: Vehicle[];
  initialPayments: AdminPaymentsResponse;
  initialTab?: "pesanan" | "pembayaran";
};

/**
 * BookingsUnifiedHub: Hub operasional terpadu menggabungkan antrean pesanan masuk
 * dan verifikasi bukti transfer/pembayaran dalam satu antarmuka bertab (K18 Bagian A).
 *
 * Mendukung navigasi langsung via URL query param (?tab=pesanan / ?tab=pembayaran),
 * menjaga state masing-masing sub-komponen saat berpindah tab, serta menampilkan
 * badge hitungan antrean yang membutuhkan tindakan operasional secara real time.
 */
export function BookingsUnifiedHub({
  initialBookings,
  vehicles,
  initialPayments,
  initialTab = "pesanan",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryTab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const urlTab = new URLSearchParams(window.location.search).get("tab");
      if (urlTab === "pembayaran" || urlTab === "pesanan") {
        return urlTab;
      }
    }
    if (queryTab === "pembayaran" || queryTab === "pesanan") {
      return queryTab;
    }
    return initialTab;
  });

  // Sinkronisasi bila query param URL berubah dari luar (misal: tombol navigasi sidebar atau browser history)
  useEffect(() => {
    const effectiveTab =
      queryTab ||
      (typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("tab")
        : null);
    if (effectiveTab === "pembayaran" || effectiveTab === "pesanan") {
      setActiveTab(effectiveTab);
    }
  }, [queryTab]);

  function handleTabChange(tabId: string) {
    setActiveTab(tabId);
    // Perbarui query param URL tanpa memicu reload penuh halaman
    const targetUrl = tabId === "pembayaran" ? "/bookings?tab=pembayaran" : "/bookings?tab=pesanan";
    router.replace(targetUrl, { scroll: false });
  }

  // Hitung jumlah pesanan yang membutuhkan tindakan staf operasional (konfirmasi tarif atau alokasi supir)
  const bookingActionCount = useMemo(() => {
    return initialBookings.filter(
      (b) => b.status === "perlu_konfirmasi_tarif" || b.status === "perlu_alokasi_sopir",
    ).length;
  }, [initialBookings]);

  // Hitung jumlah pembayaran yang berstatus menunggu verifikasi bukti transfer bank
  const paymentPendingCount = useMemo(() => {
    return (initialPayments?.items ?? []).filter(
      (p) => p.status === "PENDING_VERIFICATION",
    ).length;
  }, [initialPayments]);

  const tabItems = [
    {
      id: "pesanan",
      label: "Antrean Pemesanan",
      badge: bookingActionCount > 0 ? bookingActionCount : undefined,
    },
    {
      id: "pembayaran",
      label: "Verifikasi Pembayaran",
      badge: paymentPendingCount > 0 ? paymentPendingCount : undefined,
    },
  ];

  const panels = {
    pesanan: <BookingCardGrid initialBookings={initialBookings} vehicles={vehicles} />,
    pembayaran: <PaymentVerificationHub initialResponse={initialPayments} />,
  };

  return (
    <div className="space-y-4">
      <Tabs
        items={tabItems}
        panels={panels}
        activeTab={activeTab}
        onChange={handleTabChange}
      />
    </div>
  );
}
