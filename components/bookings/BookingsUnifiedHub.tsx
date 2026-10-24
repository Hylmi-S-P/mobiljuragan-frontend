"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
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

  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Sinkronisasi bila query param URL berubah dari luar (tombol sidebar, browser back/forward, deep link)
  useEffect(() => {
    function syncTab() {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const urlTab = new URLSearchParams(search).get("tab");
      const targetTab =
        urlTab === "pembayaran" || urlTab === "pesanan"
          ? urlTab
          : queryTab === "pembayaran" || queryTab === "pesanan"
            ? queryTab
            : initialTab;
      setActiveTab(targetTab);
    }

    syncTab();

    window.addEventListener("popstate", syncTab);
    return () => window.removeEventListener("popstate", syncTab);
  }, [queryTab, initialTab]);

  function handleTabChange(tabId: string) {
    setActiveTab(tabId);
    // Tambahkan entri riwayat browser agar tombol Back/Forward bekerja sinkron antar tab
    const targetUrl = tabId === "pembayaran" ? "/bookings?tab=pembayaran" : "/bookings?tab=pesanan";
    router.push(targetUrl, { scroll: false });
  }

  // Hitung jumlah pesanan yang membutuhkan tindakan staf operasional (konfirmasi tarif atau alokasi supir)
  const bookingActionCount = useMemo(() => {
    return initialBookings.filter(
      (b) => b.status === "perlu_konfirmasi_tarif" || b.status === "perlu_alokasi_sopir",
    ).length;
  }, [initialBookings]);

  // Sinkronkan badge pembayaran dengan TanStack Query agar otomatis terbarui saat verifikasi selesai
  const { data: paymentsData } = useQuery<AdminPaymentsResponse>({
    queryKey: ["adminPayments", "menunggu", ""],
    queryFn: async (): Promise<AdminPaymentsResponse> => {
      const res = await apiClient.get("/admin/payments", {
        params: { status: "PENDING_VERIFICATION", limit: "100" },
      });
      return (res.data?.data || res.data) as AdminPaymentsResponse;
    },
    initialData: initialPayments,
    staleTime: 30 * 1000,
  });

  // Hitung jumlah pembayaran yang berstatus menunggu verifikasi bukti transfer bank
  const paymentPendingCount = useMemo(() => {
    const list = paymentsData?.items ?? initialPayments?.items ?? [];
    return list.filter((p) => p.status === "PENDING_VERIFICATION").length;
  }, [paymentsData, initialPayments]);

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
