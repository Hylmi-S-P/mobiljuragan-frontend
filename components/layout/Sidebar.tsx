"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { NAV_ENTRIES, WORKSPACE_NAME, WORKSPACE_ROLE, isNavGroup } from "@/lib/navigation";
import {
  IconCar,
  IconCalendar,
  IconChat,
  IconChevronDown,
  IconCreditCard,
  IconDashboard,
  IconHelpCircle,
  IconInbox,
  IconLogout,
  IconShield,
  IconSparkles,
  IconTrendingUp,
  IconUsers,
} from "@/components/ui/icons";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  onRequestLogout: () => void;
  /* Angka pekerjaan yang menunggu, dipetakan per tujuan navigasi. */
  navCounts?: Record<string, number>;
  /* Rincian angka: berapa yang benar-benar baru, berapa yang menunggu balasan
     admin setelah pelanggan membalas. Dipakai badge untuk menjelaskan isinya. */
  navDetails?: Record<string, { baru: number; dibalas: number }>;
  userRole?: "SUPER_ADMIN" | "ADMIN";
};

/* Satu ikon per tujuan navigasi, semuanya dari keluarga ikon yang sama. */
const IKON_NAV: Record<string, (props: { className?: string }) => React.ReactElement> = {
  "/": IconDashboard,
  "/bookings": IconInbox,
  "/bookings?tab=pembayaran": IconCreditCard,
  "/payments": IconCreditCard,
  "/fleet/catalog": IconCar,
  "/fleet/calendar": IconCalendar,
  "/fleet/drivers": IconUsers,
  "/customer-care": IconChat,
  "/finance": IconTrendingUp,
  "/refunds": IconCreditCard,
  "/documents": IconShield,
  "/admin/ai-hub": IconSparkles,
  "/faqs": IconHelpCircle,
  "/admin": IconShield,
};

const INTERVAL_POLLING_NAV_MS = 45_000;

export function Sidebar({
  open,
  onClose,
  onRequestLogout,
  navCounts,
  navDetails,
  userRole,
}: SidebarProps) {
  const pathname = usePathname();

  const [polled, setPolled] = useState<{
    baseCounts: typeof navCounts;
    baseDetails: typeof navDetails;
    counts?: Record<string, number>;
    details?: Record<string, { baru: number; dibalas: number }>;
  } | null>(null);
  const basePropsRef = useRef({ navCounts, navDetails });
  const lastFetchedAtRef = useRef<number>(0);

  useEffect(() => {
    basePropsRef.current = { navCounts, navDetails };
    lastFetchedAtRef.current = Date.now();
  }, [navCounts, navDetails]);

  const isPolledFresh =
    polled !== null &&
    polled.baseCounts === navCounts &&
    polled.baseDetails === navDetails;
  const liveCounts = isPolledFresh ? (polled.counts ?? navCounts) : navCounts;
  const liveDetails = isPolledFresh ? (polled.details ?? navDetails) : navDetails;

  /* Setiap grup akordeon memiliki state independen agar membuka satu grup tidak memengaruhi grup lain. */
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let activeEffect = true;
    lastFetchedAtRef.current = Date.now();
    let timer: number | undefined;

    function stopPolling() {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
    }

    async function refreshCounts() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/nav-counts", { cache: "no-store" });
        if (res.status === 401) {
          stopPolling();
          return;
        }
        if (!res.ok || !activeEffect) return;
        const json = (await res.json()) as {
          counts?: Record<string, number>;
          details?: Record<string, { baru: number; dibalas: number }>;
        };
        if (!activeEffect) return;
        lastFetchedAtRef.current = Date.now();
        setPolled({
          baseCounts: basePropsRef.current.navCounts,
          baseDetails: basePropsRef.current.navDetails,
          counts: json.counts,
          details: json.details,
        });
      } catch {
        // Kegagalan polling dibiarkan tenang agar navigasi tidak terganggu.
      }
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastFetchedAtRef.current >= INTERVAL_POLLING_NAV_MS
      ) {
        void refreshCounts();
      }
    }

    timer = window.setInterval(refreshCounts, INTERVAL_POLLING_NAV_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      activeEffect = false;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  function isNavActive(entryHref: string): boolean {
    if (entryHref === "/bookings") {
      return (
        pathname === "/bookings" ||
        pathname.startsWith("/bookings/") ||
        pathname.startsWith("/payments")
      );
    }
    return pathname === entryHref;
  }

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      {open ? (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-ink/50 lg:hidden"
        />
      ) : null}

      {/* Di layar sempit sidebar adalah laci melayang (fixed). Mulai lg ia jadi kolom
          yang menempel (sticky) setinggi viewport, jadi tetap terbaca saat isi halaman
          digulir ke bawah. Tingginya dipatok 100dvh supaya daftar navigasi yang panjang
          menggulir di dalam sidebar sendiri, bukan mendorong tinggi halaman. */}
      <aside
        aria-label="Navigasi utama"
        className={`fixed inset-y-0 left-0 z-40 flex w-[227px] shrink-0 flex-col overflow-hidden bg-navy px-3 py-4 lg:sticky lg:top-0 lg:bottom-auto lg:z-auto lg:h-dvh lg:self-start lg:visible lg:translate-x-0 ${
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="shrink-0 px-2 pb-3.5">
          <p className="text-body font-semibold leading-[1.3] tracking-[-0.01em] text-white">
            {WORKSPACE_NAME}
          </p>
          <p className="mt-1 text-micro font-semibold uppercase text-on-navy-muted">
            {userRole === "SUPER_ADMIN" ? WORKSPACE_ROLE : "Portal Admin"}
          </p>
        </div>

        <div aria-hidden="true" className="mb-2.5 h-px shrink-0 bg-navy-line" />

        <nav className="sidebar-scroll flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
          {NAV_ENTRIES.filter((entry) => userRole === "SUPER_ADMIN" || !entry.adminOnly).map((entry) => {
            if (isNavGroup(entry)) {
              const visibleItems = entry.items.filter(
                (item) => userRole === "SUPER_ADMIN" || !item.adminOnly,
              );
              const IkonGrup = entry.label === "Akun Pelanggan" ? IconUsers : IconCar;
              const grupAktif = visibleItems.some((item) => pathname.startsWith(item.href));
              const groupOpen = groupOverrides[entry.label] ?? grupAktif;
              const groupCount = visibleItems.reduce(
                (sum, sub) => sum + (liveCounts?.[sub.href] ?? 0),
                0,
              );
              return (
                <div key={entry.label} className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setGroupOverrides((prev) => ({
                        ...prev,
                        [entry.label]: !groupOpen,
                      }))
                    }
                    aria-expanded={groupOpen}
                    className={`flex h-11 w-full min-w-0 items-center gap-2.5 rounded-nav px-3 text-body font-medium text-white transition-colors lg:h-9 ${
                      grupAktif && !groupOpen ? "bg-navy-surface" : "hover:bg-navy-hover"
                    }`}
                  >
                    <IkonGrup className="h-[17px] w-[17px] shrink-0 text-white/85" />
                    <span className="min-w-0 flex-1 truncate text-left">{entry.label}</span>
                    {groupCount > 0 ? (
                      <span
                        aria-label={`${groupCount} menunggu tindakan`}
                        title={`${groupCount} menunggu tindakan`}
                        className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gold px-1.5 text-micro font-bold tabular-nums leading-none text-ink"
                      >
                        {groupCount > 99 ? "99+" : groupCount}
                      </span>
                    ) : null}
                    <IconChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-white/70 transition-transform duration-200 ${
                        groupOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {groupOpen ? (
                    <div className="flex flex-col gap-0.5 pb-1">
                      {visibleItems.map((item) => {
                        const active = pathname.startsWith(item.href);
                        const IkonItem = IKON_NAV[item.href] ?? IconCar;
                        const subCount = liveCounts?.[item.href] ?? 0;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            prefetch={false}
                            aria-current={active ? "page" : undefined}
                            onClick={onClose}
                            className={`ml-3 flex h-10 min-w-0 items-center gap-2.5 rounded-nav pl-3 pr-3 text-body font-medium transition-colors lg:h-8 ${
                              active
                                ? "bg-teal text-white"
                                : "text-white/85 hover:bg-navy-hover hover:text-white"
                            }`}
                          >
                            <IkonItem
                              className={`h-[17px] w-[17px] shrink-0 ${
                                active ? "text-white" : "text-white/70"
                              }`}
                            />
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {subCount > 0 ? (
                              <span
                                aria-label={`${subCount} menunggu pemeriksaan`}
                                title={`${subCount} unit menunggu pemeriksaan`}
                                className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-micro font-bold tabular-nums leading-none ${
                                  active ? "bg-white text-teal" : "bg-gold text-ink"
                                }`}
                              >
                                {subCount > 99 ? "99+" : subCount}
                              </span>
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            }

            const active = isNavActive(entry.href);
            const Ikon = IKON_NAV[entry.href] ?? IconDashboard;
            const jumlah = liveCounts?.[entry.href] ?? 0;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                onClick={onClose}
                className={`flex h-11 w-full min-w-0 items-center gap-2 rounded-nav px-2.5 text-body font-medium transition-colors lg:h-9 ${
                  active
                    ? "bg-teal text-white"
                    : "text-white/85 hover:bg-navy-hover hover:text-white"
                }`}
              >
                <Ikon
                  className={`h-[18px] w-[18px] shrink-0 ${active ? "text-white" : "text-white/70"}`}
                />
                <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                {/* Indikator notifikasi responsif & adaptif */}
                {jumlah > 0 ? (() => {
                  const rincian = liveDetails?.[entry.href];
                  const adaYangDibalas = (rincian?.dibalas ?? 0) > 0;
                  const adaYangBaru = (rincian?.baru ?? 0) > 0;
                  const keterangan = rincian
                    ? entry.href === "/bookings"
                      ? `${jumlah} menunggu tindakan: ${rincian.baru} permintaan baru, ${rincian.dibalas} pesanan perlu tindak lanjut`
                      : `${jumlah} menunggu tindakan: ${rincian.baru} baru, ${rincian.dibalas} sudah dibalas pelanggan`
                    : `${jumlah} menunggu tindakan`;

                  return (
                    <span
                      aria-label={keterangan}
                      title={keterangan}
                      className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-micro font-bold tabular-nums leading-none ${
                        active
                          ? "bg-white text-teal"
                          : adaYangDibalas && !adaYangBaru
                            ? "bg-navy text-white"
                            : "bg-gold text-ink"
                      }`}
                    >
                      {jumlah > 99 ? "99+" : jumlah}
                    </span>
                  );
                })() : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto shrink-0 border-t border-navy-line pb-1 pt-3">
          <button
            type="button"
            onClick={() => {
              onRequestLogout();
              onClose();
            }}
            className="group flex h-10 w-full items-center gap-2.5 rounded-nav px-3 text-body font-medium text-white/70 transition-all duration-150 hover:bg-danger/20 hover:text-danger cursor-pointer"
          >
            <IconLogout className="h-[18px] w-[18px] shrink-0 text-white/50 transition-colors group-hover:text-danger" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>
    </>
  );
}
