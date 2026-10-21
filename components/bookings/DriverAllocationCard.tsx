"use client";

import { useMemo } from "react";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import { DRIVER_STATUS } from "@/lib/labels";
import type { Booking, Driver } from "@/lib/types";

type Props = {
  booking: Booking;
  availableDrivers?: Driver[];
  selectedDriverId: string;
  assignedDriverName: string | null;
  onAssignDriver: (driverId: string) => void;
  isPending: boolean;
  isLuarKota: boolean;
  disabled?: boolean;
};

export function DriverAllocationCard({
  booking,
  availableDrivers = [],
  selectedDriverId,
  assignedDriverName,
  onAssignDriver,
  isPending,
  isLuarKota,
  disabled = false,
}: Props) {
  const isDriverService = booking.mode === "dengan_supir";

  // Filter supir berstatus 'siaga' dan urutkan sesuai kecocokan rute
  const eligibleDrivers = useMemo(() => {
    const siagaOnly = availableDrivers.filter((d) => d.status === "siaga");
    const routeMatched = siagaOnly.filter((d) =>
      isLuarKota ? d.route === "luar_kota" : d.route === "dalam_kota",
    );
    // Jika ada supir dengan rute cocok, prioritaskan; jika tidak, tampilkan seluruh supir siaga
    return routeMatched.length > 0 ? routeMatched : siagaOnly;
  }, [availableDrivers, isLuarKota]);

  // Supir aktif yang saat ini ditugaskan
  const assignedDriver = useMemo(() => {
    return (
      availableDrivers.find(
        (d) => d.id === selectedDriverId || (assignedDriverName && d.label === assignedDriverName),
      ) ?? null
    );
  }, [availableDrivers, selectedDriverId, assignedDriverName]);

  const activeDriverLabel = assignedDriver?.label || (assignedDriverName?.trim() ? assignedDriverName : null);
  const hasAssignedDriver = Boolean(activeDriverLabel);

  if (!isDriverService) {
    // Mode Lepas Kunci (Self-Drive)
    return (
      <Panel
        title="Layanan Lepas Kunci (Self-Drive)"
        action={<StatusChip tone="available">Tanpa Supir</StatusChip>}
      >
        <div className="rounded-md border border-rule bg-canvas p-3.5 space-y-1.5">
          <p className="text-meta font-medium text-ink">
            Penyewa mengemudi secara mandiri. Serah terima unit dilakukan di kantor MobilJuragan Merauke.
          </p>
          <p className="text-micro text-ink-soft">
            Pastikan verifikasi fisik SIM A aktif &amp; KTP asli penyewa sebelum penyerahan kunci unit.
          </p>
        </div>
      </Panel>
    );
  }

  // Mode Dengan Supir
  return (
    <Panel
      title="Alokasi Operasional & Penugasan Supir"
      action={
        hasAssignedDriver ? (
          <StatusChip tone="available">
            Supir: {activeDriverLabel}
          </StatusChip>
        ) : (
          <StatusChip tone="pending">Belum Dialokasikan</StatusChip>
        )
      }
    >
      <div className="space-y-3">
        <div>
          <label
            htmlFor="driver-select-card"
            className="block text-meta font-semibold text-ink"
          >
            Pilih Supir Siaga
          </label>

          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              id="driver-select-card"
              value={selectedDriverId}
              onChange={(e) => {
                const val = e.target.value;
                onAssignDriver(val);
              }}
              disabled={disabled || isPending}
              className="h-11 w-full rounded-sm border border-rule-strong bg-surface px-3 text-meta text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy sm:max-w-md"
            >
              <option value="">-- Pilih Supir Siaga --</option>
              {eligibleDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.label} ({driver.route === "luar_kota" ? "Luar Kota" : "Dalam Kota"})
                </option>
              ))}
            </select>

            {isPending ? (
              <span className="text-micro font-medium text-teal animate-pulse">
                Menyimpan...
              </span>
            ) : null}
          </div>

          {eligibleDrivers.length === 0 ? (
            <p className="mt-1.5 text-micro text-amber-700">
              Perhatian: Tidak ada supir siaga untuk rute ini di roster operasional.
            </p>
          ) : null}
        </div>

        {/* Profil Supir Ditugaskan */}
        {hasAssignedDriver ? (
          <div className="rounded-md border border-rule bg-canvas p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-micro font-bold text-white">
                  {(activeDriverLabel ?? "S").charAt(0)}
                </span>
                <h3 className="text-body font-bold text-ink">
                  {activeDriverLabel}
                </h3>
              </div>
              <StatusChip tone={assignedDriver ? DRIVER_STATUS[assignedDriver.status]?.tone ?? "available" : "available"}>
                {assignedDriver ? DRIVER_STATUS[assignedDriver.status]?.label ?? "Siaga" : "Siaga"}
              </StatusChip>
            </div>

            <div className="mt-2.5 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-micro font-semibold uppercase text-ink-soft">Lisensi</p>
                <p className="mt-0.5 text-meta font-medium text-ink">
                  {assignedDriver?.licenseNumber ?? "SIM B1 Umum"}
                </p>
              </div>

              <div>
                <p className="text-micro font-semibold uppercase text-ink-soft">Rute Operasional</p>
                <p className="mt-0.5 text-meta font-medium text-ink">
                  {assignedDriver?.route === "luar_kota"
                    ? "Luar Kota Merauke"
                    : "Dalam Kota Merauke"}
                </p>
              </div>

              <div>
                <p className="text-micro font-semibold uppercase text-ink-soft">Kontak</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-meta font-medium text-ink tabular-nums">
                    {assignedDriver?.contact ?? "-"}
                  </span>
                  {assignedDriver?.contact ? (
                    <a
                      href={`https://wa.me/62${assignedDriver.contact.replace(/\D/g, "").replace(/^0/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-micro font-medium text-teal hover:underline"
                    >
                      WhatsApp ↗
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-sm border border-amber-300 bg-amber-50/70 px-3.5 py-2.5 text-meta text-amber-900 flex items-center gap-2">
            <span>⚠️</span>
            <p className="font-medium">
              Supir belum dialokasikan. Pilih supir di atas sebelum menyetujui pesanan ini.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
