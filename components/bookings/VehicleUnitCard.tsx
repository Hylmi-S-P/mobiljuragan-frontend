"use client";

import { Panel } from "@/components/ui/PageLayout";
import { PlateBadge } from "@/components/ui/PlateBadge";
import type { Vehicle } from "@/lib/types";

type Props = {
  vehicle: Vehicle;
};

/*
 * Bagian "Armada" pada detail pesanan.
 *
 * Dulu kartu ini berjudul "Kendaraan yang Dipilih" dan menampilkan kotak kategori
 * besar, seolah pelanggan baru saja memilih unit di layar ini. Yang dibutuhkan
 * admin hanyalah dua hal: unit apa yang dipakai dan plat nomornya. Sisanya
 * (kategori, transmisi) cukup satu baris kecil.
 */
export function VehicleUnitCard({ vehicle }: Props) {
  return (
    <Panel title="Armada">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-body font-bold text-ink">{vehicle.name}</h3>
          <p className="mt-0.5 text-meta text-ink-soft">
            {vehicle.category ?? "Armada"} · Transmisi {vehicle.transmission ?? "Manual"}
          </p>
        </div>

        <PlateBadge plate={vehicle.plate} region="Merauke" size="md" />
      </div>
    </Panel>
  );
}
