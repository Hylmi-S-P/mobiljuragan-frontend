import { PlateBadge } from "@/components/ui/PlateBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatRupiah } from "@/lib/format";
import type { FinanceSummary } from "@/lib/operations";

type Props = {
  fleetBreakdown: FinanceSummary["fleetBreakdown"];
  totalRevenue: number;
};

export function FleetRevenueTable({ fleetBreakdown, totalRevenue }: Props) {
  return (
    <div className="rounded-card border border-rule bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-rule pb-4">
        <div>
          <h3 className="text-body font-semibold text-ink">Kontribusi Pendapatan per Unit Armada</h3>
          <p className="text-meta text-ink-soft">
            Rincian performa finansial dari 9 unit kendaraan operasional resmi MobilJuragan Merauke.
          </p>
        </div>
        <span className="text-micro font-medium text-ink-soft">
          {fleetBreakdown.length} Unit Armada Terdaftar
        </span>
      </div>

      <div className="mt-4">
        <Table caption="Tabel kontribusi omzet per unit armada">
          <TableHead>
            <TableRow>
              <TableHeaderCell className="w-[280px]">Unit Kendaraan</TableHeaderCell>
              <TableHeaderCell className="w-[140px]">Kategori</TableHeaderCell>
              <TableHeaderCell className="w-[140px] text-center">Sewa Selesai</TableHeaderCell>
              <TableHeaderCell className="w-[140px] text-center">Sedang Aktif</TableHeaderCell>
              <TableHeaderCell className="w-[180px] text-right">Total Omzet</TableHeaderCell>
              <TableHeaderCell className="w-[120px] text-right">Kontribusi</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fleetBreakdown.map((unit) => {
              const contributionPct =
                totalRevenue > 0 ? Math.round((unit.totalRevenue / totalRevenue) * 100) : 0;

              return (
                <TableRow key={unit.vehicleId}>
                  <TableCell>
                    <span className="block text-body font-semibold text-ink">{unit.name}</span>
                    <PlateBadge plate={unit.licensePlate} className="mt-1" />
                  </TableCell>
                  <TableCell>
                    <span className="rounded-badge bg-canvas px-2 py-0.5 text-micro font-medium text-ink-soft">
                      {unit.category ?? "REGULER"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-medium tabular-nums text-ink">
                    {unit.completedBookings}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {unit.activeBookings > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-micro font-medium text-blue-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        {unit.activeBookings} Aktif
                      </span>
                    ) : (
                      <span className="text-micro text-ink-soft">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-body font-bold text-ink tabular-nums">
                    {formatRupiah(unit.totalRevenue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-canvas border border-rule">
                        <div
                          className="h-full bg-teal rounded-full transition-all"
                          style={{ width: `${Math.min(contributionPct, 100)}%` }}
                        />
                      </div>
                      <span className="font-semibold text-ink text-meta">{contributionPct}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
