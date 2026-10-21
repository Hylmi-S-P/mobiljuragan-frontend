"use client";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/PageLayout";
import { formatRupiah } from "@/lib/format";
import { AMOUNT_PLACEHOLDER } from "@/lib/uiText";
import type { CanonicalBookingStatus, LineItem } from "@/lib/types";

type Props = {
  items: LineItem[];
  quotedAmount: number;
  rawStatus: CanonicalBookingStatus;
  canDecide: boolean;
  onOpenSurcharge: () => void;
  onRemoveSurcharge: (itemId: string) => void;
};

export function BillingLineItemsCard({
  items,
  quotedAmount,
  rawStatus,
  canDecide,
  onOpenSurcharge,
  onRemoveSurcharge,
}: Props) {
  const isTariffDecided = rawStatus !== "CREATED" && rawStatus !== "PENDING_CONFIRMATION";

  return (
    <Panel
      title="Rincian Tagihan & Penyesuaian Biaya"
      action={
        canDecide ? (
          <Button variant="outline" size="sm" onClick={onOpenSurcharge}>
            + Tambah Surcharge Manual
          </Button>
        ) : null
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-meta">
          <thead>
            <tr className="border-b border-rule text-micro font-bold uppercase tracking-wider text-ink-soft">
              <th scope="col" className="py-2.5 pr-4">
                Komponen Biaya &amp; Justifikasi
              </th>
              <th scope="col" className="py-2.5 px-4 text-center">
                Durasi / Satuan
              </th>
              <th scope="col" className="py-2.5 pl-4 text-right">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule/60">
            {items.map((item) => {
              const isManualSurcharge = item.id.startsWith("li-");
              const isSupirBreakdown = item.id.includes("supir-breakdown");

              // Kalkulasi tampilan nominal per baris
              let subtotalDisplay = AMOUNT_PLACEHOLDER;
              if (isSupirBreakdown) {
                subtotalDisplay = "Termasuk Paket";
              } else if (isManualSurcharge) {
                const raw = item.amount ?? "";
                const isNegative = raw.startsWith("-");
                const numeric = Number(raw.replace(/[^\d]/g, "")) || 0;
                subtotalDisplay = `${isNegative ? "-" : "+"} ${formatRupiah(numeric)}`;
              } else if (isTariffDecided) {
                subtotalDisplay = formatRupiah(quotedAmount);
              }

              return (
                <tr key={item.id} className="hover:bg-canvas/50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ink">{item.label}</p>
                        {item.note ? (
                          <p className="mt-0.5 text-micro text-ink-soft">{item.note}</p>
                        ) : null}
                      </div>
                      {isManualSurcharge && canDecide ? (
                        <button
                          type="button"
                          onClick={() => onRemoveSurcharge(item.id)}
                          className="shrink-0 text-micro text-danger hover:underline ml-2"
                          title="Hapus baris penyesuaian biaya"
                        >
                          Hapus
                        </button>
                      ) : null}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center tabular-nums text-ink-soft">
                    {item.note?.match(/\d+\s*(hari|jam)/i)?.[0] ?? "1 Paket"}
                  </td>

                  <td
                    className={`py-3 pl-4 text-right tabular-nums font-semibold ${
                      isManualSurcharge
                        ? item.amount?.startsWith("-")
                          ? "text-emerald-700"
                          : "text-ink"
                        : "text-ink"
                    }`}
                  >
                    {subtotalDisplay}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule/60 pt-3 text-micro text-ink-soft">
        <p>
          Tarif dasar mencakup armada dan operasional. Surcharge manual dapat ditambahkan untuk penyesuaian rute luar kota, overtime, atau BBM tambahan.
        </p>
        {canDecide ? (
          <Button variant="outline" size="sm" onClick={onOpenSurcharge}>
            + Tambah Surcharge Manual
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}
