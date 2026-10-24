"use client";

import { useMemo, useState, useTransition } from "react";
import { assignDriverAction, updateBookingStatusAction } from "@/app/actions";
import { ManualSurchargeModal } from "@/components/modals/ManualSurchargeModal";
import { Button } from "@/components/ui/Button";
import { BookingTimelineBar } from "./BookingTimelineBar";
import { CustomerInfoCard } from "./CustomerInfoCard";
import { VehicleUnitCard } from "./VehicleUnitCard";
import { DriverAllocationCard } from "./DriverAllocationCard";
import { BillingLineItemsCard } from "./BillingLineItemsCard";
import { BookingActionSidebar } from "./BookingActionSidebar";
import type {
  Booking,
  BookingStatus,
  CanonicalBookingStatus,
  Driver,
  LineItem,
  Vehicle,
} from "@/lib/types";

type Props = {
  booking: Booking;
  vehicle: Vehicle;
  availableDrivers?: Driver[];
};

export function BookingDetailClient({
  booking,
  vehicle,
  availableDrivers = [],
}: Props) {
  const isDriverService = booking.mode === "dengan_supir";

  const [items, setItems] = useState<LineItem[]>(() => {
    // Inisialisasi daftar item tagihan, sertakan breakdown supir jika Dengan Supir
    const initialItems = [...booking.lineItems];
    if (isDriverService && !initialItems.some((i) => i.id.includes("supir-breakdown"))) {
      initialItems.push({
        id: `${booking.id}-supir-breakdown`,
        label: "Layanan jasa supir resmi Merauke",
        amount: null,
        note: `Termasuk operasional supir (${booking.dayCount} hari)`,
      });
    }
    return initialItems;
  });

  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [rawStatus, setRawStatus] = useState<CanonicalBookingStatus>(
    booking.rawStatus ?? "CREATED",
  );

  const vehicleBaseRate =
    vehicle?.pricePerDay && vehicle.pricePerDay > 0
      ? vehicle.pricePerDay
      : isDriverService
        ? 600000
        : 450000;
  const driverFeePerDay = isDriverService ? 150000 : 0;
  const calculatedBaseRate = (vehicleBaseRate + driverFeePerDay) * (booking.dayCount || 1);

  // Jika quotedAmount sudah tersimpan di DB, kurangi dengan surcharge yang ada agar menjadi tarif pokok
  const initialBaseQuoted = useMemo(() => {
    if (booking.quotedAmount === null || booking.quotedAmount === undefined) {
      return calculatedBaseRate;
    }
    const existingSurchargesSum = booking.lineItems
      .filter((i) => i.id.startsWith("li-") && i.amount)
      .reduce((sum, item) => {
        const raw = item.amount ?? "";
        const isNegative = raw.startsWith("-");
        const val = Number(raw.replace(/[^\d]/g, "")) || 0;
        return isNegative ? sum - val : sum + val;
      }, 0);

    return Math.max(0, booking.quotedAmount - existingSurchargesSum);
  }, [booking.quotedAmount, booking.lineItems, calculatedBaseRate]);

  const [quotedAmount, setQuotedAmount] = useState<number>(initialBaseQuoted);
  const initialDriverId = useMemo(() => {
    if (booking.driverId) {
      const match = availableDrivers.find(
        (d) => d.id === booking.driverId || d.uuid === booking.driverId,
      );
      if (match) return match.id;
      return booking.driverId;
    }
    return "";
  }, [booking.driverId, availableDrivers]);

  const [selectedDriverId, setSelectedDriverId] = useState<string>(initialDriverId);
  const initialDriverName = useMemo(() => {
    if (booking.driverName) return booking.driverName;
    if (booking.driverId) {
      const match = availableDrivers.find(
        (d) => d.id === booking.driverId || d.uuid === booking.driverId,
      );
      if (match) return match.label;
    }
    return null;
  }, [booking.driverName, booking.driverId, availableDrivers]);

  const [assignedDriverName, setAssignedDriverName] = useState<string | null>(initialDriverName);
  const [surchargeOpen, setSurchargeOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(
    booking.whatsappIntent?.url ?? null,
  );

  const [isPending, startTransition] = useTransition();

  const canDecide = rawStatus === "CREATED" || rawStatus === "PENDING_CONFIRMATION";
  const isCompleted = rawStatus === "COMPLETED";
  const isRejected = rawStatus === "REJECTED" || rawStatus === "CANCELLED";

  // Deteksi otomatis apakah rute pesanan adalah Luar Kota Merauke
  const isLuarKotaBooking = useMemo(() => {
    const loc = (booking.pickupRoute ?? "").toLowerCase();
    const note = (booking.customerContext ?? "").toLowerCase();
    const luarKotaKeywords = [
      "sota",
      "kurik",
      "tanah miring",
      "muting",
      "okaba",
      "ilwayab",
      "semangga",
      "kimaam",
      "naukenjerai",
      "luar kota",
      "bovendigoel",
      "boven digoel",
    ];
    return luarKotaKeywords.some((kw) => loc.includes(kw) || note.includes(kw));
  }, [booking.pickupRoute, booking.customerContext]);

  // Kalkulasi total tagihan bersih (quotedAmount + manual surcharges)
  const totalCleanBill = useMemo(() => {
    let sum = quotedAmount;
    for (const item of items) {
      if (item.id.startsWith("li-") && item.amount) {
        const raw = item.amount;
        const isNegative = raw.startsWith("-");
        const val = Number(raw.replace(/[^\d]/g, "")) || 0;
        if (isNegative) {
          sum -= val;
        } else {
          sum += val;
        }
      }
    }
    return Math.max(0, sum);
  }, [quotedAmount, items]);

  function applySurcharge(item: LineItem) {
    setItems((current) => [...current, item]);
    setSurchargeOpen(false);
  }

  function handleRemoveSurcharge(itemId: string) {
    setItems((current) => current.filter((i) => i.id !== itemId));
  }

  // Penugasan supir otomatis saat dropdown diubah
  function handleAutoAssignDriver(driverId: string) {
    if (!driverId) return;

    setSelectedDriverId(driverId);
    startTransition(async () => {
      const result = await assignDriverAction(booking.id, driverId);
      if (result.success) {
        const chosen = availableDrivers.find((d) => d.id === driverId || d.uuid === driverId);
        setAssignedDriverName(chosen ? chosen.label : "Supir Ditugaskan");
        setNotice({
          text: result.message ?? `Supir resmi ${chosen?.label ?? ""} berhasil ditugaskan.`,
        });
        if ((result as { data?: { whatsappIntent?: { url: string } } }).data?.whatsappIntent?.url) {
          setWhatsappUrl((result as { data?: { whatsappIntent?: { url: string } } }).data!.whatsappIntent!.url);
        }
      } else {
        setNotice({
          text: result.message ?? "Gagal menugaskan supir resmi.",
          isError: true,
        });
      }
    });
  }

  const hasAssignedDriver = Boolean(
    assignedDriverName || (selectedDriverId && availableDrivers.some((d) => d.id === selectedDriverId || d.uuid === selectedDriverId)),
  );

  // Konfirmasi tarif dan persetujuan pesanan
  function handleConfirmBooking() {
    if (isDriverService && !hasAssignedDriver) {
      setNotice({
        text: "Wajib memilih dan menugaskan supir resmi terlebih dahulu sebelum mengonfirmasi pesanan.",
        isError: true,
      });
      return;
    }

    if (totalCleanBill <= 0) {
      setNotice({
        text: "Nominal tarif sewa resmi harus lebih besar dari Rp 0.",
        isError: true,
      });
      return;
    }

    startTransition(async () => {
      const surchargePayload = items
        .filter((i) => i.amount !== null && i.amount !== undefined)
        .map((i) => {
          const raw = String(i.amount);
          const isNegative = raw.startsWith("-");
          const val = Number(raw.replace(/[^\d]/g, "")) || 0;
          return {
            title: i.label,
            amount: isNegative ? -val : val,
            note: i.note || undefined,
          };
        })
        .filter((i) => i.amount !== 0);

      const result = await updateBookingStatusAction(
        booking.id,
        "CONFIRMED",
        totalCleanBill,
        "Tarif disepakati dan dikonfirmasi admin.",
        surchargePayload,
      );

      if (result.success) {
        setRawStatus("CONFIRMED");
        setStatus("tarif_terkonfirmasi");
        setNotice({
          text: result.message ?? "Tarif sewa resmi berhasil dikonfirmasi.",
        });
        if ((result as { data?: { whatsappIntent?: { url: string } } }).data?.whatsappIntent?.url) {
          setWhatsappUrl((result as { data?: { whatsappIntent?: { url: string } } }).data!.whatsappIntent!.url);
        }
      } else {
        setNotice({
          text: result.message ?? "Gagal mengonfirmasi pesanan.",
          isError: true,
        });
      }
    });
  }

  // Penolakan pesanan sewa
  function handleRejectBooking() {
    if (!rejectReason.trim()) {
      setNotice({
        text: "Tuliskan alasan penolakan rasional terlebih dahulu.",
        isError: true,
      });
      return;
    }

    startTransition(async () => {
      const result = await updateBookingStatusAction(
        booking.id,
        "REJECTED",
        undefined,
        rejectReason.trim(),
      );

      if (result.success) {
        setRawStatus("REJECTED");
        setStatus("ditolak");
        setShowRejectModal(false);
        setNotice({
          text: result.message ?? "Permintaan sewa berhasil ditolak.",
        });
      } else {
        setNotice({
          text: result.message ?? "Gagal menolak pesanan.",
          isError: true,
        });
      }
    });
  }

  // Transisi siklus hidup pesanan lanjutan (CONFIRMED -> IN_PROGRESS -> COMPLETED)
  function handleTransitionStatus(nextStatus: CanonicalBookingStatus, note?: string) {
    startTransition(async () => {
      const result = await updateBookingStatusAction(
        booking.id,
        nextStatus,
        undefined,
        note,
      );

      if (result.success) {
        setRawStatus(nextStatus);
        setNotice({
          text: result.message ?? `Status berhasil diperbarui ke ${nextStatus}.`,
        });
        if ((result as { data?: { whatsappIntent?: { url: string } } }).data?.whatsappIntent?.url) {
          setWhatsappUrl((result as { data?: { whatsappIntent?: { url: string } } }).data!.whatsappIntent!.url);
        }
      } else {
        setNotice({
          text: result.message ?? "Gagal memperbarui status sewa.",
          isError: true,
        });
      }
    });
  }

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Kolom Kiri: Main Content Stack (~65% / col-span-8) */}
        <div className="min-w-0 space-y-4 lg:col-span-8">
          {/* Modul 1: Bar Visual Timeline Alur Pemesanan */}
          <BookingTimelineBar
            rawStatus={rawStatus}
            rejectionReason={rawStatus === "REJECTED" ? rejectReason || null : null}
          />

          {/* Modul 2: Kartu Informasi Pelanggan & Pemesanan */}
          <CustomerInfoCard booking={booking} />

          {/* Modul 3: Kartu Kendaraan yang Dipilih */}
          <VehicleUnitCard vehicle={vehicle} />

          {/* Modul 4: Kartu Alokasi Operasional & Penugasan Supir */}
          <DriverAllocationCard
            booking={booking}
            availableDrivers={availableDrivers}
            selectedDriverId={selectedDriverId}
            assignedDriverName={assignedDriverName}
            onAssignDriver={handleAutoAssignDriver}
            isPending={isPending}
            isLuarKota={isLuarKotaBooking}
            disabled={isCompleted || isRejected}
          />

          {/* Modul 5: Kartu Rincian Tagihan & Penyesuaian Biaya */}
          <BillingLineItemsCard
            items={items}
            quotedAmount={quotedAmount}
            rawStatus={rawStatus}
            canDecide={canDecide}
            onOpenSurcharge={() => setSurchargeOpen(true)}
            onRemoveSurcharge={handleRemoveSurcharge}
          />
        </div>

        {/* Kolom Kanan: Sticky Action Sidebar (~35% / col-span-4) */}
        <div className="min-w-0 lg:col-span-4 lg:sticky lg:top-6 lg:self-start max-h-[calc(100vh-3rem)] overflow-y-auto">
          <BookingActionSidebar
            booking={booking}
            status={status}
            rawStatus={rawStatus}
            quotedAmount={quotedAmount}
            onQuotedAmountChange={setQuotedAmount}
            totalCleanBill={totalCleanBill}
            hasAssignedDriver={hasAssignedDriver}
            isDriverService={isDriverService}
            isPending={isPending}
            notice={notice}
            onConfirmBooking={handleConfirmBooking}
            onOpenRejectModal={() => setShowRejectModal(true)}
            onTransitionStatus={handleTransitionStatus}
            whatsappUrl={whatsappUrl}
          />
        </div>
      </div>

      {/* Modal Dialog Konfirmasi Penolakan Sewa */}
      {showRejectModal ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-md border border-rule bg-surface p-5 shadow-lg">
            <h3 className="text-subtitle font-bold text-ink">
              Konfirmasi Tolak Permintaan Sewa
            </h3>
            <p className="mt-1.5 text-meta text-ink-soft">
              Apakah Anda yakin ingin menolak pemesanan{" "}
              <strong className="text-ink">{booking.code}</strong> atas nama{" "}
              <strong className="text-ink">{booking.customerName}</strong>?
            </p>

            <div className="mt-3.5 space-y-1.5">
              <label
                htmlFor="reject-reason-modal"
                className="block text-meta font-medium text-ink"
              >
                Alasan Penolakan Resmi <span className="text-danger">*</span>
              </label>
              <textarea
                id="reject-reason-modal"
                rows={3}
                maxLength={300}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Jadwal armada bentrok dengan agenda dinas resmi / unit dalam perawatan berkala."
                className="w-full rounded-sm border border-rule-strong bg-canvas p-2.5 text-body text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
              />
              <p className="text-right text-micro text-ink-soft">
                {rejectReason.length}/300 karakter
              </p>
            </div>

            <div className="mt-4 flex justify-end gap-2.5">
              <Button
                variant="outline"
                size="md"
                disabled={isPending}
                onClick={() => setShowRejectModal(false)}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                size="md"
                disabled={isPending || !rejectReason.trim()}
                onClick={handleRejectBooking}
              >
                {isPending ? "Menolak..." : "Ya, Tolak Permintaan"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal Surcharge Manual */}
      {surchargeOpen ? (
        <ManualSurchargeModal
          onClose={() => setSurchargeOpen(false)}
          onApply={applySurcharge}
          booking={booking}
        />
      ) : null}
    </>
  );
}
