"use client";

import { useId, useState, type ReactNode } from "react";

export type TabItem = {
  id: string;
  label: string;
  /* Angka kecil di sebelah label, dipakai untuk jumlah yang perlu langsung terlihat. */
  badge?: number | string;
};

type Props = {
  items: TabItem[];
  /* Panel per tab, dipetakan berdasarkan id. Semua panel tetap ter-mount dan hanya
     disembunyikan, supaya berpindah tab tidak membuang state di dalamnya. */
  panels: Record<string, ReactNode>;
  defaultTab?: string;
};

/**
 * Pil tab yang bisa dipakai ulang.
 *
 * Sebelumnya tiap halaman menulis sendiri tombol pil-nya. Pola itu berulang di
 * halaman pesanan, AI Hub, dan keuangan, dengan perilaku yang sedikit berbeda.
 * Komponen ini menyatukan polanya sekaligus menjaga agar panel tidak dilepas dari
 * pohon React saat tab tidak aktif.
 */
export function Tabs({ items, panels, defaultTab }: Props) {
  const [aktif, setAktif] = useState<string>(defaultTab ?? items[0]?.id ?? "");
  const dasarId = useId();

  return (
    <div>
      <div
        role="tablist"
        aria-label="Pilihan tampilan"
        className="flex flex-wrap items-center gap-1.5 rounded-md border border-rule bg-canvas p-1"
      >
        {items.map((item) => {
          const terpilih = aktif === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${dasarId}-tab-${item.id}`}
              aria-selected={terpilih}
              aria-controls={`${dasarId}-panel-${item.id}`}
              onClick={() => setAktif(item.id)}
              className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy ${
                terpilih
                  ? "bg-surface font-semibold text-ink shadow-xs"
                  : "text-ink-soft hover:bg-surface/60 hover:text-ink"
              }`}
            >
              {item.label}
              {item.badge !== undefined && item.badge !== 0 ? (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-micro ${
                    terpilih ? "bg-navy/10 font-bold text-navy" : "bg-rule text-ink-soft"
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {items.map((item) => (
          <div
            key={item.id}
            role="tabpanel"
            id={`${dasarId}-panel-${item.id}`}
            aria-labelledby={`${dasarId}-tab-${item.id}`}
            hidden={aktif !== item.id}
          >
            {panels[item.id]}
          </div>
        ))}
      </div>
    </div>
  );
}
