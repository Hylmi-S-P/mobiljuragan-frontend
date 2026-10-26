"use client";

import React from "react";
import { StatusChip } from "@/components/ui/StatusChip";
import { Toggle } from "@/components/ui/Toggle";
import { IconArrowRight, IconHelpCircle } from "@/components/ui/icons";
import type { FaqItem } from "@/lib/types";

type Props = {
  faqs: FaqItem[];
  onSelectFaq: (faq: FaqItem) => void;
  onToggleActive: (faq: FaqItem) => void;
  isPendingToggle?: boolean;
};

/**
 * FaqCardGrid: Grid kartu modular FAQ menggantikan tabel datar.
 * Memberikan keterbacaan instan di layar mobile dan menghilangkan tombol hapus berbahaya
 * di bagian luar kartu (dipindahkan ke dalam FaqDetailModal dengan konfirmasi 2 tahap).
 */
export function FaqCardGrid({
  faqs,
  onSelectFaq,
  onToggleActive,
  isPendingToggle,
}: Props) {
  if (faqs.length === 0) {
    return (
      <div className="rounded-card border border-rule bg-canvas px-4 py-8 text-center sm:px-6">
        <IconHelpCircle className="mx-auto h-8 w-8 text-ink-soft/60" />
        <p className="mt-2 text-body font-semibold text-ink">Tidak ada FAQ yang ditemukan.</p>
        <p className="mt-1 text-meta text-ink-soft">
          Coba sesuaikan kata kunci pencarian atau pilih kategori lain.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {faqs.map((faq) => {
        return (
          <div
            key={faq.id}
            className="group relative flex flex-col justify-between rounded-card border border-rule bg-surface p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-navy/40 hover:shadow-sm"
          >
            <div>
              {/* Header kartu: kategori dan sakelar visibilitas.

                  Label teks di samping sakelar sengaja tidak ditampilkan.
                  Badge di bagian bawah kartu sudah menyebut "Tayang di Mobile"
                  atau "Disembunyikan", jadi menulis "Mobile: Aktif" di sini
                  hanya mengulang hal yang sama tiga kali dalam satu kartu. */}
              <div className="flex items-center justify-between gap-2 border-b border-rule/50 pb-3">
                <StatusChip tone="neutral">{faq.category}</StatusChip>
                <Toggle
                  checked={faq.isActive}
                  disabled={isPendingToggle}
                  onChange={() => onToggleActive(faq)}
                  labelOn="Aktif"
                  labelOff="Sembunyi"
                  hideLabel
                />
              </div>

              {/* Pertanyaan FAQ */}
              <button
                type="button"
                onClick={() => onSelectFaq(faq)}
                className="mt-3 block w-full text-left focus:outline-none"
              >
                <h4 className="text-subtitle font-bold text-ink group-hover:text-navy transition-colors line-clamp-2">
                  {faq.question}
                </h4>
              </button>

              {/* Cuplikan Jawaban */}
              <p className="mt-2 line-clamp-3 text-meta text-ink-soft leading-relaxed">
                {faq.answer}
              </p>
            </div>

            {/* Footer Aksi: Buka Detail & Kelola */}
            <div className="mt-4 pt-3 border-t border-rule/60 flex items-center justify-between">
              <span className="text-micro text-ink-soft">
                {faq.isActive ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Tayang di Mobile
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-ink-soft">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    Disembunyikan
                  </span>
                )}
              </span>

              <button
                type="button"
                onClick={() => onSelectFaq(faq)}
                className="inline-flex items-center gap-1 text-meta font-semibold text-navy hover:underline focus:outline-none"
              >
                <span>Rincian &amp; Kelola</span>
                <IconArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
