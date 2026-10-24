"use client";

import { useState, useTransition } from "react";

import { saveVehicleAction, deleteVehicleAction } from "@/app/actions";
import { DeleteVehicleModal } from "@/components/modals/DeleteVehicleModal";
import { VehicleFormModal } from "@/components/modals/VehicleFormModal";
import { Button } from "@/components/ui/Button";
import { PlateBadge } from "@/components/ui/PlateBadge";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { IconCar, IconPencil, IconPlus } from "@/components/ui/icons";
import { formatRupiah } from "@/lib/format";
import type { Vehicle } from "@/lib/types";
import { VEHICLE_STATUS } from "@/lib/labels";

type Props = {
  initialVehicles: Vehicle[];
};

export function VehicleCatalogTable({ initialVehicles }: Props) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
  const [formTarget, setFormTarget] = useState<{ vehicleId: string | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const editing = formTarget?.vehicleId
    ? vehicles.find((vehicle) => vehicle.id === formTarget.vehicleId)
    : undefined;
  const deleting = deleteTarget
    ? vehicles.find((vehicle) => vehicle.id === deleteTarget)
    : undefined;

  return (
    <>
      {notice ? (
        <p className="mt-3 rounded-sm border border-rule bg-surface px-3 py-2 text-meta text-ink">
          {notice}
        </p>
      ) : null}

      <div className="mt-3">
        <Panel
          title="Katalog &amp; Spesifikasi Armada"
          icon={<IconCar />}
          action={
            <div className="flex items-center gap-3">
              {/* Switch Mode Grid vs Table */}
              <div className="flex items-center rounded-sm border border-rule bg-canvas p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-xs px-2.5 py-1 text-meta font-medium ${
                    viewMode === "grid"
                      ? "bg-surface font-semibold text-ink shadow-xs"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Kartu Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`rounded-xs px-2.5 py-1 text-meta font-medium ${
                    viewMode === "table"
                      ? "bg-surface font-semibold text-ink shadow-xs"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Tabel
                </button>
              </div>

              <Button
                variant="confirm"
                size="md"
                onClick={() => setFormTarget({ vehicleId: null })}
              >
                <IconPlus className="h-4 w-4" />
                Tambah Armada
              </Button>
            </div>
          }
        >
          {viewMode === "grid" ? (
            /* Tampilan Kartu Grid Visual */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex flex-col justify-between rounded-lg border border-rule bg-surface p-4 shadow-card hover:border-navy/40 transition-all"
                >
                  <div>
                    {/* Header Kartu: Nama & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-body font-bold text-ink">{vehicle.name}</h3>
                        <PlateBadge plate={vehicle.plate} className="mt-1" />
                      </div>
                      <StatusChip tone={VEHICLE_STATUS[vehicle.status].tone}>
                        {VEHICLE_STATUS[vehicle.status].label}
                      </StatusChip>
                    </div>

                    {/* Spesifikasi Ringkas */}
                    <div className="mt-3.5 space-y-1.5 border-t border-rule/60 pt-3 text-meta text-ink-soft">
                      <div className="flex justify-between">
                        <span>Kategori &amp; Rute</span>
                        <span className="font-medium text-ink">
                          {vehicle.category ?? "Standar"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transmisi</span>
                        <span className="font-medium text-ink">{vehicle.transmission ?? "Manual"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kapasitas</span>
                        <span className="font-medium text-ink">{vehicle.seats ? `${vehicle.seats} Kursi` : "7 Kursi"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Kartu: Tarif & Tombol Kelola */}
                  <div className="mt-4 flex items-center justify-between border-t border-rule/60 pt-3">
                    <div>
                      <span className="block text-micro text-ink-soft">Tarif Dasar / Hari</span>
                      <span className="text-body font-bold tabular-nums text-ink">
                        {formatRupiah(vehicle.pricePerDay ?? 400000)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFormTarget({ vehicleId: vehicle.id })}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-rule bg-canvas px-3 py-1.5 text-meta font-medium text-ink hover:border-navy hover:text-navy transition-colors"
                    >
                      <IconPencil className="h-3.5 w-3.5" />
                      Kelola
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Tampilan Tabel Ringkas */
            <Table caption="Katalog armada resmi MobilJuragan">
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="w-[300px]">Kendaraan &amp; Plat</TableHeaderCell>
                  <TableHeaderCell className="w-[180px]">Tarif Sewa / Hari</TableHeaderCell>
                  <TableHeaderCell className="w-[160px]">Transmisi &amp; Kursi</TableHeaderCell>
                  <TableHeaderCell className="w-[140px]">Ketersediaan</TableHeaderCell>
                  <TableHeaderCell className="w-[100px] text-right">Aksi</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id} className="hover:bg-canvas/50">
                    <TableCell className="text-left">
                      <span className="block whitespace-nowrap text-body font-semibold text-ink">
                        {vehicle.name}
                      </span>
                      <div className="mt-1 flex items-center gap-2">
                        <PlateBadge plate={vehicle.plate} />
                        <span className="text-micro text-ink-soft">
                          {vehicle.category ?? "Standar"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-body tabular-nums font-semibold text-ink">
                      {formatRupiah(vehicle.pricePerDay ?? 400000)}
                      <span className="block text-micro font-normal text-ink-soft">/ hari</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-body">
                      {vehicle.transmission ?? "Manual"} &bull; {vehicle.seats ? `${vehicle.seats} Kursi` : "7 Kursi"}
                    </TableCell>
                    <TableCell>
                      <StatusChip tone={VEHICLE_STATUS[vehicle.status].tone}>
                        {VEHICLE_STATUS[vehicle.status].label}
                      </StatusChip>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => setFormTarget({ vehicleId: vehicle.id })}
                        className="inline-flex items-center gap-1 rounded-sm border border-rule bg-canvas px-2.5 py-1 text-meta font-medium text-ink hover:border-navy hover:text-navy transition-colors"
                      >
                        <IconPencil className="h-3 w-3" />
                        <span>Kelola</span>
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>

      {formTarget ? (
        <VehicleFormModal
          vehicle={editing}
          existingPlates={vehicles
            .filter((vehicle) => vehicle.id !== editing?.id)
            .map((vehicle) => vehicle.plate)}
          onClose={() => setFormTarget(null)}
          onRequestDelete={(vehicleId) => {
            setFormTarget(null);
            setDeleteTarget(vehicleId);
          }}
          onSave={(saved) => {
            // Optimistic UI update
            setVehicles((current) => {
              const exists = current.some((vehicle) => vehicle.id === saved.id);
              return exists
                ? current.map((vehicle) => (vehicle.id === saved.id ? saved : vehicle))
                : [...current, saved];
            });
            setNotice(
              editing
                ? `Menyimpan perubahan unit ${saved.name}...`
                : `Menambahkan unit ${saved.name}...`,
            );
            setFormTarget(null);

            startTransition(async () => {
              const res = await saveVehicleAction(saved);
              if (res.success) {
                setNotice(res.message ?? "Data armada berhasil disimpan ke database.");
              } else {
                setNotice(`Perhatian: ${res.message ?? "Gagal menyimpan ke server backend."}`);
              }
            });
          }}
        />
      ) : null}

      {deleting ? (
        <DeleteVehicleModal
          vehicle={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            const targetId = deleting.id;
            const targetName = deleting.name;
            setVehicles((current) => current.filter((vehicle) => vehicle.id !== targetId));
            setNotice(`Menghapus unit ${targetName}...`);
            setDeleteTarget(null);

            startTransition(async () => {
              const res = await deleteVehicleAction(targetId);
              if (res.success) {
                setNotice(res.message ?? `Unit ${targetName} dihapus.`);
              } else {
                setNotice(`Perhatian: ${res.message ?? "Gagal menghapus armada."}`);
              }
            });
          }}
        />
      ) : null}
    </>
  );
}
