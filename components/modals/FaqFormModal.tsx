"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { createFaqAction, updateFaqAction, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { AutoGrowTextarea } from "@/components/ui/AutoGrowTextarea";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { FAQ_CATEGORY_PRESETS } from "@/lib/labels";
import type { FaqItem } from "@/lib/types";

type Props = {
  faq?: FaqItem;
  existingCategories?: string[];
  onClose: () => void;
  onSave?: (saved: FaqItem) => void;
};

function ModalSubmitButton({ isEdit, formId }: { isEdit: boolean; formId: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" form={formId} variant="confirm" disabled={pending}>
      {pending
        ? isEdit
          ? "Menyimpan..."
          : "Menambahkan..."
        : isEdit
          ? "Simpan Perubahan"
          : "Tambah FAQ"}
    </Button>
  );
}

export function FaqFormModal({ faq, existingCategories = [], onClose, onSave }: Props) {
  const fieldId = useId();
  const formId = `${fieldId}-faq-form`;
  const isEdit = Boolean(faq);

  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");

  // Kategori: cek apakah nilai awal cocok dengan salah satu preset
  const allKnownCategories = Array.from(
    new Set([...FAQ_CATEGORY_PRESETS, ...existingCategories.filter(Boolean)]),
  );
  const initialCategoryMatches = faq?.category ? allKnownCategories.includes(faq.category) : true;

  const [categorySelect, setCategorySelect] = useState<string>(
    faq?.category ? (initialCategoryMatches ? faq.category : "__custom__") : FAQ_CATEGORY_PRESETS[0],
  );
  const [customCategory, setCustomCategory] = useState<string>(
    faq?.category && !initialCategoryMatches ? faq.category : "",
  );

  const [orderIndex, setOrderIndex] = useState<number>(faq?.orderIndex ?? 0);
  const [isActive, setIsActive] = useState<boolean>(faq?.isActive ?? true);

  const actionFn = isEdit ? updateFaqAction : createFaqAction;
  const [state, formAction] = useActionState<ActionState & { data?: FaqItem }, FormData>(
    actionFn,
    null as unknown as ActionState & { data?: FaqItem },
  );

  useEffect(() => {
    if (state?.success) {
      if (state.data) {
        onSave?.(state.data);
      }
      onClose();
    }
  }, [state, onClose, onSave]);

  const activeCategoryValue = categorySelect === "__custom__" ? customCategory.trim() : categorySelect;

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Edit Pertanyaan FAQ" : "Tambah FAQ Baru"}
      description="Pertanyaan yang aktif akan langsung muncul pada Pusat Bantuan aplikasi mobile dan diintegrasikan ke basis pengetahuan AI chatbot."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <ModalSubmitButton isEdit={isEdit} formId={formId} />
        </>
      }
    >
      <form id={formId} action={formAction} className="space-y-4">
        {faq ? <input type="hidden" name="id" value={faq.id} /> : null}
        <input type="hidden" name="category" value={activeCategoryValue} />
        <input type="hidden" name="isActive" value={String(isActive)} />
        <input type="hidden" name="orderIndex" value={String(orderIndex)} />

        {state?.message && !state?.success ? (
          <div
            role="alert"
            className="rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-meta text-danger"
          >
            {state.message}
          </div>
        ) : null}

        {/* Pertanyaan */}
        <div>
          <label htmlFor={`${fieldId}-question`} className="block text-meta font-medium text-ink">
            Pertanyaan <span className="text-danger">*</span>
          </label>
          <AutoGrowTextarea
            maxHeight={160}
            id={`${fieldId}-question`}
            name="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            aria-invalid={Boolean(state?.errors?.question)}
            aria-describedby={state?.errors?.question ? `${fieldId}-question-error` : undefined}
            className="mt-1 w-full rounded-sm border border-rule-strong bg-canvas px-3 py-2 text-body text-ink placeholder:text-ink-soft focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            placeholder="Contoh: Bagaimana prosedur sewa lepas kunci di MobilJuragan Merauke?"
            required
          />
          {state?.errors?.question ? (
            <p id={`${fieldId}-question-error`} className="mt-1 text-meta text-danger">
              {state.errors.question}
            </p>
          ) : null}
        </div>

        {/* Jawaban */}
        <div>
          <label htmlFor={`${fieldId}-answer`} className="block text-meta font-medium text-ink">
            Jawaban Lengkap <span className="text-danger">*</span>
          </label>
          <AutoGrowTextarea
            id={`${fieldId}-answer`}
            name="answer"
            rows={4}
            maxHeight={320}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            aria-invalid={Boolean(state?.errors?.answer)}
            aria-describedby={state?.errors?.answer ? `${fieldId}-answer-error` : undefined}
            className="mt-1 w-full rounded-sm border border-rule-strong bg-canvas px-3 py-2 text-body text-ink placeholder:text-ink-soft focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            placeholder="Tuliskan jawaban yang rinci, ramah, dan solutif bagi pelanggan..."
            required
          />
          {state?.errors?.answer ? (
            <p id={`${fieldId}-answer-error`} className="mt-1 text-meta text-danger">
              {state.errors.answer}
            </p>
          ) : null}
        </div>

        {/* Kategori (Preset Dropdown + Custom Input) */}
        <div>
          <label htmlFor={`${fieldId}-category-select`} className="block text-meta font-medium text-ink">
            Kategori FAQ <span className="text-danger">*</span>
          </label>
          <select
            id={`${fieldId}-category-select`}
            value={categorySelect}
            onChange={(e) => setCategorySelect(e.target.value)}
            className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          >
            <optgroup label="Preset Kategori Resmi">
              {FAQ_CATEGORY_PRESETS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </optgroup>
            {existingCategories.filter((c) => !(FAQ_CATEGORY_PRESETS as readonly string[]).includes(c)).length > 0 ? (
              <optgroup label="Kategori Tersimpan Lainnya">
                {existingCategories
                  .filter((c) => !(FAQ_CATEGORY_PRESETS as readonly string[]).includes(c))
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </optgroup>
            ) : null}
            <option value="__custom__">+ Kategori Kustom Baru...</option>
          </select>
        </div>

        {/* Input Kategori Kustom jika dipilih */}
        {categorySelect === "__custom__" ? (
          <div>
            <label htmlFor={`${fieldId}-custom-category`} className="block text-meta font-medium text-ink">
              Nama Kategori Kustom <span className="text-danger">*</span>
            </label>
            <input
              id={`${fieldId}-custom-category`}
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Contoh: Protokol Luar Kota"
              className="mt-1 h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              required
            />
            {state?.errors?.category ? (
              <p className="mt-1 text-meta text-danger">{state.errors.category}</p>
            ) : null}
          </div>
        ) : null}

        {/* Sakelar Visibilitas Mobile */}
        <div className="rounded-sm border border-rule bg-canvas p-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-meta font-medium text-ink">Tampilkan di Aplikasi Mobile</p>
              <p className="text-micro text-ink-soft">
                Aktifkan agar FAQ ini dapat dibaca oleh pelanggan di Help Center mobile Flutter.
              </p>
            </div>
            <Toggle
              checked={isActive}
              onChange={(next) => setIsActive(next)}
              labelOn="Tampil"
              labelOff="Sembunyi"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
