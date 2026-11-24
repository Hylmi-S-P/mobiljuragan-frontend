"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { NAV_ENTRIES, WORKSPACE_NAME, WORKSPACE_ROLE, isNavGroup } from "@/lib/navigation";
import { LogoutConfirmModal } from "@/components/modals/LogoutConfirmModal";
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
  /* Angka pekerjaan yang menunggu, dipetakan per tujuan navigasi. */
  navCounts?: Record<string, number>;
  /* Rincian angka: berapa yang benar-benar baru, berapa yang menunggu balasan
     admin setelah pelanggan membalas. Dipakai badge untuk menjelaskan isinya. */
  navDetails?: Record<string, { baru: number; dibalas: number }>;
  userRole?: "ADMIN" | "STAFF";
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

export function Sidebar({ open, onClose, navCounts, navDetails, userRole }: SidebarProps) {
  const pathname = usePathname();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [syncedCounts, setSyncedCounts] = useState(navCounts);
  const [syncedDetails, setSyncedDetails] = useState(navDetails);
  const [liveCounts, setLiveCounts] = useState(navCounts);
  const [liveDetails, setLiveDetails] = useState(navDetails);

  if (syncedCounts !== navCounts || syncedDetails !== navDetails) {
    setSyncedCounts(navCounts);
    setSyncedDetails(navDetails);
    setLiveCounts(navCounts);
    setLiveDetails(navDetails);
  }

  /* Setiap grup akordeon memiliki state independen agar membuka satu grup tidak memengaruhi grup lain. */
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let activeEffect = true;

    async function refreshCounts() {
      try {
        const res = await fetch("/api/nav-counts", { cache: "no-store" });
        if (!res.ok || !activeEffect) return;
        const json = (await res.json()) as {
          counts?: Record<string, number>;
          details?: Record<string, { baru: number; dibalas: number }>;
        };
        if (!activeEffect) return;
        if (json.counts) setLiveCounts(json.counts);
        if (json.details) setLiveDetails(json.details);
      } catch {
        // Kegagalan polling dibiarkan tenang agar navigasi tidak terganggu.
      }
    }

    refreshCounts();
    const timer = window.setInterval(refreshCounts, 25_000);
    return () => {
      activeEffect = false;
      window.clearInterval(timer);
    };
  }, [pathname]);

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
        className={`fixed inset-y-0 left-0 z-40 flex w-[227px] shrink-0 flex-col overflow-y-auto bg-navy px-3 py-5 lg:sticky lg:top-0 lg:bottom-auto lg:z-auto lg:h-dvh lg:self-start lg:visible lg:translate-x-0 ${
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="px-2 pb-5">
          <p className="text-body font-semibold leading-[1.3] tracking-[-0.01em] text-white">
            {WORKSPACE_NAME}
          </p>
          <p className="mt-1 text-micro font-semibold uppercase text-on-navy-muted">
            {userRole === "STAFF" ? "Portal staf" : WORKSPACE_ROLE}
          </p>
        </div>

        <div aria-hidden="true" className="mb-3 h-px bg-navy-line" />

        <nav className="flex flex-col gap-0.5">
          {NAV_ENTRIES.filter((entry) => userRole === "ADMIN" || !entry.adminOnly).map((entry) => {
            if (isNavGroup(entry)) {
              const IkonGrup = entry.label === "Akun Pelanggan" ? IconUsers : IconCar;
              const grupAktif = entry.items.some((item) => pathname.startsWith(item.href));
              const groupOpen = groupOverrides[entry.label] ?? grupAktif;
              const groupCount = entry.items.reduce(
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
                    className={`flex h-11 items-center gap-2.5 rounded-nav px-3 text-body font-medium text-white transition-colors ${
                      grupAktif && !groupOpen ? "bg-navy-surface" : "hover:bg-navy-hover"
                    }`}
                  >
                    <IkonGrup className="h-[17px] w-[17px] shrink-0 text-white/85" />
                    <span className="flex-1 whitespace-nowrap text-left">{entry.label}</span>
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
                      {entry.items.map((item) => {
                        const active = pathname.startsWith(item.href);
                        const IkonItem = IKON_NAV[item.href] ?? IconCar;
                        const subCount = liveCounts?.[item.href] ?? 0;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            onClick={onClose}
                            className={`ml-3 flex h-10 items-center gap-2.5 rounded-nav pl-3 pr-3 text-body font-medium transition-colors ${
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
                            <span className="flex-1 truncate">{item.label}</span>
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
                aria-current={active ? "page" : undefined}
                onClick={onClose}
                className={`flex h-11 items-center gap-2 rounded-nav px-2.5 text-body font-medium transition-colors ${
                  active
                    ? "bg-teal text-white"
                    : "text-white/85 hover:bg-navy-hover hover:text-white"
                }`}
              >
                <Ikon
                  className={`h-[18px] w-[18px] shrink-0 ${active ? "text-white" : "text-white/70"}`}
                />
                <span className="flex-1 whitespace-nowrap">{entry.label}</span>
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

        <div className="mt-auto pt-3 pb-2 border-t border-navy-line">
          <button
            type="button"
            onClick={() => {
              setShowLogoutModal(true);
              onClose();
            }}
            className="group flex h-10 w-full items-center gap-2.5 rounded-nav px-3 text-body font-medium text-white/70 transition-all duration-150 hover:bg-danger/20 hover:text-danger cursor-pointer"
          >
            <IconLogout className="h-[18px] w-[18px] shrink-0 text-white/50 transition-colors group-hover:text-danger" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      <LogoutConfirmModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
      />
    </>
  );
}
