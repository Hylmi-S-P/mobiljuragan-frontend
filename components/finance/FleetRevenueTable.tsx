"use client";

import { PlateBadge } from "@/components/ui/PlateBadge";
import { CircularProgressRing } from "@/components/ui/CircularProgressRing";
import { IconCar } from "@/components/ui/icons";
import { formatRupiah } from "@/lib/format";
import type { FinanceSummary } from "@/lib/operations";

type Props = {
  fleetBreakdown: FinanceSummary["fleetBreakdown"];
};

/**
 * FleetRevenueTable: Grid kartu modular kontribusi omzet armada CV. Mobil Juragan Merauke.
 * Menggantikan tabel datar horizontal yang terpotong di layar ponsel, menyajikan
 * rasio performa finansial per unit kendaraan dengan kontras jelas dan progres kontribusi.
 */
export function FleetRevenueTable({ fleetBreakdown }: Props) {
  // Hitung total omzet seluruh armada untuk kalkulasi persentase kontribusi
  const totalFleetRevenue = fleetBreakdown.reduce((acc, u) => acc + u.totalRevenue, 0) || 1;

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
        {fleetBreakdown.map((unit) => {
          const sharePercentage = Math.round((unit.totalRevenue / totalFleetRevenue) * 100);

          return (
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

                {/* Hero Omzet Unit & Circular Contribution Ring */}
                <div className="mt-3.5 flex items-center justify-between gap-3 rounded-sm border border-rule/60 bg-canvas/50 p-3">
                  <div>
                    <span className="block text-micro font-medium text-ink-soft uppercase tracking-wider">
                      Total Omzet
                    </span>
                    <p className="text-subtitle font-bold text-ink tabular-nums mt-0.5">
                      {formatRupiah(unit.totalRevenue)}
                    </p>
                  </div>
                  <CircularProgressRing
                    value={sharePercentage}
                    size={42}
                    strokeWidth={4}
                    color="#0e7c7b"
                    label={`Porsi ${sharePercentage}%`}
                  />
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

              {/* Progress Bar Porsi ke Total Omzet */}
              <div className="mt-3.5 pt-2.5 border-t border-rule/60">
                <div className="flex items-center justify-between text-micro text-ink-soft mb-1">
                  <span>Porsi dari total armada</span>
                  <span className="font-semibold text-ink tabular-nums">{sharePercentage}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas border border-rule/60">
                  <div
                    className="h-full bg-teal transition-all duration-500 rounded-full"
                    style={{ width: `${sharePercentage > 0 ? Math.max(sharePercentage, 3) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
