"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { createAdminAction, updateAdminAction, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { IconEye, IconEyeOff } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { ADMIN_ROLE } from "@/lib/labels";
import type { AdminAccount, AdminRole } from "@/lib/types";

type Props = {
  account?: AdminAccount;
  existingUsernames: string[];
  onClose: () => void;
  onSave: (account: AdminAccount) => void;
};

const MIN_PASSWORD_LENGTH = 8;

function ModalSubmitButton({ isEdit, formId }: { isEdit: boolean; formId: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" form={formId} variant="confirm" disabled={pending}>
      {pending
        ? isEdit
          ? "Menyimpan..."
          : "Membuat Admin..."
        : isEdit
          ? "Simpan Perubahan"
          : "Buat Admin"}
    </Button>
  );
}

export function AdminAccountModal({ account, onClose, onSave }: Props) {
  const fieldId = useId();
  /*
   * Modal menaruh footer di luar <form>, jadi tombol submit di footer tidak lagi
   * berada di dalam form-nya. Tanpa atribut `form`, tombol itu tidak mengirim apa pun
   * menurut spesifikasi HTML. Atribut `form` menautkannya kembali ke form di body modal.
   */
  const formId = `${fieldId}-admin-form`;
  const isEdit = Boolean(account);

  const [name, setName] = useState(account?.name ?? "");
  const [role, setRole] = useState<AdminRole>(account?.role ?? "staf_operasional");
  const [username, setUsername] = useState(account?.username ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [active, setActive] = useState(account?.active ?? true);

  const actionFn = isEdit ? updateAdminAction : createAdminAction;
  const [state, formAction] = useActionState<ActionState | null, FormData>(actionFn, null);

  useEffect(() => {
    if (state?.success) {
      onSave({
        id: account?.id ?? `admin-${Date.now()}`,
        name: name.trim(),
        username: username.trim(),
        role,
        active,
      });
      onClose();
    }
  }, [state, account, name, username, role, active, onSave, onClose]);

  return (
    <Modal
      open
      onClose={onClose}
      title={account ? "Edit Akun Admin" : "Buat Akun Admin Baru"}
      description="Kelola akun pengelola resmi untuk mengakses seluruh modul portal operasional MobilJuragan."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <ModalSubmitButton isEdit={isEdit} formId={formId} />
        </>
      }
    >
      <form id={formId} action={formAction} className="space-y-3.5">
        {account ? <input type="hidden" name="id" value={account.id} /> : null}
        <input type="hidden" name="active" value={String(active)} />

        {state?.message && !state?.success ? (
          <div
            role="alert"
            className="rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-meta text-danger"
          >
            {state.message}
          </div>
        ) : null}

        <div>
          <label htmlFor={`${fieldId}-name`} className="block text-meta font-medium text-ink">
            Nama Lengkap
          </label>
          <input
            id={`${fieldId}-name`}
            name="fullName"
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(state?.errors?.fullName)}
            aria-describedby={
              state?.errors?.fullName ? `${fieldId}-name-error` : `${fieldId}-name-hint`
            }
            className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink"
            placeholder="Nama lengkap admin"
            required
          />
          {state?.errors?.fullName ? (
            <p id={`${fieldId}-name-error`} className="mt-1 text-meta text-danger">
              {state.errors.fullName}
            </p>
          ) : (
            <p id={`${fieldId}-name-hint`} className="mt-1 text-micro text-ink-soft">
              Minimal 3 karakter.
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${fieldId}-role`} className="block text-meta font-medium text-ink">
            Hak Akses
          </label>
          <select
            id={`${fieldId}-role`}
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as AdminRole)}
            className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink"
          >
            {Object.entries(ADMIN_ROLE).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor={`${fieldId}-username`} className="block text-meta font-medium text-ink">
              Username
            </label>
            <input
              id={`${fieldId}-username`}
              name="username"
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={30}
              value={username}
              onChange={(event) =>
                setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))
              }
              aria-invalid={Boolean(state?.errors?.username)}
              aria-describedby={
                state?.errors?.username ? `${fieldId}-username-error` : `${fieldId}-username-hint`
              }
              className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink"
              placeholder="Contoh: admin.operasional"
              required
            />
            {state?.errors?.username ? (
              <p id={`${fieldId}-username-error`} className="mt-1 text-meta text-danger">
                {state.errors.username}
              </p>
            ) : (
              <p id={`${fieldId}-username-hint`} className="mt-1 text-micro text-ink-soft">
                3-30 karakter: huruf kecil, angka, titik, underscore, atau tanda hubung.
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${fieldId}-password`} className="block text-meta font-medium text-ink">
              Kata Sandi
            </label>
            <div className="relative mt-1">
              <input
                id={`${fieldId}-password`}
                name="password"
                type={showPassword ? "text" : "password"}
                maxLength={50}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(state?.errors?.password)}
                aria-describedby={
                  state?.errors?.password ? `${fieldId}-password-error` : `${fieldId}-password-hint`
                }
                className="h-11 w-full rounded-sm border border-rule-strong bg-canvas pl-3 pr-10 text-body text-ink"
                placeholder={account ? "Kosongkan jika tidak diubah" : "Minimal 8 karakter"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
              >
                {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
              </button>
            </div>
            {state?.errors?.password ? (
              <p id={`${fieldId}-password-error`} className="mt-1 text-meta text-danger">
                {state.errors.password}
              </p>
            ) : (
              <p id={`${fieldId}-password-hint`} className="mt-1 text-micro text-ink-soft">
                {account
                  ? "Biarkan kosong kalau sandi tidak diganti."
                  : `Minimal ${MIN_PASSWORD_LENGTH} karakter.`}
              </p>
            )}
          </div>
        </div>

        {account ? (
          <fieldset>
            <legend className="text-meta font-medium text-ink">Status akun</legend>
            <div className="mt-1.5 flex gap-2">
              <Button
                type="button"
                variant={active ? "confirm" : "outline"}
                aria-pressed={active}
                onClick={() => setActive(true)}
              >
                Aktif
              </Button>
              <Button
                type="button"
                variant={!active ? "confirm" : "outline"}
                aria-pressed={!active}
                onClick={() => setActive(false)}
              >
                Nonaktif
              </Button>
            </div>
          </fieldset>
        ) : null}
      </form>
    </Modal>
  );
}
