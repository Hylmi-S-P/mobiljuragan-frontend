"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { BookingCardGrid } from "@/components/bookings/BookingCardGrid";
import { PaymentVerificationHub } from "@/components/payments/PaymentVerificationHub";
import { Tabs } from "@/components/ui/Tabs";
import { BOOKING_STATUS, BOOKING_STATUS_ORDER } from "@/lib/labels";
import type { AdminPaymentsResponse, Booking, BookingStatus, Vehicle } from "@/lib/types";

type TabPesanan = BookingStatus | "semua";
type TabId = TabPesanan | "pembayaran";

const TAB_PESANAN: TabPesanan[] = [...BOOKING_STATUS_ORDER, "semua"];
const SEMUA_TAB: TabId[] = [...TAB_PESANAN, "pembayaran"];

/** Tab yang dibuka bila tidak ada pilihan lain: pekerjaan yang paling menahan. */
const TAB_BAWAAN: TabId = "perlu_konfirmasi_tarif";

/**
 * Apakah pesanan ini termasuk tab tersebut.
 *
 * "Tarif Terkonfirmasi" juga memuat pesanan yang tarifnya sudah disetujui tetapi
 * supirnya belum ditugaskan. Status itu tetap pekerjaan admin, jadi
 * menyembunyikannya di tab lain akan membuat pesanan tampak hilang.
 */
function cocokTab(booking: Booking, tab: TabPesanan): boolean {
  if (tab === "semua") return true;
  if (tab === "tarif_terkonfirmasi") {
    return booking.status === "tarif_terkonfirmasi" || booking.status === "perlu_alokasi_sopir";
  }
  return booking.status === tab;
}

function tabSah(nilai: string | null | undefined): TabId | null {
  if (!nilai) return null;
  /* Tautan lama memakai "pesanan"; dipertahankan agar bookmark tidak berakhir di
     tab yang tidak ada. */
  if (nilai === "pesanan") return TAB_BAWAAN;
  return SEMUA_TAB.includes(nilai as TabId) ? (nilai as TabId) : null;
}

type Props = {
  initialBookings: Booking[];
  vehicles: Vehicle[];
  initialPayments: AdminPaymentsResponse;
  /** Nilai mentah dari `?tab=`; divalidasi di sini agar tautan lama tetap jalan. */
  initialTab?: string;
};

/**
 * BookingsUnifiedHub: Hub operasional terpadu menggabungkan antrean pesanan masuk
 * dan verifikasi bukti transfer/pembayaran dalam satu antarmuka bertab.
 *
 * Tab pesanan mengikuti perjalanan pesanan (perlu konfirmasi → tarif
 * terkonfirmasi → sewa berjalan → selesai → ditolak → semua), sehingga admin
 * tidak perlu menyaring ulang setiap kali membuka halaman.
 */
export function BookingsUnifiedHub({
  initialBookings,
  vehicles,
  initialPayments,
  initialTab,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryTab = searchParams.get("tab");
  const tabAwal = tabSah(initialTab) ?? TAB_BAWAAN;

  const [activeTab, setActiveTab] = useState<TabId>(tabAwal);

  // Sinkronisasi bila query param URL berubah dari luar (browser back/forward, deep link)
  useEffect(() => {
    function syncTab() {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const urlTab = tabSah(new URLSearchParams(search).get("tab"));
      setActiveTab(urlTab ?? tabSah(queryTab) ?? tabAwal);
    }

    syncTab();

    window.addEventListener("popstate", syncTab);
    return () => window.removeEventListener("popstate", syncTab);
  }, [queryTab, tabAwal]);

  function handleTabChange(tabId: string) {
    const tab = tabSah(tabId) ?? TAB_BAWAAN;
    setActiveTab(tab);
    router.push(`/bookings?tab=${tab}`, { scroll: false });
  }

  /* Sinkronkan badge pembayaran dengan TanStack Query agar otomatis terbarui saat verifikasi selesai */
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

  const paymentPendingCount = useMemo(() => {
    const list = paymentsData?.items ?? initialPayments?.items ?? [];
    return list.filter((p) => p.status === "PENDING_VERIFICATION").length;
  }, [paymentsData, initialPayments]);

  /* Satu perhitungan untuk angka tab dan isi grid, supaya badge tidak pernah
     berbeda dengan jumlah kartu yang tampil. */
  const jumlahPerTab = useMemo(() => {
    const hasil = new Map<TabId, number>();
    for (const tab of TAB_PESANAN) {
      hasil.set(tab, initialBookings.filter((b) => cocokTab(b, tab)).length);
    }
    return hasil;
  }, [initialBookings]);

  const tabItems = [
    ...TAB_PESANAN.map((tab) => ({
      id: tab,
      label: tab === "semua" ? "Semua" : BOOKING_STATUS[tab as BookingStatus].label,
      badge: jumlahPerTab.get(tab) ?? 0,
    })),
    {
      id: "pembayaran" as TabId,
      label: "Verifikasi Pembayaran",
      badge: paymentPendingCount,
    },
  ];

  const panels: Record<string, React.ReactNode> = {};
  for (const tab of TAB_PESANAN) {
    panels[tab] = (
      <BookingCardGrid
        key={tab}
        initialBookings={initialBookings}
        vehicles={vehicles}
        statusFilter={tab}
      />
    );
  }
  panels.pembayaran = <PaymentVerificationHub initialResponse={initialPayments} />;

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
