"use client";

import { useState } from "react";
import { logoutAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { IconLogout } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function LogoutConfirmModal({ open, onClose }: Props) {
  const [isPending, setIsPending] = useState(false);

  if (!open) return null;

  async function handleLogout() {
    setIsPending(true);
    await logoutAction();
  }

  return (
    <Modal
      open
      onClose={isPending ? () => {} : onClose}
      title="Konfirmasi Keluar Akun"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button variant="danger" onClick={handleLogout} disabled={isPending}>
            <IconLogout className="h-4 w-4" />
            {isPending ? "Mengakhiri Sesi..." : "Ya, Keluar"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-body text-ink">
          Apakah Anda yakin ingin mengakhiri sesi kerja dan keluar dari portal admin MobilJuragan?
        </p>
        <div className="rounded-sm border border-rule bg-canvas p-3 text-meta text-ink-soft">
          <p>
            Pastikan seluruh perubahan data pesanan atau pembaruan armada telah tersimpan sebelum keluar. Anda perlu masuk kembali menggunakan nomor telepon dan kata sandi untuk mengakses portal ini.
          </p>
        </div>
      </div>
    </Modal>
  );
}
