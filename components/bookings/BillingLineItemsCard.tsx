"use client";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/PageLayout";
import { formatRupiah } from "@/lib/format";
import type { LineItem } from "@/lib/types";

type Props = {
  /* Hanya baris penyesuaian manual. Baris sewa dan jasa supir dihitung sistem
     dari katalog, jadi tidak ikut daftar ini dan tidak bisa dihapus staf. */
  items: LineItem[];
  pricePerDay: number | null | undefined;
  dayCount: number;
  isDriverService: boolean;
  driverDailyRate: number;
  /* True hanya bila server sudah menyimpan tarif resmi. Angka perkiraan katalog
     tidak boleh dipakai sebagai penanda bahwa tarif sudah ditetapkan. */
  tarifTerkonfirmasi: boolean;
  totalCleanBill: number;
  canDecide: boolean;
  onOpenSurcharge: () => void;
  onRemoveSurcharge: (itemId: string) => void;
};

/**
 * Rincian komponen biaya satu pesanan.
 *
 * Satu tabel untuk dua tahap: sebelum dan sesudah tarif resmi ditetapkan. Yang
 * membedakan hanya catatan kecil di bawah tabel — bentuknya sengaja sama supaya
 * staf tidak perlu belajar dua tata letak, dan supaya angka yang dibaca di sini
 * selalu angka yang sama dengan total di panel keputusan.
 */
export function BillingLineItemsCard({
  items,
  pricePerDay,
  dayCount,
  isDriverService,
  driverDailyRate,
  tarifTerkonfirmasi,
  totalCleanBill,
  canDecide,
  onOpenSurcharge,
  onRemoveSurcharge,
}: Props) {
  const hari = dayCount || 1;
  const hargaSewa = pricePerDay ? pricePerDay * hari : 0;
  const jasaSupir = isDriverService ? driverDailyRate * hari : 0;
  const manualItems = items.filter((item) => item.kind === "penyesuaian");

  return (
    <Panel
      title="Komponen Biaya"
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
            {/* Baris sistem: angkanya dari katalog, tidak bisa diubah staf. */}
            <tr className="hover:bg-canvas/50 transition-colors">
              <td className="py-3 pr-4">
                <p className="font-semibold text-ink">Sewa unit</p>
                <p className="mt-0.5 text-micro text-ink-soft">
                  Harga katalog armada, dihitung otomatis.
                </p>
              </td>
              <td className="py-3 px-4 text-center tabular-nums text-ink-soft">
                {pricePerDay ? `${formatRupiah(pricePerDay)}/hari × ${hari} hari` : "—"}
              </td>
              <td className="py-3 pl-4 text-right tabular-nums font-semibold text-ink">
                {pricePerDay ? formatRupiah(hargaSewa) : "Harga katalog belum tersedia"}
              </td>
            </tr>

            {isDriverService ? (
              <tr className="hover:bg-canvas/50 transition-colors">
                <td className="py-3 pr-4">
                  <p className="font-semibold text-ink">Jasa supir</p>
                  <p className="mt-0.5 text-micro text-ink-soft">
                    Tarif supir global, dihitung otomatis.
                  </p>
                </td>
                <td className="py-3 px-4 text-center tabular-nums text-ink-soft">
                  {driverDailyRate > 0
                    ? `${formatRupiah(driverDailyRate)}/hari × ${hari} hari`
                    : "—"}
                </td>
                <td className="py-3 pl-4 text-right tabular-nums font-semibold text-ink">
                  {driverDailyRate > 0 ? formatRupiah(jasaSupir) : "Tarif supir belum dimuat"}
                </td>
              </tr>
            ) : null}

            {/* Baris manual: satu-satunya yang boleh ditambah dan dihapus staf. */}
            {manualItems.map((item) => {
              const raw = item.amount ?? "";
              const isNegative = raw.startsWith("-");
              const numeric = Number(raw.replace(/[^\d]/g, "")) || 0;

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
                      {canDecide ? (
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
                      isNegative ? "text-emerald-700" : "text-ink"
                    }`}
                  >
                    {`${isNegative ? "-" : "+"} ${formatRupiah(numeric)}`}
                  </td>
                </tr>
              );
            })}

            {manualItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-3 text-micro text-ink-soft">
                  Belum ada penyesuaian manual.
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr className="border-t border-rule">
              <td className="py-3 pr-4 text-meta font-bold text-ink" colSpan={2}>
                Total tagihan bersih
              </td>
              <td className="py-3 pl-4 text-right tabular-nums text-subtitle font-bold text-ink">
                {totalCleanBill > 0 ? formatRupiah(totalCleanBill) : "Belum ditetapkan"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {tarifTerkonfirmasi ? null : (
        <p className="mt-2 text-micro text-ink-soft">Harga awal dari katalog.</p>
      )}
    </Panel>
  );
}
