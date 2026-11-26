"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { BookingCardGrid } from "@/components/bookings/BookingCardGrid";
import { BOOKING_STATUS, BOOKING_STATUS_ORDER } from "@/lib/labels";
import type { AdminPaymentsResponse, Booking, BookingStatus, Vehicle } from "@/lib/types";

const PaymentVerificationHub = dynamic(
  () =>
    import("@/components/payments/PaymentVerificationHub").then(
      (m) => m.PaymentVerificationHub,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-rule bg-surface p-8 text-center text-meta text-ink-soft">
        Memuat verifikasi pembayaran...
      </div>
    ),
  },
);

type TabPesanan = BookingStatus | "semua";
type TabId = TabPesanan | "pembayaran";

const TAB_PESANAN: TabPesanan[] = [...BOOKING_STATUS_ORDER, "semua"];
const SEMUA_TAB: TabId[] = [...TAB_PESANAN, "pembayaran"];

/** Tab yang dibuka bila tidak ada pilihan lain: pekerjaan yang paling menahan. */
const TAB_BAWAAN: TabPesanan = "perlu_konfirmasi_tarif";

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
  const dasarId = useId();
  const queryTab = searchParams.get("tab");
  const tabAwal = tabSah(initialTab) ?? TAB_BAWAAN;

  const [activeTab, setActiveTab] = useState<TabId>(tabAwal);
  const [lastBookingTab, setLastBookingTab] = useState<TabPesanan>(
    tabAwal === "pembayaran" ? TAB_BAWAAN : tabAwal,
  );
  const [visitedPaymentTab, setVisitedPaymentTab] = useState(tabAwal === "pembayaran");

  // Sinkronisasi bila query param URL berubah dari luar (browser back/forward, deep link)
  useEffect(() => {
    function syncTab() {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const urlTab = tabSah(new URLSearchParams(search).get("tab"));
      const resolved = urlTab ?? tabSah(queryTab) ?? tabAwal;
      setActiveTab(resolved);
      if (resolved === "pembayaran") {
        setVisitedPaymentTab(true);
      } else {
        setLastBookingTab(resolved);
      }
    }

    syncTab();

    window.addEventListener("popstate", syncTab);
    return () => window.removeEventListener("popstate", syncTab);
  }, [queryTab, tabAwal]);

  function handleTabChange(tabId: string) {
    const tab = tabSah(tabId) ?? TAB_BAWAAN;
    setActiveTab(tab);
    if (tab === "pembayaran") {
      setVisitedPaymentTab(true);
    } else {
      setLastBookingTab(tab);
    }
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

  const activeBookingFilter: TabPesanan =
    activeTab === "pembayaran" ? lastBookingTab : activeTab;
  const shouldMountPayments = visitedPaymentTab || activeTab === "pembayaran";

  return (
    <div className="space-y-4">
      <div>
        <div
          role="tablist"
          aria-label="Pilihan tampilan"
          className="flex flex-wrap items-center gap-1.5 rounded-md border border-rule bg-canvas p-1"
        >
          {tabItems.map((item) => {
            const terpilih = activeTab === item.id;
            const panelId =
              item.id === "pembayaran"
                ? `${dasarId}-panel-pembayaran`
                : `${dasarId}-panel-pesanan`;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`${dasarId}-tab-${item.id}`}
                aria-selected={terpilih}
                aria-controls={panelId}
                onClick={() => handleTabChange(item.id)}
                className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy ${
                  terpilih
                    ? "bg-surface font-semibold text-ink shadow-xs"
                    : "text-ink-soft hover:bg-surface/60 hover:text-ink"
                }`}
              >
                {item.label}
                {item.badge !== undefined && item.badge !== 0 ? (
                  <span
                    className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-micro font-bold tabular-nums leading-none ${
                      terpilih ? "bg-navy/10 text-navy" : "bg-rule text-ink-soft"
                    }`}
                  >
                    {typeof item.badge === "number" && item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <div
            role="tabpanel"
            id={`${dasarId}-panel-pesanan`}
            aria-labelledby={`${dasarId}-tab-${activeBookingFilter}`}
            hidden={activeTab === "pembayaran"}
          >
            <BookingCardGrid
              initialBookings={initialBookings}
              vehicles={vehicles}
              statusFilter={activeBookingFilter}
            />
          </div>

          {shouldMountPayments ? (
            <div
              role="tabpanel"
              id={`${dasarId}-panel-pembayaran`}
              aria-labelledby={`${dasarId}-tab-pembayaran`}
              hidden={activeTab !== "pembayaran"}
            >
              <PaymentVerificationHub
                initialResponse={initialPayments}
                isActive={activeTab === "pembayaran"}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
