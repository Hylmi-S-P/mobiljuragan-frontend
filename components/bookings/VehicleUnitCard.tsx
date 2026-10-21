"use client";

import { Panel } from "@/components/ui/PageLayout";
import { PlateBadge } from "@/components/ui/PlateBadge";
import type { Vehicle } from "@/lib/types";

type Props = {
  vehicle: Vehicle;
};

export function VehicleUnitCard({ vehicle }: Props) {
  return (
    <Panel title="Kendaraan yang Dipilih">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          {/* Unit Visual Category Box */}
          <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-md border border-rule bg-canvas text-center">
            <span className="text-micro font-bold uppercase tracking-wider text-teal">
              {vehicle.category ?? "Armada"}
            </span>
          </div>

          <div className="min-w-0">
            <h3 className="text-body font-bold text-ink">{vehicle.name}</h3>
            <p className="mt-0.5 text-meta text-ink-soft">
              Kategori {vehicle.category ?? "MPV"} • Transmisi {vehicle.transmission ?? "Manual"}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <PlateBadge plate={vehicle.plate} region="Merauke" size="md" />
        </div>
      </div>
    </Panel>
  );
}
