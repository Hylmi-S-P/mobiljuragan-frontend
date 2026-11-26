"use client";

import { Suspense, useState, type ReactNode } from "react";

import { LogoutConfirmModal } from "@/components/modals/LogoutConfirmModal";
import {
  AdminProfileProvider,
  type AdminProfile,
} from "@/components/providers/AdminProfileContext";
import type { NavCounts } from "@/lib/navCounts";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function DashboardShell({
  children,
  navCounts,
  navDetails,
  userRole,
  adminProfile = null,
}: {
  children: ReactNode;
  /* Angka pekerjaan yang menunggu, dihitung di tata letak sisi server. */
  navCounts?: NavCounts;
  /* Rincian angka per menu, dipakai badge agar bisa menjelaskan komposisinya. */
  navDetails?: Record<string, { baru: number; dibalas: number }>;
  userRole?: "SUPER_ADMIN" | "ADMIN";
  adminProfile?: AdminProfile | null;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <AdminProfileProvider value={adminProfile}>
      <div className="flex min-h-dvh">
        <a
          href="#konten"
          className="sr-only rounded-sm bg-surface px-4 py-2 text-body font-medium text-ink shadow-card focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Lewati ke konten
        </a>
        <Suspense fallback={null}>
          <Sidebar
            open={navOpen}
            onClose={() => setNavOpen(false)}
            navCounts={navCounts}
            navDetails={navDetails}
            userRole={userRole}
            onRequestLogout={() => setShowLogoutModal(true)}
          />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            onOpenNav={() => setNavOpen(true)}
            onRequestLogout={() => setShowLogoutModal(true)}
          />
          <main id="konten" className="flex-1 px-5 py-5 lg:px-7">
            {children}
          </main>
        </div>
      </div>

      <LogoutConfirmModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
      />
    </AdminProfileProvider>
  );
}
