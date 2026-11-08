"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatDateTimeWit } from "@/lib/format";
import type { IdentityAuditItem } from "@/lib/api";

const LABEL_AKSI: Record<string, string> = {
  PROFILE_NAME_CHANGED: "Nama diubah",
  PROFILE_PHONE_CHANGED: "Nomor diubah",
  PASSWORD_SET: "Kata sandi dibuat",
  PASSWORD_CHANGED: "Kata sandi diganti",
  PASSWORD_RESET: "Kata sandi dipulihkan",
  PASSWORD_LOGIN_SUCCESS: "Masuk dengan kata sandi",
  PASSWORD_LOGIN_FAILED: "Kata sandi salah",
  SESSIONS_REVOKED: "Sesi dicabut",
};

const NADA_AKSI: Record<string, "neutral" | "pending" | "danger" | "available"> = {
  PROFILE_NAME_CHANGED: "pending",
  PROFILE_PHONE_CHANGED: "pending",
  PASSWORD_RESET: "pending",
  PASSWORD_CHANGED: "available",
  PASSWORD_SET: "available",
  PASSWORD_LOGIN_FAILED: "danger",
  SESSIONS_REVOKED: "neutral",
  PASSWORD_LOGIN_SUCCESS: "neutral",
};

/**
 * Jejak perubahan identitas lintas akun.
 *
 * Halaman ini menjawab pertanyaan yang sebelumnya tidak bisa dijawab sama sekali:
 * "siapa mengubah data akun ini, kapan, dari mana, dan mengapa". Isinya
 * append-only — tidak ada tombol hapus, karena justru penghapusan jejak yang
 * membuat insiden 8 November 2026 tidak terdeteksi.
 */
export function IdentityAuditTable({
  items,
  total,
}: {
  items: IdentityAuditItem[];
  total: number;
}) {
  const [filter, setFilter] = useState<string>("semua");

  const jenisAksi = Array.from(new Set(items.map((item) => item.action)));
  const terfilter = filter === "semua" ? items : items.filter((i) => i.action === filter);

  return (
    <Panel
      title="Jejak Identitas"
      action={<StatusChip tone="neutral">{total} peristiwa</StatusChip>}
    >
      <div className="space-y-4">
        <p className="text-meta text-ink-soft">
          Catatan permanen setiap perubahan nama dan kata sandi pelanggan. Dipakai untuk
          menelusuri insiden bila data akun berubah tanpa sepengetahuan pemiliknya.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("semua")}
            className={`rounded-sm border px-3 py-1.5 text-meta font-medium ${
              filter === "semua"
                ? "border-navy bg-navy text-white"
                : "border-rule bg-surface text-ink hover:border-ink-soft"
            }`}
          >
            Semua
          </button>
          {jenisAksi.map((aksi) => (
            <button
              key={aksi}
              type="button"
              onClick={() => setFilter(aksi)}
              className={`rounded-sm border px-3 py-1.5 text-meta font-medium ${
                filter === aksi
                  ? "border-navy bg-navy text-white"
                  : "border-rule bg-surface text-ink hover:border-ink-soft"
              }`}
            >
              {LABEL_AKSI[aksi] ?? aksi}
            </button>
          ))}
        </div>

        {terfilter.length === 0 ? (
          <p className="rounded-sm border border-rule bg-canvas p-4 text-meta text-ink-soft">
            Belum ada peristiwa pada filter ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-meta">
              <thead>
                <tr className="border-b border-rule text-left text-micro uppercase tracking-wider text-ink-soft">
                  <th className="py-2 pr-3 font-semibold">Waktu</th>
                  <th className="py-2 pr-3 font-semibold">Peristiwa</th>
                  <th className="py-2 pr-3 font-semibold">Pelanggan</th>
                  <th className="py-2 pr-3 font-semibold">Perubahan</th>
                  <th className="py-2 pr-3 font-semibold">Pelaku</th>
                  <th className="py-2 font-semibold">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {terfilter.map((item) => (
                  <tr key={item.id} className="border-b border-rule/60 align-top">
                    <td className="py-2.5 pr-3 whitespace-nowrap text-micro text-ink-soft">
                      {formatDateTimeWit(item.createdAt)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusChip tone={NADA_AKSI[item.action] ?? "neutral"}>
                        {LABEL_AKSI[item.action] ?? item.action}
                      </StatusChip>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-ink">
                        {item.user?.fullName ?? "(akun dihapus)"}
                      </div>
                      <div className="text-micro text-ink-soft">
                        {item.user?.phoneNumber ?? item.userId}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-micro">
                      {item.before || item.after ? (
                        <span className="text-ink-soft">
                          {item.before ?? "-"} <span aria-hidden>→</span> {item.after ?? "-"}
                        </span>
                      ) : (
                        <span className="text-ink-soft">-</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-micro uppercase tracking-wider text-ink-soft">
                      {item.actorType}
                      {item.ipAddress ? (
                        <div className="normal-case tracking-normal">{item.ipAddress}</div>
                      ) : null}
                    </td>
                    <td className="py-2.5 text-micro text-ink-soft">
                      {item.reason ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Panel>
  );
}
