"use client";

import React from "react";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  IconArrowRight,
  IconUser,
} from "@/components/ui/icons";
import { ADMIN_ROLE } from "@/lib/labels";
import type { AdminAccount } from "@/lib/types";

type Props = {
  accounts: AdminAccount[];
  currentUserId?: string;
  onManageAccount: (account: AdminAccount) => void;
  onToggleStatus: (account: AdminAccount) => void;
  isPendingToggle?: boolean;
};

/**
 * AdminCardGrid: Grid kartu modular akun pengelola/staf.
 * Menghilangkan tabel lebar yang terpotong di layar kecil, melindungi akun sesi aktif,
 * dan memindahkan aksi sensitif ke dalam modal kelola terpadu.
 */
export function AdminCardGrid({
  accounts,
  currentUserId,
  onManageAccount,
  onToggleStatus,
  isPendingToggle,
}: Props) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-card border border-rule bg-canvas px-4 py-8 text-center sm:px-6">
        <IconUser className="mx-auto h-8 w-8 text-ink-soft/60" />
        <p className="mt-2 text-body font-semibold text-ink">Tidak ada akun staf yang cocok.</p>
        <p className="mt-1 text-meta text-ink-soft">
          Coba sesuaikan kata kunci nama atau nomor telepon untuk mencari akun lain.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {accounts.map((account) => {
        const initial = account.name.trim().charAt(0).toUpperCase() || "A";
        const isSelf = Boolean(currentUserId && currentUserId === account.id);

        return (
          <div
            key={account.id}
            className={`group relative flex flex-col justify-between rounded-card border bg-surface p-4 sm:p-5 shadow-xs transition-all duration-200 hover:shadow-sm ${
              isSelf ? "border-navy/40 ring-1 ring-navy/15" : "border-rule hover:border-navy/30"
            }`}
          >
            <div>
              {/* Header Kartu: Avatar Inisial, Nama, Status Akun Sesi */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy/10 text-body font-bold text-navy">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="block font-semibold text-ink text-subtitle truncate">
                        {account.name}
                      </span>
                      {isSelf ? (
                        <span className="rounded-full bg-navy/10 px-2 py-0.5 text-micro font-bold text-navy">
                          Akun Anda
                        </span>
                      ) : null}
                    </div>
                    <span className="block font-mono text-micro text-ink-soft">
                      {account.username}
                    </span>
                  </div>
                </div>

                {/* Status Aktif / Nonaktif */}
                <button
                  type="button"
                  disabled={isSelf || isPendingToggle}
                  onClick={() => onToggleStatus(account)}
                  title={
                    isSelf
                      ? "Akun sesi yang sedang aktif tidak dapat dinonaktifkan."
                      : "Klik untuk mengubah status aktif"
                  }
                  className={`transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy ${
                    isSelf ? "cursor-not-allowed opacity-90" : "cursor-pointer hover:opacity-80"
                  }`}
                >
                  <StatusChip tone={account.active ? "available" : "neutral"}>
                    {account.active ? "Aktif" : "Nonaktif"}
                  </StatusChip>
                </button>
              </div>

              {/* Peran / Hak Akses.

                  Baris "Status Kata Sandi: Bcrypt Hash" sengaja dihapus. Baris itu
                  hanya peninggalan dari permintaan menampilkan kata sandi ter-masking
                  di kartu. Kata sandi tersimpan sebagai hash satu arah, jadi tidak ada
                  yang bisa ditampilkan, dan label itu tidak memberi informasi berguna
                  bagi admin. */}
              <div className="mt-4 rounded-sm border border-rule/60 bg-canvas/60 p-3">
                <div className="flex items-center justify-between text-meta">
                  <span className="text-ink-soft font-medium">Peran / Hak Akses:</span>
                  <span className="rounded-badge bg-surface border border-rule px-2 py-0.5 text-micro font-semibold text-ink">
                    {ADMIN_ROLE[account.role]}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Aksi: Kelola Akun & Reset Sandi */}
            <div className="mt-4 pt-3 border-t border-rule/60 flex items-center justify-end">
              <button
                type="button"
                onClick={() => onManageAccount(account)}
                className="inline-flex items-center gap-1.5 rounded-sm border border-rule bg-canvas px-3 py-1.5 text-meta font-semibold text-ink hover:border-navy hover:text-navy transition-colors focus:outline-none"
              >
                <span>Kelola &amp; Reset Sandi</span>
                <IconArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
