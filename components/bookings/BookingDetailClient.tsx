"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  assignDriverAction,
  cancelBookingLineItemAction,
  updateBookingStatusAction,
} from "@/app/actions";
import { ManualSurchargeModal } from "@/components/modals/ManualSurchargeModal";
import { PaymentProofModal } from "@/components/payments/PaymentProofModal";
import { Button } from "@/components/ui/Button";
import { AutoGrowTextarea } from "@/components/ui/AutoGrowTextarea";
import { useToast } from "@/components/ui/useToast";
import { apiClient } from "@/lib/axios";
import { BookingTimelineBar } from "./BookingTimelineBar";
import { CustomerInfoCard } from "./CustomerInfoCard";
import { VehicleUnitCard } from "./VehicleUnitCard";
import { DriverAllocationCard } from "./DriverAllocationCard";
import { LepasKunciDocumentReviewCard } from "./LepasKunciDocumentReviewCard";
import { BillingLineItemsCard } from "./BillingLineItemsCard";
import { BookingActionSidebar } from "./BookingActionSidebar";
import type {
  AdminPaymentItem,
  Booking,
  BookingDocument,
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
  const router = useRouter();

  /*
   * Daftar item tagihan hanya DIBACA, tidak lagi diubah di sisi klien.
   *
   * Sebelumnya penyesuaian biaya ditambahkan ke state ini, sehingga barisnya
   * hilang begitu halaman dimuat ulang dan tampilan bisa berbeda dari isi
   * database. Sekarang sumbernya data server: setelah menyimpan atau
   * membatalkan, tampilan disegarkan lewat `router.refresh()`.
   */
  const items = useMemo<LineItem[]>(() => {
    // Sertakan breakdown supir jika pesanan memakai supir
    const initialItems = [...booking.lineItems];
    if (isDriverService && !initialItems.some((i) => i.kind === "supir")) {
      initialItems.push({
        id: `${booking.id}-supir-breakdown`,
        kind: "supir",
        label: "Layanan jasa supir resmi Merauke",
        amount: null,
        note: `Termasuk operasional supir (${booking.dayCount} hari)`,
      });
    }
    return initialItems;
  }, [booking.lineItems, booking.id, booking.dayCount, isDriverService]);

  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [rawStatus, setRawStatus] = useState<CanonicalBookingStatus>(
    booking.rawStatus ?? "CREATED",
  );
  const [quotedAmount, setQuotedAmount] = useState<number>(
    booking.quotedAmount ?? (isDriverService ? 750000 : 500000) * (booking.dayCount || 1),
  );
  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    booking.driverId ?? "",
  );
  const [document, setDocument] = useState<BookingDocument | null>(
    booking.document ?? null,
  );
  const initialDriverName = useMemo(() => {
    if (booking.driverName) return booking.driverName;
    if (booking.driverId) {
      const match = availableDrivers.find((d) => d.id === booking.driverId);
      if (match) return match.label;
    }
    return null;
  }, [booking.driverName, booking.driverId, availableDrivers]);

  const [assignedDriverName, setAssignedDriverName] = useState<string | null>(initialDriverName);
  const [surchargeOpen, setSurchargeOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const { show, node } = useToast();
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(
    booking.whatsappIntent?.url ?? null,
  );

  const [isPending, startTransition] = useTransition();

  /* Panel verifikasi pembayaran dibuka dari sidebar, tanpa pindah halaman.
     Sebelumnya admin harus kembali ke tab "Verifikasi Pembayaran", mencari
     pesanan yang sama, lalu kembali lagi ke detail untuk menyerahkan armada.

     `PaymentProofModal` sudah menangani unggahan bukti, dua tahap konfirmasi,
     dan pemanggilan PATCH /admin/payments/:id/verify. Yang perlu disiapkan di
     sini hanya bentuk `AdminPaymentItem` yang dimintanya: diambil dari endpoint
     pembayaran per pesanan, bukan dari daftar antrean. */
  const [verifikasiTerbuka, setVerifikasiTerbuka] = useState(false);

  const { data: dataPembayaran } = useQuery({
    queryKey: ["paymentByBooking", booking.id],
    queryFn: async (): Promise<AdminPaymentItem | null> => {
      try {
        const res = await apiClient.get(`/payments/booking/${encodeURIComponent(booking.id)}`);
        return (res.data?.data || res.data) as AdminPaymentItem;
      } catch {
        /* Pesanan yang belum punya tagihan memang menjawab 404. Itu bukan
           kegagalan yang perlu ditampilkan; modalnya hanya tidak bisa dibuka. */
        return null;
      }
    },
    /* Sengaja tidak ditahan sampai modal dibuka: sidebar perlu tahu lebih dulu
       apakah pesanan ini punya tagihan, karena tombolnya hanya berguna kalau
       ada yang bisa diverifikasi. */
    staleTime: 0,
  });

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
      /* Hanya penyesuaian manual yang mengubah total; baris sewa sudah terwakili
         oleh `quotedAmount` di atas. Ditentukan dari `kind`, bukan awalan id. */
      if (item.kind === "penyesuaian" && item.amount) {
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

  /**
   * Dipanggil setelah penyesuaian biaya tersimpan di backend.
   *
   * Barisnya TIDAK lagi ditambahkan ke state lokal. Yang benar-benar tersimpan
   * adalah baris di database, jadi tampilan disegarkan dari server lewat
   * `router.refresh()`. Menambah baris secara lokal di sini justru berisiko
   * menampilkan data yang tidak sama dengan isi database.
   */
  function handleSurchargeSaved() {
    setSurchargeOpen(false);
    router.refresh();
    show("Penyesuaian biaya tersimpan pada riwayat pesanan.");
  }

  async function handleRemoveSurcharge(itemId: string) {
    const res = await cancelBookingLineItemAction(booking.id, itemId);
    if (res.success) {
      router.refresh();
      show(res.message ?? "Penyesuaian biaya dibatalkan.");
    } else {
      show(res.message ?? "Gagal membatalkan penyesuaian biaya.", "error");
    }
  }

  // Penugasan supir otomatis saat dropdown diubah
  function handleAutoAssignDriver(driverId: string) {
    if (!driverId) return;

    setSelectedDriverId(driverId);
    startTransition(async () => {
      const result = await assignDriverAction(booking.id, driverId);
      if (result.success) {
        const chosen = availableDrivers.find((d) => d.id === driverId);
        setAssignedDriverName(chosen ? chosen.label : "Supir Ditugaskan");
        show(result.message ?? `Supir resmi ${chosen?.label ?? ""} berhasil ditugaskan.`);
        if ((result as { data?: { whatsappIntent?: { url: string } } }).data?.whatsappIntent?.url) {
          setWhatsappUrl((result as { data?: { whatsappIntent?: { url: string } } }).data!.whatsappIntent!.url);
        }
      } else {
        show(result.message ?? "Gagal menugaskan supir resmi.", "error");
      }
    });
  }

  const hasAssignedDriver = Boolean(
    assignedDriverName || (selectedDriverId && availableDrivers.some((d) => d.id === selectedDriverId)),
  );

  // Konfirmasi tarif dan persetujuan pesanan
  function handleConfirmBooking() {
    if (isDriverService && !hasAssignedDriver) {
      show("Wajib memilih dan menugaskan supir resmi terlebih dahulu sebelum mengonfirmasi pesanan.", "error");
      return;
    }

    if (totalCleanBill <= 0) {
      show("Nominal tarif sewa resmi harus lebih besar dari Rp 0.", "error");
      return;
    }

    startTransition(async () => {
      const result = await updateBookingStatusAction(
        booking.id,
        "CONFIRMED",
        totalCleanBill,
        "Tarif disepakati dan dikonfirmasi admin.",
      );

      if (result.success) {
        setRawStatus("CONFIRMED");
        setStatus("tarif_terkonfirmasi");
        show(result.message ?? "Tarif sewa resmi berhasil dikonfirmasi.");
        if ((result as { data?: { whatsappIntent?: { url: string } } }).data?.whatsappIntent?.url) {
          setWhatsappUrl((result as { data?: { whatsappIntent?: { url: string } } }).data!.whatsappIntent!.url);
        }
      } else {
        show(result.message ?? "Gagal mengonfirmasi pesanan.", "error");
      }
    });
  }

  // Penolakan pesanan sewa
  function handleRejectBooking() {
    if (!rejectReason.trim()) {
      show("Tuliskan alasan penolakan rasional terlebih dahulu.", "error");
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
        show(result.message ?? "Permintaan sewa berhasil ditolak.");
      } else {
        show(result.message ?? "Gagal menolak pesanan.", "error");
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
        show(result.message ?? `Status berhasil diperbarui ke ${nextStatus}.`);
        if ((result as { data?: { whatsappIntent?: { url: string } } }).data?.whatsappIntent?.url) {
          setWhatsappUrl((result as { data?: { whatsappIntent?: { url: string } } }).data!.whatsappIntent!.url);
        }
      } else {
        show(result.message ?? "Gagal memperbarui status sewa.", "error");
      }
    });
  }

  /** Dipanggil setelah `PaymentProofModal` berhasil menyetujui atau menolak bukti. */
  function handlePembayaranDiverifikasi(
    _updated: AdminPaymentItem,
    action: "APPROVE" | "REJECT",
  ) {
    setVerifikasiTerbuka(false);
    /* `router.refresh()` mengambil ulang `booking.payment` dari server, sehingga
       sidebar langsung berubah dari "Verifikasi Pembayaran" menjadi tombol
       "Serahkan Armada" tanpa perlu memuat ulang halaman. */
    router.refresh();
    show(
      action === "APPROVE"
        ? "Pembayaran terverifikasi lunas. Armada sekarang bisa diserahkan."
        : "Bukti pembayaran ditolak. Armada tetap belum bisa diserahkan.",
      action === "APPROVE" ? "success" : "error",
    );
  }

  return (
    <>
      {node}

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

          {/* Modul 4: Kartu Alokasi Operasional Supir atau Verifikasi Dokumen Lepas Kunci */}
          {isDriverService ? (
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
          ) : (
            <LepasKunciDocumentReviewCard
              booking={booking}
              onDocumentUpdated={setDocument}
            />
          )}

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
            document={document}
            status={status}
            rawStatus={rawStatus}
            quotedAmount={quotedAmount}
            onQuotedAmountChange={setQuotedAmount}
            totalCleanBill={totalCleanBill}
            hasAssignedDriver={hasAssignedDriver}
            isDriverService={isDriverService}
            isPending={isPending}
            onConfirmBooking={handleConfirmBooking}
            onOpenRejectModal={() => setShowRejectModal(true)}
            onTransitionStatus={handleTransitionStatus}
            whatsappUrl={whatsappUrl}
            onOpenPaymentVerification={
              dataPembayaran ? () => setVerifikasiTerbuka(true) : undefined
            }
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
              <AutoGrowTextarea
            maxHeight={200}
                id="reject-reason-modal"
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

      {/* Verifikasi Pembayaran dari halaman detail. `key` mengikat state modal
          ke pembayaran yang sedang dibuka, sama seperti di antrean pembayaran,
          supaya centang "Terbayar" tidak terbawa ke pesanan lain. */}
      <PaymentProofModal
        key={dataPembayaran?.id ?? "tanpa-pembayaran"}
        open={verifikasiTerbuka && Boolean(dataPembayaran)}
        payment={dataPembayaran ?? null}
        onClose={() => setVerifikasiTerbuka(false)}
        onSuccess={handlePembayaranDiverifikasi}
      />

      {/* Modal Surcharge Manual */}
      {surchargeOpen ? (
        <ManualSurchargeModal
          onClose={() => setSurchargeOpen(false)}
          onSaved={handleSurchargeSaved}
          booking={booking}
        />
      ) : null}
    </>
  );
}
