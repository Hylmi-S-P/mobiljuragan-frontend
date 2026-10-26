"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { IconEye, IconEyeOff, IconUser } from "@/components/ui/icons";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="confirm"
      size="md"
      className="mt-3 h-11 w-full rounded-[9px]"
      disabled={pending}
    >
      {pending ? "Memverifikasi Kredensial..." : "Masuk ke Dashboard"}
    </Button>
  );
}

export function LoginForm() {
  const fieldId = useId();
  const [state, formAction] = useActionState(loginAction, null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <form action={formAction} noValidate className="flex h-full flex-col">
      <p className="text-meta font-semibold text-ink">Masuk ke akun Anda</p>
      <p className="mt-[7px] max-w-full text-[12px] leading-[1.45] text-rule-strong">
        Gunakan kredensial resmi staf untuk mengakses seluruh modul operasional.
      </p>

      {state?.message ? (
        <div
          role="alert"
          className="mt-3.5 rounded-md border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-meta text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <div className="mt-7 space-y-[18px]">
        <div>
          <label
            htmlFor={`${fieldId}-username`}
            className="block text-[12px] font-medium text-slate-700"
          >
            Username Akun
          </label>
          <div className="relative mt-1.5">
            <input
              id={`${fieldId}-username`}
              name="username"
              autoComplete="username"
              aria-invalid={Boolean(state?.errors?.username)}
              aria-describedby={state?.errors?.username ? `${fieldId}-username-error` : undefined}
              className="h-11 w-full rounded-md border border-slate-300 bg-canvas pl-3 pr-11 text-body text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
              placeholder="081234567890 atau admin"
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
              <IconUser className="h-3.5 w-3.5" />
            </span>
          </div>
          {state?.errors?.username ? (
            <p id={`${fieldId}-username-error`} className="mt-1 text-meta text-danger">
              {state.errors.username}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor={`${fieldId}-password`}
            className="block text-[12px] font-medium text-slate-700"
          >
            Kata Sandi (Password)
          </label>
          <div className="relative mt-1.5">
            <input
              id={`${fieldId}-password`}
              name="password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={Boolean(state?.errors?.password)}
              aria-describedby={state?.errors?.password ? `${fieldId}-password-error` : undefined}
              className="h-11 w-full rounded-md border border-slate-300 bg-canvas pl-3 pr-12 text-body text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
            />
            <button
              type="button"
              onClick={() => setPasswordVisible((value) => !value)}
              aria-label={passwordVisible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              aria-pressed={passwordVisible}
              className="absolute inset-y-0 right-0 flex h-11 w-11 items-center justify-center rounded-r-md text-slate-500 transition-colors hover:text-ink focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
            >
              {passwordVisible ? (
                <IconEyeOff className="h-3.5 w-3.5" />
              ) : (
                <IconEye className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          {state?.errors?.password ? (
            <p id={`${fieldId}-password-error`} className="mt-1 text-meta text-danger">
              {state.errors.password}
            </p>
          ) : null}
        </div>
      </div>

      <label className="mt-1.5 flex min-h-11 cursor-pointer items-center gap-3 text-[12px] text-ink-soft">
        <input
          type="checkbox"
          name="rememberMe"
          value="on"
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          className="h-[18px] w-[18px] shrink-0 cursor-pointer rounded-sm accent-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
        />
        <span>Ingat sesi perangkat ini selama 7 hari</span>
      </label>

      <SubmitButton />

      <p className="mt-auto pt-5 text-meta text-ink-soft">
        Hak Cipta &copy; 2026 CV. Mobil Juragan Express Transport
      </p>
    </form>
  );
}
