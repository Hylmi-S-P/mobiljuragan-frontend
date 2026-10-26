"use client";

import { PlateBadge } from "@/components/ui/PlateBadge";
import { formatRupiah } from "@/lib/format";
import type { FinanceSummary } from "@/lib/operations";

type Props = {
  fleetBreakdown: FinanceSummary["fleetBreakdown"];
};

/**
 * FleetRevenueTable: Grid kartu modular pendapatan per unit armada CV. Mobil Juragan Merauke.
 *
 * Persentase kontribusi tiap unit sengaja tidak ditampilkan. Angka itu tidak dipakai
 * mengambil keputusan apa pun, sedangkan total omzet unitnya sudah tertera jelas.
 * Yang tetap ada: nama unit, plat, kategori, total omzet, jumlah sewa selesai, dan
 * penanda sewa aktif.
 */
export function FleetRevenueTable({ fleetBreakdown }: Props) {
  return (
    <div className="rounded-card border border-rule bg-surface p-4 sm:p-5 shadow-xs">
      {/* Header Section */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-rule pb-4">
        <div>
          <h3 className="text-subtitle font-bold text-ink">Pendapatan per Unit Armada</h3>
          <p className="text-meta text-ink-soft">
            Rincian performa finansial 9 unit kendaraan operasional resmi MobilJuragan Merauke.
          </p>
        </div>
        <span className="text-micro font-semibold text-ink-soft bg-canvas px-2.5 py-1 rounded-sm border border-rule shrink-0 self-start sm:self-auto">
          {fleetBreakdown.length} Unit Armada Terdaftar
        </span>
      </div>

      {/* Grid Kartu Performa Armada */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fleetBreakdown.map((unit) => (
          <div
            key={unit.vehicleId}
            className="group relative flex flex-col justify-between rounded-card border border-rule bg-surface p-4 shadow-xs transition-all duration-200 hover:border-navy/40 hover:shadow-sm"
          >
            <div>
              {/* Header Kartu: Nama & Kategori */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="block font-semibold text-ink text-body truncate">
                    {unit.name}
                  </span>
                  <PlateBadge plate={unit.licensePlate} className="mt-1" />
                </div>
                <span className="rounded-badge bg-canvas border border-rule px-2 py-0.5 text-micro font-medium text-ink-soft shrink-0">
                  {unit.category ?? "REGULER"}
                </span>
              </div>

              {/* Hero Omzet Unit */}
              <div className="mt-3.5 rounded-sm border border-rule/60 bg-canvas/50 p-3">
                <span className="block text-micro font-medium text-ink-soft uppercase tracking-wider">
                  Total Omzet
                </span>
                <p className="text-subtitle font-bold text-ink tabular-nums mt-0.5">
                  {formatRupiah(unit.totalRevenue)}
                </p>
              </div>

              {/* Status Transaksi Selesai & Sedang Aktif */}
              <div className="mt-3 flex items-center justify-between text-meta text-ink-soft pt-1">
                <span>
                  <strong className="text-ink tabular-nums">{unit.completedBookings}</strong> sewa selesai
                </span>
                <div>
                  {unit.activeBookings > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-micro font-semibold text-blue-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      {unit.activeBookings} Aktif
                    </span>
                  ) : (
                    <span className="text-micro text-ink-soft">Tidak ada sewa aktif</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}