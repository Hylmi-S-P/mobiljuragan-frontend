"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { NAV_ENTRIES, WORKSPACE_NAME, WORKSPACE_ROLE, isNavGroup } from "@/lib/navigation";
import {
  IconCar,
  IconCalendar,
  IconChat,
  IconChevronDown,
  IconDashboard,
  IconHelpCircle,
  IconInbox,
  IconShield,
  IconSparkles,
  IconTrendingUp,
  IconUsers,
} from "@/components/ui/icons";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

/* Satu ikon per tujuan navigasi, semuanya dari keluarga ikon yang sama. */
const IKON_NAV: Record<string, (props: { className?: string }) => React.ReactElement> = {
  "/": IconDashboard,
  "/bookings": IconInbox,
  "/fleet/catalog": IconCar,
  "/fleet/calendar": IconCalendar,
  "/fleet/drivers": IconUsers,
  "/customer-care": IconChat,
  "/finance": IconTrendingUp,
  "/admin/ai-hub": IconSparkles,
  "/faqs": IconHelpCircle,
  "/admin": IconShield,
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const fleetActive = NAV_ENTRIES.some(
    (entry) => isNavGroup(entry) && entry.items.some((item) => pathname.startsWith(item.href)),
  );

  /* Akordeon mengikuti rute armada; pilihan manual pengguna menang sampai ia mengubahnya lagi. */
  const [fleetOverride, setFleetOverride] = useState<boolean | null>(null);
  const fleetOpen = fleetOverride ?? fleetActive;

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
            {WORKSPACE_ROLE}
          </p>
        </div>

        <div aria-hidden="true" className="mb-3 h-px bg-navy-line" />

        <nav className="flex flex-col gap-0.5">
          {NAV_ENTRIES.map((entry) => {
            if (isNavGroup(entry)) {
              const IkonGrup = IconCar;
              const grupAktif = fleetActive;
              return (
                <div key={entry.label} className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => setFleetOverride(!fleetOpen)}
                    aria-expanded={fleetOpen}
                    className={`flex h-11 items-center gap-2.5 rounded-nav px-3 text-body font-medium text-white transition-colors ${
                      grupAktif && !fleetOpen ? "bg-navy-surface" : "hover:bg-navy-hover"
                    }`}
                  >
                    <IkonGrup className="h-[17px] w-[17px] shrink-0 text-white/85" />
                    <span className="flex-1 whitespace-nowrap text-left">{entry.label}</span>
                    <IconChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-white/70 transition-transform duration-200 ${
                        fleetOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {fleetOpen ? (
                    <div className="flex flex-col gap-0.5 pb-1">
                      {entry.items.map((item) => {
                        const active = pathname.startsWith(item.href);
                        const IkonItem = IKON_NAV[item.href] ?? IconCar;
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
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            }

            const active = pathname === entry.href;
            const Ikon = IKON_NAV[entry.href] ?? IconDashboard;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                aria-current={active ? "page" : undefined}
                onClick={onClose}
                className={`flex h-11 items-center gap-2.5 rounded-nav px-3 text-body font-medium transition-colors ${
                  active
                    ? "bg-teal text-white"
                    : "text-white/85 hover:bg-navy-hover hover:text-white"
                }`}
              >
                <Ikon
                  className={`h-[18px] w-[18px] shrink-0 ${active ? "text-white" : "text-white/70"}`}
                />
                {entry.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
