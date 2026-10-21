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
          title="Daftar unit & spesifikasi"
          icon={<IconCar />}
          action={
            <Button variant="confirm" size="md" onClick={() => setFormTarget({ vehicleId: null })}>
              <IconPlus className="h-4 w-4" />
              Tambah Armada Baru
            </Button>
          }
        >
          <Table caption="Katalog armada resmi MobilJuragan">
            <TableHead>
              <TableRow>
                <TableHeaderCell className="w-[230px]">Kendaraan &amp; Kategori</TableHeaderCell>
                <TableHeaderCell className="w-[150px]">Plat Nomor</TableHeaderCell>
                <TableHeaderCell className="w-[160px]">Tarif Sewa / Hari</TableHeaderCell>
                <TableHeaderCell className="w-[155px]">Transmisi &amp; Kursi</TableHeaderCell>
                <TableHeaderCell className="w-[120px]">Ketersediaan</TableHeaderCell>
                <TableHeaderCell className="w-[160px]">Status &amp; Aksi</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="text-left">
                    <span className="block whitespace-nowrap text-body font-semibold text-ink">
                      {vehicle.name}
                    </span>
                    <span className="mt-1 block truncate text-meta text-ink-soft">
                      {vehicle.category ?? "[kategori belum diisi]"}
                      {vehicle.usage ? ` • ${vehicle.usage}` : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <PlateBadge plate={vehicle.plate} region="Merauke" />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-body tabular-nums font-semibold text-ink">
                    {formatRupiah(vehicle.pricePerDay ?? 400000)}
                    <span className="block text-micro font-normal text-ink-soft">/ hari (dasar)</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-body tabular-nums">
                    {vehicle.transmission && vehicle.seats
                      ? `${vehicle.transmission} • ${vehicle.seats} Kursi`
                      : "[belum diisi]"}
                  </TableCell>
                  <TableCell>
                    <StatusChip tone={VEHICLE_STATUS[vehicle.status].tone}>
                      {VEHICLE_STATUS[vehicle.status].label}
                    </StatusChip>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      onClick={() => setFormTarget({ vehicleId: vehicle.id })}
                    >
                      <IconPencil className="h-4 w-4" />
                      Kelola
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
