"use client";

import React, { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { Toggle } from "@/components/ui/Toggle";
import { IconAlert, IconPencil, IconTrash } from "@/components/ui/icons";
import { deleteFaqAction } from "@/app/actions";
import type { FaqItem } from "@/lib/types";

type Props = {
  faq: FaqItem;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (faq: FaqItem) => void;
  onToggleActive?: (faq: FaqItem) => void;
  onDeleted: (id: string) => void;
};

/**
 * FaqDetailModal: Modal rincian lengkap untuk membaca seluruh isi pertanyaan dan jawaban FAQ,
 * mengubah visibilitas mobile, memicu edit, dan menghapus dengan konfirmasi dua tahap yang aman.
 */
export function FaqDetailModal({
  faq,
  isOpen,
  onClose,
  onEdit,
  onToggleActive,
  onDeleted,
}: Props) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = () => {
    startDeleteTransition(async () => {
      setErrorMessage(null);
      const formData = new FormData();
      formData.append("id", faq.id);
      const res = await deleteFaqAction(null, formData);
      if (res?.success) {
        onDeleted(faq.id);
        onClose();
      } else {
        setErrorMessage(res?.message || "Gagal menghapus FAQ.");
      }
    });
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Rincian FAQ & Basis Pengetahuan"
      description="Periksa konten lengkap panduan pelanggan, status visibilitas mobile, atau lakukan pembaruan."
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {!showConfirmDelete ? (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-meta font-medium text-danger hover:bg-danger/10 transition-colors"
            >
              <IconTrash className="h-4 w-4" />
              <span>Hapus FAQ</span>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowConfirmDelete(false);
                onClose();
              }}
            >
              Tutup
            </Button>
            <Button
              type="button"
              variant="confirm"
              onClick={() => {
                onClose();
                onEdit(faq);
              }}
            >
              <IconPencil className="h-4 w-4" />
              <span>Edit Konten</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Banner Konfirmasi 2-Tahap Hapus FAQ */}
        {showConfirmDelete ? (
          <div className="rounded-md border border-danger/40 bg-danger/10 p-4 transition-all">
            <div className="flex items-start gap-3">
              <IconAlert className="h-5 w-5 shrink-0 text-danger mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-body font-semibold text-danger">
                  Konfirmasi Hapus Permanen
                </p>
                <p className="mt-1 text-meta text-ink">
                  Apakah Anda yakin ingin menghapus pertanyaan FAQ ini? Data yang terhapus tidak
                  dapat dikembalikan dan akan langsung dihapus dari aplikasi mobile pelanggan serta
                  konteks AI Assistant.
                </p>

                {errorMessage ? (
                  <p className="mt-2 text-meta font-semibold text-danger">{errorMessage}</p>
                ) : null}

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={isDeleting}
                    onClick={handleDelete}
                  >
                    {isDeleting ? "Menghapus..." : "Ya, Hapus Sekarang"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isDeleting}
                    onClick={() => setShowConfirmDelete(false)}
                  >
                    Batalkan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Status Kategori & Visibilitas Mobile */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-rule bg-canvas p-3">
          <div className="flex items-center gap-2">
            <span className="text-micro font-medium uppercase text-ink-soft">Kategori:</span>
            <StatusChip tone="neutral">{faq.category}</StatusChip>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-micro font-medium text-ink-soft">Tampil di Mobile:</span>
            <Toggle
              checked={faq.isActive}
              onChange={() => onToggleActive?.(faq)}
              labelOn="Aktif"
              labelOff="Sembunyi"
            />
          </div>
        </div>

        {/* Pertanyaan */}
        <div>
          <span className="block text-micro font-semibold uppercase tracking-wider text-ink-soft">
            Pertanyaan Pelanggan
          </span>
          <h4 className="mt-1 text-subtitle font-bold text-ink">{faq.question}</h4>
        </div>

        {/* Jawaban Lengkap */}
        <div>
          <span className="block text-micro font-semibold uppercase tracking-wider text-ink-soft">
            Jawaban Resmi
          </span>
          <div className="mt-1.5 max-h-60 overflow-y-auto rounded-sm border border-rule/70 bg-canvas/40 p-3.5 text-body text-ink whitespace-pre-line leading-relaxed">
            {faq.answer}
          </div>
        </div>
      </div>
    </Modal>
  );
}
