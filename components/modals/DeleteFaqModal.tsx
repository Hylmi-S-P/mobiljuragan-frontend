"use client";

import { useActionState, useEffect, useId } from "react";
import { useFormStatus } from "react-dom";
import { deleteFaqAction, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { FaqItem } from "@/lib/types";

type Props = {
  faq: FaqItem;
  onClose: () => void;
  onDeleted?: (id: string) => void;
};

function ConfirmDeleteButton({ formId }: { formId: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" form={formId} variant="danger" disabled={pending}>
      {pending ? "Menghapus..." : "Ya, Hapus FAQ"}
    </Button>
  );
}

export function DeleteFaqModal({ faq, onClose, onDeleted }: Props) {
  const fieldId = useId();
  const formId = `${fieldId}-delete-faq-form`;
  const [state, formAction] = useActionState<ActionState | null, FormData>(deleteFaqAction, null);

  useEffect(() => {
    if (state?.success) {
      onDeleted?.(faq.id);
      onClose();
    }
  }, [state, faq.id, onClose, onDeleted]);

  return (
    <Modal
      open
      onClose={onClose}
      title="Hapus Pertanyaan FAQ?"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Batal
          </Button>
          <ConfirmDeleteButton formId={formId} />
        </>
      }
    >
      <form id={formId} action={formAction}>
        <input type="hidden" name="id" value={faq.id} />
      </form>

      <p className="text-body text-ink">
        FAQ berikut akan dihapus secara permanen dari basis data:
      </p>

      <div className="mt-2.5 rounded-sm border border-rule bg-canvas p-3">
        <p className="text-meta font-semibold text-ink">{faq.question}</p>
        <p className="mt-1 line-clamp-2 text-micro text-ink-soft">{faq.answer}</p>
        <span className="mt-2 inline-block rounded-xs bg-navy/10 px-2 py-0.5 text-micro font-medium text-navy">
          Kategori: {faq.category}
        </span>
      </div>

      {state?.message && !state?.success ? (
        <p
          role="alert"
          className="mt-3 rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-meta text-danger"
        >
          {state.message}
        </p>
      ) : null}

      <p className="mt-3 rounded-sm border border-rule bg-canvas px-3 py-2 text-meta text-ink-soft">
        Setelah dihapus, pertanyaan ini tidak lagi muncul di aplikasi mobile pelanggan dan tidak
        diikutsertakan dalam konteks AI Assistant.
      </p>
    </Modal>
  );
}
