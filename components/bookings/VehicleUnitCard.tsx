"use client";

import { DataField, Panel } from "@/components/ui/PageLayout";
import { PlateBadge } from "@/components/ui/PlateBadge";
import { StatusChip } from "@/components/ui/StatusChip";
import type { Vehicle } from "@/lib/types";

type Props = {
  vehicle: Vehicle;
};

export function VehicleUnitCard({ vehicle }: Props) {
  const isAvailable = vehicle.status === "tersedia";
  const isRented = vehicle.status === "disewa";
  const isService = vehicle.status === "servis";

  return (
    <Panel
      title="Armada yang Dipesan & Kesiapan Unit"
      action={
        <StatusChip
          tone={
            isAvailable
              ? "available"
              : isRented
                ? "busy"
                : isService
                  ? "service"
                  : "danger"
          }
        >
          {isAvailable
            ? "Unit siap di pool Merauke"
            : isRented
              ? "Sedang disewa"
              : isService
                ? "Dalam perawatan"
                : "Tidak tersedia"}
        </StatusChip>
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          {/* Unit Visual Silhouette / Category Box */}
          <div className="flex h-16 w-20 shrink-0 flex-col items-center justify-center rounded-md border border-rule bg-canvas text-center">
            <span className="text-micro font-bold uppercase tracking-wider text-teal">
              {vehicle.category ?? "Armada"}
            </span>
            <span className="mt-0.5 text-[10px] text-ink-soft">MobilJuragan</span>
          </div>

          <div className="min-w-0">
            <h3 className="text-body font-bold text-ink">{vehicle.name}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <PlateBadge plate={vehicle.plate} region="Merauke" size="md" />
              <span className="inline-flex items-center rounded-sm border border-rule bg-canvas px-2 py-0.5 text-micro font-medium text-ink-soft">
                {vehicle.transmission ?? "Manual"}
              </span>
              <span className="inline-flex items-center rounded-sm border border-rule bg-canvas px-2 py-0.5 text-micro font-medium text-ink-soft">
                {vehicle.seats ? `${vehicle.seats} Kursi` : "7 Kursi"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3.5 border-t border-rule/50 pt-3.5 sm:grid-cols-3">
        <DataField label="Kategori unit">
          {vehicle.category ?? "Multi-Purpose Vehicle"}
        </DataField>
        <DataField label="Transmisi">
          {vehicle.transmission ?? "Manual"}
        </DataField>
        <DataField label="Kapasitas penumpang">
          {vehicle.seats ? `${vehicle.seats} Penumpang` : "7 Penumpang"}
        </DataField>
      </div>

      {/* Pool Readiness Information Box */}
      <div className="mt-3.5 rounded-sm border border-rule bg-canvas p-3">
        <div className="flex items-start gap-2">
          <span className="text-teal font-bold">&#9679;</span>
          <div>
            <p className="text-micro font-bold uppercase text-ink-soft">
              Kesiapan Fisik &amp; Kelayakan Operasional
            </p>
            <p className="mt-0.5 text-meta text-ink">
              {isAvailable
                ? "Kebersihan interior, kelayakan ban, oli, dan toolkit darurat terverifikasi siap serah terima di kantor MobilJuragan Merauke."
                : isRented
                  ? "Unit sedang beroperasi di lapangan, terjadwal kembali sebelum waktu serah terima."
                  : isService
                    ? "Unit sedang dalam inspeksi perawatan berkala di bengkel rekanan resmi."
                    : "Unit saat ini dalam pembaruan berkas administrasi operasional."}
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
