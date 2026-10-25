"use client";

import { useState, useTransition } from "react";

import {
  createDriverAction,
  deleteDriverAction,
  toggleDriverReadinessAction,
  updateDriverAction,
} from "@/app/actions";
import { DeleteDriverModal } from "@/components/modals/DeleteDriverModal";
import { DriverFormModal } from "@/components/modals/DriverFormModal";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import { Toggle } from "@/components/ui/Toggle";
import { IconPencil, IconPlus } from "@/components/ui/icons";
import { DRIVER_ROUTE, DRIVER_STATUS } from "@/lib/labels";
import { useDebounce } from "@/lib/useDebounce";
import type { Driver } from "@/lib/types";

type Props = {
  initialDrivers: Driver[];
};

export function DriverRosterTable({ initialDrivers }: Props) {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [formTarget, setFormTarget] = useState<{ driverId: string | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredDrivers = drivers.filter((driver) => {
    const q = debouncedSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      driver.label.toLowerCase().includes(q) ||
      (driver.contact ?? "").toLowerCase().includes(q) ||
      (driver.licenseNumber ?? "").toLowerCase().includes(q) ||
      (DRIVER_ROUTE[driver.route] ?? "").toLowerCase().includes(q)
    );
  });

  const editing = formTarget?.driverId
    ? drivers.find((driver) => driver.id === formTarget.driverId)
    : undefined;
  const deleting = deleteTarget ? drivers.find((driver) => driver.id === deleteTarget) : undefined;

  function setReadiness(driverId: string, ready: boolean) {
    const previous = [...drivers];
    const targetStatus = ready ? "siaga" : "libur";
    const apiReadiness = ready ? "SIAGA" : "LIBUR";

    // Optimistic UI update
    setDrivers((current) =>
      current.map((driver) =>
        driver.id === driverId ? { ...driver, status: targetStatus } : driver,
      ),
    );

    startTransition(async () => {
      const res = await toggleDriverReadinessAction(driverId, apiReadiness);
      if (res.success) {
        setNotice({ text: res.message ?? `Kesiapan supir berhasil diubah menjadi ${apiReadiness}.` });
      } else {
        // Rollback on failure
        setDrivers(previous);
        setNotice({ text: res.message ?? "Gagal mengubah kesiapan supir.", isError: true });
      }
    });
  }

  function handleSaveDriver(saved: Driver) {
    const isEdit = Boolean(formTarget?.driverId);
    const formData = new FormData();
    if (isEdit && formTarget?.driverId) {
      formData.set("id", formTarget.driverId);
    }
    formData.set("fullName", saved.label);
    if (saved.contact) formData.set("phoneNumber", saved.contact);
    if (saved.licenseNumber) formData.set("licenseNumber", saved.licenseNumber);
    formData.set("route", saved.route);

    startTransition(async () => {
      const res = isEdit
        ? await updateDriverAction(null, formData)
        : await createDriverAction(null, formData);

      if (res.success) {
        setDrivers((current) => {
          const exists = current.some((driver) => driver.id === saved.id);
          return exists
            ? current.map((driver) => (driver.id === saved.id ? saved : driver))
            : [...current, saved];
        });
        setNotice({
          text:
            res.message ??
            (isEdit
              ? `Data ${saved.label} berhasil diperbarui di database.`
              : `${saved.label} berhasil didaftarkan ke roster operasional.`),
        });
        setFormTarget(null);
      } else {
        setNotice({
          text: res.message ?? "Gagal menyimpan data supir ke database.",
          isError: true,
        });
      }
    });
  }

  function handleDeleteDriver() {
    if (!deleteTarget) return;
    const targetId = deleteTarget;
    const targetDriver = deleting;
    const formData = new FormData();
    formData.set("id", targetId);

    startTransition(async () => {
      const res = await deleteDriverAction(null, formData);
      if (res.success) {
        setDrivers((current) => current.filter((driver) => driver.id !== targetId));
        setNotice({
          text: res.message ?? `Supir ${targetDriver?.label ?? ""} berhasil dinonaktifkan.`,
        });
        setDeleteTarget(null);
      } else {
        setNotice({
          text: res.message ?? "Gagal menghapus supir dari database.",
          isError: true,
        });
      }
    });
  }

  return (
    <>
      {notice ? (
        <p
          className={`mt-3 rounded-sm border px-3 py-2 text-meta ${
            notice.isError
              ? "border-danger bg-danger/10 text-danger"
              : "border-teal/40 bg-surface text-ink"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="mt-3">
        <Panel
          action={
            <Button variant="confirm" size="md" onClick={() => setFormTarget({ driverId: null })}>
              <IconPlus className="h-4 w-4" />
              Tambah Supir Baru
            </Button>
          }
        >
          <div className="mb-3 max-w-sm">
            <label htmlFor="driver-search-input" className="sr-only">
              Cari supir
            </label>
            <input
              id="driver-search-input"
              maxLength={60}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama supir, kontak, rute..."
              className="h-10 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-meta text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>

          {/* Tampilan kartu modular supir sesuai titik kritis Ami Poin 13 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDrivers.map((driver) => {
              const onDuty = driver.status === "sedang_tugas";
              const initial = driver.label.trim().charAt(0).toUpperCase() || "S";
              return (
                <div
                  key={driver.id}
                  className="flex flex-col justify-between rounded-lg border border-rule bg-surface p-4 shadow-card hover:border-navy/40 transition-all"
                >
                  <div>
                    {/* Header Kartu: Avatar, Nama, Kontak & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy/10 text-body font-bold text-navy">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-body font-bold text-ink truncate">{driver.label}</h3>
                          <span className="block text-micro text-ink-soft">
                            {driver.contact ?? "Tanpa kontak"}
                          </span>
                        </div>
                      </div>
                      {onDuty ? (
                        <StatusChip tone={DRIVER_STATUS.sedang_tugas.tone}>
                          {DRIVER_STATUS.sedang_tugas.label}
                        </StatusChip>
                      ) : null}
                    </div>

                    {/* Informasi Rute & Kesiapan */}
                    <div className="mt-3.5 space-y-2 border-t border-rule/60 pt-3 text-meta text-ink-soft">
                      <div className="flex items-center justify-between">
                        <span>Rute Penugasan</span>
                        <span className="font-medium text-ink">
                          {DRIVER_ROUTE[driver.route] ?? driver.route}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Kesiapan Bertugas</span>
                        <div>
                          {onDuty ? (
                            <span className="text-micro font-medium text-amber-700">Dalam Perjalanan</span>
                          ) : (
                            <Toggle
                              checked={driver.status === "siaga"}
                              disabled={isPending}
                              onChange={(next) => setReadiness(driver.id, next)}
                              labelOn={DRIVER_STATUS.siaga.label}
                              labelOff={DRIVER_STATUS.libur.label}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Kartu: Tombol Aksi Kelola */}
                  <div className="mt-4 flex items-center justify-end border-t border-rule/60 pt-3">
                    <button
                      type="button"
                      onClick={() => setFormTarget({ driverId: driver.id })}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-rule bg-canvas px-3 py-1.5 text-meta font-medium text-ink hover:border-navy hover:text-navy transition-colors"
                    >
                      <IconPencil className="h-3.5 w-3.5" />
                      <span>Kelola</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredDrivers.length === 0 ? (
            <div className="py-12 text-center text-meta text-ink-soft">
              Tidak ada supir yang cocok dengan pencarian &quot;{searchQuery}&quot;.
            </div>
          ) : null}
        </Panel>
      </div>

      {formTarget ? (
        <DriverFormModal
          driver={editing}
          onClose={() => setFormTarget(null)}
          onRequestDelete={(driverId) => {
            setFormTarget(null);
            setDeleteTarget(driverId);
          }}
          onSave={handleSaveDriver}
        />
      ) : null}

      {deleting ? (
        <DeleteDriverModal
          driver={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteDriver}
        />
      ) : null}
    </>
  );
}
