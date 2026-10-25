"use client";

import { useState, useTransition } from "react";

import { saveVehicleAction, deleteVehicleAction } from "@/app/actions";
import { DeleteVehicleModal } from "@/components/modals/DeleteVehicleModal";
import { VehicleFormModal } from "@/components/modals/VehicleFormModal";
import { Button } from "@/components/ui/Button";
import { PlateBadge } from "@/components/ui/PlateBadge";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import { Toast } from "@/components/ui/Toast";
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
    /* Notifikasi memakai toast, bukan paragraf di atas panel. Paragraf itu mudah
     terlewat karena berada jauh dari tombol yang baru ditekan, dan tidak hilang
     sendiri sehingga menumpuk dengan pesan berikutnya. */
  const [notice, setNotice] = useState<{
    text: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  /* Nilai pending tidak ditampilkan; yang dipakai hanya startTransition. */
  const [, startTransition] = useTransition();

  const editing = formTarget?.vehicleId
    ? vehicles.find((vehicle) => vehicle.id === formTarget.vehicleId)
    : undefined;
  const deleting = deleteTarget
    ? vehicles.find((vehicle) => vehicle.id === deleteTarget)
    : undefined;

  return (
    <>
      {notice ? (
        <Toast
          message={notice.text}
          tone={notice.tone}
          durationMs={3500}
          onClose={() => setNotice(null)}
        />
      ) : null}

      <div className="mt-3">
        <Panel
          title="Katalog &amp; Spesifikasi Armada"
          icon={<IconCar />}
          action={
            <Button
              variant="confirm"
              size="md"
              onClick={() => setFormTarget({ vehicleId: null })}
            >
              <IconPlus className="h-4 w-4" />
              Tambah Armada
            </Button>
          }
        >
          {/* Tampilan kartu saja. Pilihan tabel dilepas karena isi yang sama sudah
              terbaca di kartu, dan dua mode tampilan hanya menambah tombol tanpa
              menambah informasi. */}
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
            setNotice({
              text: editing
                ? `Menyimpan perubahan unit ${saved.name}...`
                : `Menambahkan unit ${saved.name}...`,
              tone: "info",
            });
            setFormTarget(null);

            startTransition(async () => {
              const res = await saveVehicleAction(saved);
              if (res.success) {
                setNotice({ text: res.message ?? "Data armada berhasil disimpan ke database.", tone: "success" });
              } else {
                setNotice({ text: res.message ?? "Gagal menyimpan ke server backend.", tone: "error" });
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
            setNotice({ text: `Menghapus unit ${targetName}...`, tone: "info" });
            setDeleteTarget(null);

            startTransition(async () => {
              const res = await deleteVehicleAction(targetId);
              if (res.success) {
                setNotice({ text: res.message ?? `Unit ${targetName} dihapus.`, tone: "success" });
              } else {
                setNotice({ text: res.message ?? "Gagal menghapus armada.", tone: "error" });
              }
            });
          }}
        />
      ) : null}
    </>
  );
}
