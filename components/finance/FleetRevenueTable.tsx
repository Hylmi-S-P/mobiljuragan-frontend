"use client";

import { PlateBadge } from "@/components/ui/PlateBadge";
import { formatRupiah } from "@/lib/format";
import type { FinanceSummary } from "@/lib/operations";

type Props = {
  fleetBreakdown: FinanceSummary["fleetBreakdown"];
  periodeLabel?: string;
};

/**
 * FleetRevenueTable: Grid kartu modular pendapatan per unit armada CV. Mobil Juragan Merauke.
 */
export function FleetRevenueTable({ fleetBreakdown, periodeLabel }: Props) {
  return (
    <div className="rounded-card border border-rule bg-surface p-4 sm:p-5 shadow-xs">
      {/* Header Section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-rule pb-4">
        <div>
          <h3 className="text-subtitle font-bold text-ink">Pendapatan per Unit Armada</h3>
          <p className="text-meta text-ink-soft">
            Performa pemasukan tiap unit kendaraan
            {periodeLabel ? ` (${periodeLabel.toLowerCase()})` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {periodeLabel ? (
            <span className="rounded-sm border border-rule bg-canvas px-2.5 py-1 text-micro font-medium text-ink-soft">
              {periodeLabel}
            </span>
          ) : null}
          <span className="text-micro font-semibold text-ink-soft bg-canvas px-2.5 py-1 rounded-sm border border-rule shrink-0">
            {fleetBreakdown.length} Unit Armada
          </span>
        </div>
      </div>

      {fleetBreakdown.length === 0 ? (
        <div className="mt-4 rounded-sm border border-rule/80 bg-canvas/60 px-4 py-8 text-center">
          <p className="text-body font-semibold text-ink">Belum ada data armada</p>
          <p className="mt-1 text-meta text-ink-soft">
            Unit kendaraan yang terdaftar akan tampil beserta rincian pemasukannya di sini.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fleetBreakdown.map((unit) => (
            <div
              key={unit.vehicleId}
              className="group relative flex flex-col justify-between rounded-card border border-rule bg-surface p-4 shadow-xs transition-all duration-200 hover:border-navy/40 hover:shadow-sm"
            >
              <div>
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

                <div className="mt-3.5 rounded-sm border border-rule/60 bg-canvas/50 p-3">
                  <span className="block text-micro font-medium text-ink-soft uppercase tracking-wider">
                    Total Pemasukan
                  </span>
                  <p className="text-subtitle font-bold text-ink tabular-nums mt-0.5">
                    {formatRupiah(unit.totalRevenue)}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between text-meta text-ink-soft pt-1">
                  <span>
                    <strong className="text-ink tabular-nums">{unit.completedBookings}</strong> sewa
                    selesai
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
      )}
    </div>
  );
}
