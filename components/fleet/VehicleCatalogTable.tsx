"use client";

import { useState, useTransition } from "react";

import { saveVehicleAction, deleteVehicleAction, unggahFotoKendaraanAction } from "@/app/actions";
import { DeleteVehicleModal } from "@/components/modals/DeleteVehicleModal";
import { VehicleFormModal } from "@/components/modals/VehicleFormModal";
import { Button } from "@/components/ui/Button";
import { PlateBadge } from "@/components/ui/PlateBadge";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import { useToast } from "@/components/ui/useToast";
import { IconCar, IconPencil, IconPlus } from "@/components/ui/icons";
import { formatRupiah } from "@/lib/format";
import { tautanMedia } from "@/lib/media";
import type { Vehicle } from "@/lib/types";
import { VEHICLE_STATUS } from "@/lib/labels";

type Props = {
  initialVehicles: Vehicle[];
  /* Id unit yang sedang tersewa saat ini. Dipakai untuk menurunkan badge
     "Disewa". Kalau kosong (mis. pengambilan data gagal), badge mengikuti
     status operasional seperti sebelumnya. */
  rentedVehicleIds?: string[];
};

/**
 * Status yang ditampilkan di kartu katalog.
 *
 * Unit yang sedang tersewa selalu tampil "Disewa", apa pun status gudangnya —
 * sama seperti aturan di kalender armada. Selain itu, status gudang dipakai apa
 * adanya.
 */
function statusKatalog(vehicle: Vehicle, sedangTersewa: boolean): Vehicle["status"] {
  if (sedangTersewa) return "disewa";
  return vehicle.status;
}

export function VehicleCatalogTable({ initialVehicles, rentedVehicleIds = [] }: Props) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [formTarget, setFormTarget] = useState<{ vehicleId: string | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { show, node } = useToast();
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
      {node}

      <div className="mt-3">
        <Panel
          title="Katalog &amp; Spesifikasi Armada"
          icon={<IconCar />}
          action={
            <Button variant="confirm" size="md" onClick={() => setFormTarget({ vehicleId: null })}>
              <IconPlus className="h-4 w-4" />
              Tambah Armada
            </Button>
          }
        >
          {/* Tampilan kartu saja. Pilihan tabel dilepas karena isi yang sama sudah
              terbaca di kartu, dan dua mode tampilan hanya menambah tombol tanpa
              menambah informasi. */}
          {vehicles.length === 0 ? (
            /* Keadaan kosong. Sebelumnya bagian ini selalu terisi karena ada
               sembilan unit contoh di kode, jadi tidak pernah kelihatan bahwa
               katalog bisa kosong. */
            <div className="rounded-lg border border-dashed border-rule bg-canvas px-6 py-10 text-center">
              <p className="text-body font-semibold text-ink">Belum ada armada terdaftar</p>
              <p className="mx-auto mt-1 max-w-md text-meta text-ink-soft">
                Katalog masih kosong. Tekan <span className="font-semibold">Tambah Armada</span>{" "}
                untuk mendaftarkan unit pertama beserta foto, tarif, dan statusnya.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((vehicle) => {
                const statusTampil = statusKatalog(vehicle, rentedVehicleIds.includes(vehicle.id));

                return (
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
                        <StatusChip tone={VEHICLE_STATUS[statusTampil].tone}>
                          {VEHICLE_STATUS[statusTampil].label}
                        </StatusChip>
                      </div>

                      {/* Foto unit kalau ada. Kalau belum diunggah, bagian ini tidak
                        dirender sama sekali supaya kartu tidak menyisakan ruang kosong. */}
                      {vehicle.imageUrl ? (
                        <div className="mt-3 overflow-hidden rounded-sm border border-rule">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={tautanMedia(vehicle.imageUrl) ?? ""}
                            alt={`Foto ${vehicle.name}`}
                            className="h-32 w-full object-cover"
                          />
                        </div>
                      ) : null}

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
                          <span className="font-medium text-ink">
                            {vehicle.transmission ?? "Manual"}
                          </span>
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
                );
              })}
            </div>
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
          onSave={(saved, berkasFoto) => {
            // Optimistic UI update
            setVehicles((current) => {
              const exists = current.some((vehicle) => vehicle.id === saved.id);
              return exists
                ? current.map((vehicle) => (vehicle.id === saved.id ? saved : vehicle))
                : [...current, saved];
            });
            show(
              editing
                ? `Menyimpan perubahan unit ${saved.name}...`
                : `Menambahkan unit ${saved.name}...`,
              "info",
            );
            setFormTarget(null);

            startTransition(async () => {
              const res = await saveVehicleAction(saved);
              if (!res.success) {
                show(res.message ?? "Gagal menyimpan ke server backend.", "error");
                return;
              }

              /*
               * Foto diunggah setelah data unitnya tersimpan.
               *
               * Endpoint unggah membutuhkan ID unit yang sudah ada, dan untuk
               * unit baru ID itu baru didapat dari hasil penyimpanan. Kalau
               * unggahan gagal, data unitnya tetap tersimpan — admin bisa
               * mencoba unggah lagi tanpa mengulang pengisian form.
               */
              if (berkasFoto) {
                const formData = new FormData();
                formData.append("berkas", berkasFoto);

                const unggah = await unggahFotoKendaraanAction(res.data?.id ?? saved.id, formData);
                if (unggah.success) {
                  /*
                   * Kartu diperbarui langsung dengan foto baru. Tanpa ini admin
                   * melihat kartu tanpa foto sampai halaman dimuat ulang, dan
                   * mengira unggahannya gagal.
                   */
                  if (unggah.imageUrl) {
                    const urlFoto = unggah.imageUrl;
                    setVehicles((current) =>
                      current.map((item) =>
                        item.id === saved.id || item.id === res.data?.id
                          ? { ...item, imageUrl: urlFoto }
                          : item,
                      ),
                    );
                  }
                  show(res.message ?? "Data armada tersimpan.", "success");
                } else {
                  show(
                    `Data unit tersimpan, tetapi foto gagal diunggah: ${unggah.message ?? "tidak diketahui"}`,
                    "error",
                  );
                }
                return;
              }

              show(res.message ?? "Data armada berhasil disimpan ke database.", "success");
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
            show(`Menghapus unit ${targetName}...`, "info");
            setDeleteTarget(null);

            startTransition(async () => {
              const res = await deleteVehicleAction(targetId);
              if (res.success) {
                show(res.message ?? `Unit ${targetName} dihapus.`, "success");
              } else {
                show(res.message ?? "Gagal menghapus armada.", "error");
              }
            });
          }}
        />
      ) : null}
    </>
  );
}
