"use client";

import { useActionState, useState } from "react";
import { useToast } from "@/components/ui/useToast";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  correctCustomerNameAction,
  revokeCustomerSessionsAction,
  unlockCustomerAction,
} from "@/app/actions";
import { formatDateTimeWit } from "@/lib/format";
import type { ActionState } from "@/app/actions";
import type { CustomerAccount, IdentityAuditItem } from "@/lib/api";

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

/**
 * Tabel akun pelanggan dengan alat pemulihan identitas.
 *
 * Halaman ini lahir dari insiden 8 November 2026: nama seorang pelanggan berubah
 * menjadi nama orang lain tanpa jejak. Tanpa alat ini, admin hanya bisa melihat
 * nama yang sudah salah dan tidak punya jalan mengembalikannya.
 */
export function CustomerAccountsTable({
  initialItems,
  initialTotal,
}: {
  initialItems: CustomerAccount[];
  initialTotal: number;
}) {
  const { show, node } = useToast();
  const [items] = useState(initialItems);
  const [filter, setFilter] = useState<"semua" | "curiga" | "tanpaSandi">("semua");
  const [koreksiUntuk, setKoreksiUntuk] = useState<CustomerAccount | null>(null);
  const [detail, setDetail] = useState<{ user: CustomerAccount; riwayat: IdentityAuditItem[] } | null>(
    null,
  );

  const terfilter = items.filter((item) => {
    if (filter === "curiga") return item.perluDiperiksa;
    if (filter === "tanpaSandi") return !item.punyaKataSandi;
    return true;
  });

  return (
    <>
      {node}

      <Panel
        title="Akun Pelanggan"
        action={<StatusChip tone="neutral">{initialTotal} akun</StatusChip>}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["semua", "Semua"],
                ["curiga", "Perlu diperiksa"],
                ["tanpaSandi", "Belum punya kata sandi"],
              ] as const
            ).map(([nilai, label]) => (
              <button
                key={nilai}
                type="button"
                onClick={() => setFilter(nilai)}
                className={`rounded-sm border px-3 py-1.5 text-meta font-medium transition-colors ${
                  filter === nilai
                    ? "border-navy bg-navy text-white"
                    : "border-rule bg-surface text-ink hover:border-ink-soft"
                }`}
              >
                {label}
              </button>
            ))}
            <span className="ml-auto text-micro text-ink-soft">
              Menampilkan {terfilter.length} dari {items.length}
            </span>
          </div>

          {terfilter.length === 0 ? (
            <p className="rounded-sm border border-rule bg-canvas p-4 text-meta text-ink-soft">
              Tidak ada akun pada filter ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-meta">
                <thead>
                  <tr className="border-b border-rule text-left text-micro uppercase tracking-wider text-ink-soft">
                    <th className="py-2 pr-3 font-semibold">Pelanggan</th>
                    <th className="py-2 pr-3 font-semibold">Verifikasi</th>
                    <th className="py-2 pr-3 font-semibold">Kata sandi</th>
                    <th className="py-2 pr-3 font-semibold">Pesanan</th>
                    <th className="py-2 pr-3 font-semibold">Terakhir masuk</th>
                    <th className="py-2 text-right font-semibold">Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {terfilter.map((item) => (
                    <tr key={item.id} className="border-b border-rule/60 align-top">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-ink">{item.fullName}</div>
                        <div className="text-micro text-ink-soft">{item.phoneNumber}</div>
                        {item.perluDiperiksa ? (
                          <div className="mt-1 inline-flex items-center gap-1 rounded-xs bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                            identitas berubah {item.umurHari} hari setelah dibuat
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-3">
                        {item.phoneVerifiedAt ? (
                          <span className="text-teal">Terverifikasi</span>
                        ) : (
                          <span className="text-ink-soft">Belum</span>
                        )}
                        {item.lockedUntil ? (
                          <div className="text-micro text-danger">Terkunci s.d. {formatDateTimeWit(item.lockedUntil)}</div>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-3">
                        {item.punyaKataSandi ? (
                          <span className="text-ink">Sudah dibuat</span>
                        ) : (
                          <span className="text-ink-soft">Hanya OTP</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">{item.jumlahBooking}</td>
                      <td className="py-2.5 pr-3 text-micro text-ink-soft">
                        {item.lastLoginAt ? formatDateTimeWit(item.lastLoginAt) : "-"}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setKoreksiUntuk(item)}
                            className="rounded-sm border border-rule px-2 py-1 text-micro font-medium text-ink hover:bg-canvas"
                          >
                            Koreksi nama
                          </button>
                          <AksiKecil
                            id={item.id}
                            action={unlockCustomerAction}
                            label="Buka kunci"
                            pesanSukses="Penguncian dibuka."
                            onDone={show}
                            nonaktif={!item.lockedUntil && item.failedLoginAttempts === 0}
                          />
                          <AksiKecil
                            id={item.id}
                            action={revokeCustomerSessionsAction}
                            label="Cabut sesi"
                            pesanSukses="Sesi dicabut."
                            onDone={show}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      <Modal
        open={koreksiUntuk !== null}
        onClose={() => setKoreksiUntuk(null)}
        title="Koreksi Nama Pelanggan"
        description={
          koreksiUntuk
            ? `${koreksiUntuk.phoneNumber} — saat ini "${koreksiUntuk.fullName}"`
            : undefined
        }
      >
        {koreksiUntuk ? (
          <FormKoreksi
            item={koreksiUntuk}
            onSelesai={(pesan) => {
              setKoreksiUntuk(null);
              show(pesan);
            }}
            onGagal={(pesan) => show(pesan, "error")}
            onRiwayat={setDetail}
          />
        ) : null}
      </Modal>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Riwayat Identitas"
        description={detail ? detail.user.fullName : undefined}
      >
        {detail ? <DaftarRiwayat items={detail.riwayat} /> : null}
      </Modal>
    </>
  );
}

/** Tombol aksi yang memakai server action dengan konfirmasi sederhana. */
function AksiKecil({
  id,
  action,
  label,
  pesanSukses,
  onDone,
  nonaktif = false,
}: {
  id: string;
  action: (
    state: ActionState | null,
    formData: FormData,
  ) => Promise<ActionState>;
  label: string;
  pesanSukses: string;
  onDone: (pesan: string, jenis?: "success" | "error") => void;
  nonaktif?: boolean;
}) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending || nonaktif}
      onClick={async () => {
        setPending(true);
        const formData = new FormData();
        formData.set("id", id);
        const hasil = await action(null, formData);
        setPending(false);
        onDone(hasil.success ? hasil.message || pesanSukses : hasil.message || "Gagal.", hasil.success ? "success" : "error");
      }}
      className="rounded-sm border border-rule px-2 py-1 text-micro font-medium text-ink hover:bg-canvas disabled:opacity-40"
    >
      {pending ? "..." : label}
    </button>
  );
}

function FormKoreksi({
  item,
  onSelesai,
  onGagal,
  onRiwayat,
}: {
  item: CustomerAccount;
  onSelesai: (pesan: string) => void;
  onGagal: (pesan: string) => void;
  onRiwayat: (data: { user: CustomerAccount; riwayat: IdentityAuditItem[] }) => void;
}) {
  const [state, formAction, pending] = useActionState(correctCustomerNameAction, null);

  if (state?.success && state.message) {
    onSelesai(state.message);
  } else if (state && !state.success && state.message) {
    onGagal(state.message);
  }

  return (
    <form action={formAction} className="space-y-3.5">
      <input type="hidden" name="id" value={item.id} />

      <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-micro text-amber-900">
        Gunakan hanya untuk memulihkan nama yang salah. Setiap koreksi dicatat beserta
        nama sebelum/sesudah, alasan, dan akun admin yang melakukannya. Pemilik nomor
        juga menerima pemberitahuan WhatsApp.
      </div>

      <div>
        <label htmlFor="koreksi-nama" className="block text-meta font-medium text-ink">
          Nama yang benar (sesuai e-KTP)
        </label>
        <input
          id="koreksi-nama"
          name="fullName"
          defaultValue={item.fullName}
          className="mt-1 w-full rounded-sm border border-rule-strong bg-surface p-2.5 text-body text-ink focus:border-navy focus:outline-none"
        />
        {state?.errors?.fullName ? (
          <p className="mt-1 text-micro text-danger">{state.errors.fullName}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="koreksi-alasan" className="block text-meta font-medium text-ink">
          Alasan koreksi (wajib, minimal 10 karakter)
        </label>
        <textarea
          id="koreksi-alasan"
          name="reason"
          rows={3}
          placeholder="Contoh: nama dipulihkan dari e-KTP pada booking MJ-20261027-UOBB; nama sebelumnya terisi otomatis oleh APK lama."
          className="mt-1 w-full rounded-sm border border-rule-strong bg-surface p-2.5 text-meta text-ink focus:border-navy focus:outline-none"
        />
        {state?.errors?.reason ? (
          <p className="mt-1 text-micro text-danger">{state.errors.reason}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={() => onRiwayat({ user: item, riwayat: [] })}
          className="text-micro font-medium text-navy hover:underline"
        >
          Lihat riwayat identitas
        </button>
        <div className="flex items-center gap-2">
          <Button variant="confirm" type="submit" disabled={pending}>
            {pending ? "Menyimpan..." : "Simpan koreksi"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function DaftarRiwayat({ items }: { items: IdentityAuditItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-sm border border-rule bg-canvas p-3 text-meta text-ink-soft">
        Belum ada catatan perubahan identitas untuk akun ini.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-sm border border-rule bg-canvas p-2.5 text-meta">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink">{LABEL_AKSI[item.action] ?? item.action}</span>
            <span className="text-micro text-ink-soft">{formatDateTimeWit(item.createdAt)}</span>
          </div>
          {item.before || item.after ? (
            <p className="mt-0.5 text-micro text-ink-soft">
              {item.before ?? "-"} <span aria-hidden>→</span> {item.after ?? "-"}
            </p>
          ) : null}
          {item.reason ? <p className="mt-1 text-micro text-ink-soft">{item.reason}</p> : null}
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-soft">
            {item.actorType}
            {item.ipAddress ? ` · ${item.ipAddress}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
