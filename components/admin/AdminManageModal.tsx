"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateAdminAction, deleteAdminAction, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  IconAlert,
  IconEye,
  IconEyeOff,
  IconShield,
  IconTrash,
} from "@/components/ui/icons";
import { ADMIN_ROLE } from "@/lib/labels";
import type { AdminAccount, AdminRole } from "@/lib/types";

type Props = {
  account: AdminAccount;
  currentUserId?: string;
  onClose: () => void;
  onSave: (account: AdminAccount) => void;
  onDeleted: (id: string) => void;
};

const MIN_PASSWORD_LENGTH = 8;

function SubmitButton({ formId, disabled }: { formId: string; disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      form={formId}
      variant="confirm"
      disabled={pending || disabled}
    >
      {pending ? "Menyimpan Perubahan..." : "Simpan Perubahan"}
    </Button>
  );
}

/**
 * AdminManageModal: Modal komprehensif untuk mengelola akun staf/admin,
 * melakukan reset kata sandi dengan validasi keamanan ketat (huruf besar & angka),
 * serta proteksi akun sesi aktif agar tidak bisa menghapus atau mendowngrade diri sendiri.
 */
export function AdminManageModal({
  account,
  currentUserId,
  onClose,
  onSave,
  onDeleted,
}: Props) {
  const fieldId = useId();
  const formId = `${fieldId}-manage-admin-form`;

  const isSelf = Boolean(currentUserId && currentUserId === account.id);

  const [name, setName] = useState(account.name);
  const [phoneNumber, setPhoneNumber] = useState(account.username);
  const [role, setRole] = useState<AdminRole>(account.role);
  const [active, setActive] = useState(account.active);

  // State Reset Kata Sandi
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // State Konfirmasi Hapus 2-Tahap
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [state, formAction] = useActionState<ActionState | null, FormData>(
    updateAdminAction,
    null,
  );

  // Validasi kata sandi baru (hanya jika diisi staf)
  const hasMinLength = newPassword.length >= MIN_PASSWORD_LENGTH;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isPasswordValid =
    newPassword.length === 0 || (hasMinLength && hasUppercase && hasNumber);

  useEffect(() => {
    if (state?.success) {
      onSave({
        id: account.id,
        name: name.trim(),
        username: phoneNumber.trim(),
        role,
        active,
      });
      onClose();
    }
  }, [state, account.id, name, phoneNumber, role, active, onSave, onClose]);

  const handleDeleteSelfProtected = async () => {
    if (isSelf) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const formData = new FormData();
      formData.append("id", account.id);
      const res = await deleteAdminAction(null, formData);
      if (res?.success) {
        onDeleted(account.id);
        onClose();
      } else {
        setDeleteError(res?.message || "Gagal menghapus akun.");
      }
    } catch {
      setDeleteError("Terjadi kesalahan jaringan saat menghapus akun.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Kelola Akun Staf & Keamanan"
      description="Perbarui informasi profil operasional, tetapkan hak akses, atau lakukan reset kata sandi akun."
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {!showDeleteConfirm && !isSelf ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-meta font-medium text-danger hover:bg-danger/10 transition-colors"
            >
              <IconTrash className="h-4 w-4" />
              <span>Hapus Akun</span>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <SubmitButton formId={formId} disabled={!isPasswordValid} />
          </div>
        </div>
      }
    >
      <form id={formId} action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={account.id} />
        <input type="hidden" name="active" value={String(active)} />

        {isSelf ? (
          <div className="flex items-center gap-2 rounded-sm border border-navy/30 bg-navy/5 px-3 py-2 text-meta text-navy">
            <IconShield className="h-4 w-4 shrink-0" />
            <span>
              <strong>Akun Sesi Aktif:</strong> Anda sedang login dengan akun ini. Anda tidak dapat
              menghapus atau menonaktifkan akun sendiri demi keamanan sistem.
            </span>
          </div>
        ) : null}

        {state?.message && !state?.success ? (
          <div
            role="alert"
            className="rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-meta text-danger"
          >
            {state.message}
          </div>
        ) : null}

        {/* Banner Konfirmasi Hapus 2-Tahap */}
        {showDeleteConfirm && !isSelf ? (
          <div className="rounded-md border border-danger/40 bg-danger/10 p-3.5">
            <div className="flex items-start gap-2.5">
              <IconAlert className="h-5 w-5 shrink-0 text-danger mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-body font-semibold text-danger">Konfirmasi Hapus Akun</p>
                <p className="mt-1 text-meta text-ink">
                  Apakah Anda yakin ingin menghapus akun <strong>{account.name}</strong>? Akun ini tidak
                  dapat dipulihkan kembali setelah dihapus.
                </p>

                {deleteError ? (
                  <p className="mt-2 text-meta font-semibold text-danger">{deleteError}</p>
                ) : null}

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={isDeleting}
                    onClick={handleDeleteSelfProtected}
                  >
                    {isDeleting ? "Menghapus..." : "Ya, Hapus Sekarang"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isDeleting}
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Profil Dasar */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor={`${fieldId}-name`} className="block text-meta font-medium text-ink">
              Nama Lengkap
            </label>
            <input
              id={`${fieldId}-name`}
              type="text"
              name="fullName"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>

          <div>
            <label htmlFor={`${fieldId}-phone`} className="block text-meta font-medium text-ink">
              Username
            </label>
            <input
              id={`${fieldId}-phone`}
              type="text"
              name="phoneNumber"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
        </div>

        {/* Role & Hak Akses */}
        <div>
          <label htmlFor={`${fieldId}-role`} className="block text-meta font-medium text-ink">
            Hak Akses / Peran Akun
          </label>
          <select
            id={`${fieldId}-role`}
            name="role"
            value={role}
            disabled={isSelf}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy disabled:bg-rule/40"
          >
            <option value="staf_operasional">{ADMIN_ROLE.staf_operasional}</option>
            <option value="super_admin">{ADMIN_ROLE.super_admin}</option>
          </select>
          {isSelf ? (
            <p className="mt-1 text-micro text-ink-soft">
              Hak akses tidak dapat diubah untuk akun sesi aktif yang sedang digunakan.
            </p>
          ) : null}
        </div>

        {/* Bagian Reset Kata Sandi */}
        <div className="rounded-md border border-rule bg-canvas/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-body font-semibold text-ink">Reset Kata Sandi</span>
              <p className="text-micro text-ink-soft">
                Biarkan kosong bila tidak ingin mengganti kata sandi staf.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-micro text-ink-soft font-mono bg-canvas px-2 py-0.5 rounded border border-rule">
              <IconShield className="h-3 w-3 text-teal" />
              Bcrypt Hashed
            </span>
          </div>

          <div className="mt-3 relative">
            <input
              id={`${fieldId}-password`}
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Masukkan kata sandi baru..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-11 w-full rounded-sm border border-rule-strong bg-surface pl-3 pr-10 text-body text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-soft hover:text-ink focus:outline-none"
              title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {showPassword ? (
                <IconEyeOff className="h-4 w-4" />
              ) : (
                <IconEye className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Validasi Persyaratan Kata Sandi (jika mulai diketik) */}
          {newPassword.length > 0 ? (
            <div className="mt-2.5 space-y-1 text-micro">
              <p className="font-semibold text-ink">Persyaratan Keamanan:</p>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={
                    hasMinLength ? "text-emerald-700 font-medium" : "text-danger"
                  }
                >
                  {hasMinLength ? "✓" : "✗"} Minimal 8 Karakter
                </span>
                <span
                  className={
                    hasUppercase ? "text-emerald-700 font-medium" : "text-danger"
                  }
                >
                  {hasUppercase ? "✓" : "✗"} Huruf Besar (A-Z)
                </span>
                <span
                  className={
                    hasNumber ? "text-emerald-700 font-medium" : "text-danger"
                  }
                >
                  {hasNumber ? "✓" : "✗"} Angka (0-9)
                </span>
              </div>
              {!isPasswordValid ? (
                <p className="mt-2 text-micro font-medium text-danger">
                  Kata sandi baru belum memenuhi syarat keamanan. Tombol simpan dinonaktifkan sampai semua kriteria terpenuhi.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
