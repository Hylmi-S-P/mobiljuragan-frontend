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
        title="Alokasi Operasional: Layanan Lepas Kunci (Self-Drive)"
        action={<StatusChip tone="available">Verifikasi Mandiri</StatusChip>}
      >
        <div className="space-y-3">
          <p className="text-meta text-ink leading-relaxed">
            Penyewa mengemudi secara mandiri tanpa pendampingan supir resmi MobilJuragan.
            Serah terima unit dilakukan di kantor operasional MobilJuragan Merauke (Jl. Raya Mandala No. 12).
          </p>

          <div className="rounded-md border border-rule bg-canvas p-3.5">
            <h3 className="text-micro font-bold uppercase tracking-wider text-ink-soft">
              Checklist Standar Operasional Prosedur (SOP) Serah Terima Fisik Unit
            </h3>
            <ul className="mt-2.5 space-y-2 text-meta text-ink">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal text-micro font-bold">
                  &#10003;
                </span>
                <span>
                  <strong>Pemeriksaan KTP Fisik Asli:</strong> Nama dan foto pada KTP wajib dicocokkan dengan identitas akun pemesan.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal text-micro font-bold">
                  &#10003;
                </span>
                <span>
                  <strong>Validasi SIM A Aktif Asli:</strong> Masa berlaku SIM A diverifikasi belum kedaluwarsa.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal text-micro font-bold">
                  &#10003;
                </span>
                <span>
                  <strong>Penandatanganan Dokumen BAST:</strong> Lembar Berita Acara Serah Terima &amp; syarat ketentuan sewa ditandatangani kedua pihak.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal text-micro font-bold">
                  &#10003;
                </span>
                <span>
                  <strong>Inspeksi Fisik Bersama:</strong> Pencatatan kondisi goresan bodi, kebersihan kabin, kelengkapan ban cadangan &amp; toolkit.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal text-micro font-bold">
                  &#10003;
                </span>
                <span>
                  <strong>Pencatatan Odometer &amp; Indikator BBM:</strong> Angka kilometer awal dan tingkat bahan bakar difoto bersama penyewa.
                </span>
              </li>
            </ul>
          </div>
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
      <div className="space-y-3.5">
        <div>
          <label
            htmlFor="driver-select-card"
            className="block text-meta font-semibold text-ink"
          >
            Pilih Supir Resmi MobilJuragan (Status Siaga)
          </label>
          <p className="mt-0.5 text-micro text-ink-soft">
            Menampilkan pengemudi berstatus Siaga ({isLuarKota ? "Prioritas Rute Luar Kota" : "Prioritas Rute Dalam Kota"}). Penugasan otomatis tersimpan ke sistem saat dipilih.
          </p>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
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
                Menyimpan alokasi...
              </span>
            ) : null}
          </div>

          {eligibleDrivers.length === 0 ? (
            <p className="mt-1.5 text-micro text-amber-700">
              Perhatian: Tidak ada supir siaga untuk rute ini di roster operasional. Anda tetap dapat menugaskan supir lain saat status mereka kembali Siaga.
            </p>
          ) : null}
        </div>

        {/* Profil Supir Ditugaskan */}
        {hasAssignedDriver ? (
          <div className="rounded-md border border-rule bg-canvas p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule/60 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-micro font-bold text-white">
                  {(activeDriverLabel ?? "S").charAt(0)}
                </span>
                <div>
                  <h3 className="text-body font-bold text-ink">
                    {activeDriverLabel}
                  </h3>
                  <p className="text-micro text-ink-soft">Pengemudi Resmi MobilJuragan Merauke</p>
                </div>
              </div>
              <StatusChip tone={assignedDriver ? DRIVER_STATUS[assignedDriver.status]?.tone ?? "available" : "available"}>
                {assignedDriver ? DRIVER_STATUS[assignedDriver.status]?.label ?? "Siaga" : "Siaga"}
              </StatusChip>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-micro font-semibold uppercase text-ink-soft">Lisensi Mengemudi</p>
                <p className="mt-0.5 text-meta font-medium text-ink">
                  {assignedDriver?.licenseNumber ?? "SIM B1 Umum Merauke"}
                </p>
              </div>

              <div>
                <p className="text-micro font-semibold uppercase text-ink-soft">Keahlian Rute</p>
                <p className="mt-0.5 text-meta font-medium text-ink">
                  {assignedDriver?.route === "luar_kota"
                    ? "Jalur Lintas Luar Kota Merauke"
                    : "Dalam Kota Merauke & Sekitarnya"}
                </p>
              </div>

              <div>
                <p className="text-micro font-semibold uppercase text-ink-soft">Kontak Pengemudi</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-meta font-medium text-ink tabular-nums">
                    {assignedDriver?.contact ?? "0812-3456-7890"}
                  </span>
                  {assignedDriver?.contact ? (
                    <a
                      href={`https://wa.me/62${assignedDriver.contact.replace(/\D/g, "").replace(/^0/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-micro font-medium text-teal hover:underline"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-amber-300 bg-amber-50/70 p-3 text-meta text-amber-900">
            <p className="font-semibold">
              Perhatian Operasional: Supir resmi belum dialokasikan untuk pemesanan ini.
            </p>
            <p className="mt-0.5 text-micro text-amber-800">
              Pemesanan dengan supir memerlukan penugasan pengemudi sebelum tarif sewa dapat disahkan dan disetujui.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
