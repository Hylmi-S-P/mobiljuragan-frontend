"use client";

import { DataField, Panel } from "@/components/ui/PageLayout";
import { PlateBadge } from "@/components/ui/PlateBadge";
import type { Vehicle } from "@/lib/types";

type Props = {
  vehicle: Vehicle;
};

export function VehicleUnitCard({ vehicle }: Props) {
  return (
    <Panel title="Armada yang Dipesan & Kesiapan Unit">
      <div className="flex items-center gap-3.5">
        {/* Unit Visual Silhouette / Category Box */}
        <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-md border border-rule bg-canvas text-center">
          <span className="text-micro font-bold uppercase tracking-wider text-teal">
            {vehicle.category ?? "Armada"}
          </span>
        </div>

        <div className="min-w-0">
          <h3 className="text-body font-bold text-ink">{vehicle.name}</h3>
          <div className="mt-1">
            <PlateBadge plate={vehicle.plate} region="Merauke" size="md" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3.5 border-t border-rule/50 pt-3.5 grid-cols-2 sm:grid-cols-4">
        <DataField label="Kategori unit">
          {vehicle.category ?? "Multi-Purpose Vehicle"}
        </DataField>
        <DataField label="Transmisi">
          {vehicle.transmission ?? "Manual"}
        </DataField>
        <DataField label="Kapasitas">
          {vehicle.seats ? `${vehicle.seats} Kursi` : "7 Kursi"}
        </DataField>
        <DataField label="Lokasi unit">
          Kantor Merauke
        </DataField>
      </div>
    </Panel>
  );
}
