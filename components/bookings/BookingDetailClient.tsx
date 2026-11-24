"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignDriverAction,
  cancelBookingLineItemAction,
  updateBookingStatusAction,
} from "@/app/actions";
import { formatRupiah } from "@/lib/format";
import { ManualSurchargeModal } from "@/components/modals/ManualSurchargeModal";
import { PaymentProofModal } from "@/components/payments/PaymentProofModal";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AutoGrowTextarea } from "@/components/ui/AutoGrowTextarea";
import { useToast } from "@/components/ui/useToast";
import { apiClient } from "@/lib/axios";
import { BookingTimelineBar } from "./BookingTimelineBar";
import { CustomerInfoCard } from "./CustomerInfoCard";
import { VehicleUnitCard } from "./VehicleUnitCard";
import { DriverAllocationCard } from "./DriverAllocationCard";
import { LepasKunciDocumentReviewCard } from "./LepasKunciDocumentReviewCard";
import { BillingLineItemsCard } from "./BillingLineItemsCard";
import { RefundSummaryCard } from "./RefundSummaryCard";
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
  const queryClient = useQueryClient();

  /*
   * Daftar item tagihan hanya DIBACA, tidak lagi diubah di sisi klien.
   *
   * Sebelumnya penyesuaian biaya ditambahkan ke state ini, sehingga barisnya
   * hilang begitu halaman dimuat ulang dan tampilan bisa berbeda dari isi
   * database. Sekarang sumbernya data server: setelah menyimpan atau
   * membatalkan, tampilan disegarkan lewat `router.refresh()`.
   */
  const items = useMemo<LineItem[]>(() => {
    /* Baris sewa dan jasa supir tidak lagi ditambahkan di sini: keduanya
       dihitung sistem dari katalog dan ditampilkan langsung oleh
       BillingLineItemsCard. Yang tersisa hanya penyesuaian manual. */
    return [...booking.lineItems];
  }, [booking.lineItems]);

  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [rawStatus, setRawStatus] = useState<CanonicalBookingStatus>(
    booking.rawStatus ?? "CREATED",
  );
  /**
   * Tarif jasa supir global dibaca dari server, bukan ditulis di kode.
   * Angka final tetap dihitung server saat konfirmasi; nilai di sini hanya
   * perkiraan yang ditampilkan sebelum admin menekan tombol konfirmasi.
   */
  const { data: tarifGlobal } = useQuery({
    queryKey: ["tariffSettings"],
    queryFn: async (): Promise<{ driverDailyRate: number }> => {
      const res = await apiClient.get("/admin/fleet/tariff-settings");
      return (res.data?.data ?? res.data) as { driverDailyRate: number };
    },
    staleTime: 5 * 60 * 1000,
  });

  const driverDailyRate = tarifGlobal?.driverDailyRate ?? 0;

  /**
   * Tarif pesanan.
   *
   * Sebelum konfirmasi, angkanya perkiraan dari katalog: harga sewa unit ×
   * jumlah hari, ditambah jasa supir bila pesanan memakai supir. Setelah
   * dikonfirmasi, yang dipakai adalah nominal yang tersimpan di server supaya
   * layar tidak pernah menampilkan angka berbeda dari yang ditagihkan.
   */
  const quotedAmount = useMemo(() => {
    if (booking.quotedAmount !== null && booking.quotedAmount !== undefined) {
      return Number(booking.quotedAmount);
    }

    const hargaKatalog = Number(booking.pricePerDay ?? 0);
    if (hargaKatalog <= 0) return 0;

    const hari = booking.dayCount || 1;
    const jasaSupir = booking.mode === "dengan_supir" ? driverDailyRate * hari : 0;
    return hargaKatalog * hari + jasaSupir;
  }, [booking.quotedAmount, booking.pricePerDay, booking.dayCount, booking.mode, driverDailyRate]);
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
  /* Pembatalan pesanan yang sudah dikonfirmasi. Dipisah dari penolakan karena
     statusnya berbeda: `CANCELLED` (pesanan berjalan dibatalkan) versus
     `REJECTED` (permintaan belum pernah diterima). */
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [surchargeToDelete, setSurchargeToDelete] = useState<LineItem | null>(null);
  const [isDeletingSurcharge, setIsDeletingSurcharge] = useState(false);
  const { show, node } = useToast();

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
    refetchInterval: 10_000,
  });

  /* Penyesuaian biaya hanya boleh di tahap penetapan tarif. Di tahap 1
     (CREATED) pesanan belum diterima, jadi belum ada tarif yang bisa
     disesuaikan; setelah CONFIRMED totalnya sudah dikunci dan ditagihkan. */
  const canDecide = rawStatus === "PENDING_CONFIRMATION";
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
    /* Setelah tarif ditetapkan, server sudah mengunci angka akhirnya di
       `finalAmount`. Memakai hitungan lokal di atasnya akan membuat layar
       berbeda dari tagihan begitu ada baris penyesuaian yang dibatalkan. */
    if (booking.finalAmount !== null && booking.finalAmount !== undefined) {
      return Number(booking.finalAmount);
    }

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
  }, [booking.finalAmount, quotedAmount, items]);

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

  function handleRemoveSurcharge(itemId: string) {
    const found = items.find((item) => item.id === itemId);
    setSurchargeToDelete(
      found ?? {
        id: itemId,
        label: "Penyesuaian biaya manual",
        amount: null,
        kind: "penyesuaian",
      },
    );
  }

  async function confirmRemoveSurcharge() {
    if (!surchargeToDelete) return;
    setIsDeletingSurcharge(true);
    try {
      const res = await cancelBookingLineItemAction(booking.id, surchargeToDelete.id);
      if (res.success) {
        setSurchargeToDelete(null);
        router.refresh();
        show(res.message ?? "Penyesuaian biaya dibatalkan.");
      } else {
        show(res.message ?? "Gagal membatalkan penyesuaian biaya.", "error");
      }
    } finally {
      setIsDeletingSurcharge(false);
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
      } else {
        show(result.message ?? "Gagal menugaskan supir resmi.", "error");
      }
    });
  }

  const hasAssignedDriver = Boolean(
    assignedDriverName || (selectedDriverId && availableDrivers.some((d) => d.id === selectedDriverId)),
  );

  /**
   * Tahap 1: menerima permintaan masuk.
   *
   * Memindahkan CREATED -> PENDING_CONFIRMATION. Sebelumnya tombol langsung
   * mengirim CONFIRMED, sehingga backend menolaknya dengan pesan
   * "tidak bisa berpindah dari CREATED ke CONFIRMED" — karena tahap ini memang
   * tidak pernah dilewati oleh antarmuka.
   */
  function handleAcceptRequest() {
    startTransition(async () => {
      const result = await updateBookingStatusAction(
        booking.id,
        "PENDING_CONFIRMATION",
        "Permintaan sewa diterima. Menunggu penetapan tarif oleh admin.",
      );

      if (result.success) {
        setRawStatus("PENDING_CONFIRMATION");
        setStatus("perlu_konfirmasi_tarif");
        show(result.message ?? "Permintaan diterima. Lanjutkan ke penetapan tarif.");
      } else {
        show(result.message ?? "Gagal menerima permintaan.", "error");
      }
    });
  }

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
        "Tarif disepakati dan dikonfirmasi admin.",
      );

      if (result.success) {
        setRawStatus("CONFIRMED");
        setStatus("tarif_terkonfirmasi");
        show(result.message ?? "Tarif sewa resmi berhasil dikonfirmasi.");
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

  // Pembatalan pesanan yang sudah dikonfirmasi (tahap bayar / serah terima)
  function handleCancelBooking() {
    if (!cancelReason.trim()) {
      show("Tuliskan alasan pembatalan terlebih dahulu.", "error");
      return;
    }

    startTransition(async () => {
      const result = await updateBookingStatusAction(
        booking.id,
        "CANCELLED",
        cancelReason.trim(),
      );

      if (result.success) {
        setRawStatus("CANCELLED");
        setStatus("ditolak");
        setShowCancelModal(false);
        show(result.message ?? "Pesanan dibatalkan.");
      } else {
        show(result.message ?? "Gagal membatalkan pesanan.", "error");
      }
    });
  }

  // Transisi siklus hidup pesanan lanjutan (CONFIRMED -> IN_PROGRESS -> COMPLETED)
  function handleTransitionStatus(nextStatus: CanonicalBookingStatus, note?: string) {
    startTransition(async () => {
      const result = await updateBookingStatusAction(
        booking.id,
        nextStatus,
        note,
      );

      if (result.success) {
        setRawStatus(nextStatus);
        show(result.message ?? `Status berhasil diperbarui ke ${nextStatus}.`);
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
    queryClient.invalidateQueries({ queryKey: ["paymentByBooking", booking.id] });
    queryClient.invalidateQueries({ queryKey: ["adminPayments"] });
    if (action === "APPROVE" && rawStatus === "CONFIRMED") {
      setStatus("siap_serah_terima");
    }
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
          {/* Bukti transfer yang menunggu pemeriksaan diberi jalan pintas di
              atas halaman. Tanpa ini admin harus pindah ke tab "Verifikasi
              Pembayaran", mencari pesanan yang sama, lalu kembali ke sini. */}
          {dataPembayaran?.status === "PENDING_VERIFICATION" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-meta font-semibold text-amber-900">
                  Bukti transfer sudah diunggah, menunggu pemeriksaan
                </p>
                <p className="mt-0.5 text-micro text-amber-800">
                  Periksa mutasi rekening, lalu setujui atau tolak bukti bayar.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-amber-400 bg-surface font-semibold text-amber-900 hover:bg-amber-100"
                onClick={() => setVerifikasiTerbuka(true)}
              >
                Periksa Bukti Pembayaran
              </Button>
            </div>
          ) : null}

          {/* Modul 1: Bar Visual Timeline Alur Pemesanan */}
          <BookingTimelineBar
            rawStatus={rawStatus}
            paymentStatus={dataPembayaran?.status ?? booking.payment?.status ?? null}
            rejectionReason={rawStatus === "REJECTED" ? rejectReason || null : null}
          />

          {/* Modul 2: Kartu Informasi Pelanggan & Pemesanan */}
          <CustomerInfoCard booking={booking} />

          {/* Modul 3: Bagian Armada (nama unit + plat nomor) */}
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
              disabled={rawStatus !== "CREATED" && rawStatus !== "PENDING_CONFIRMATION"}
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
            pricePerDay={booking.pricePerDay}
            dayCount={booking.dayCount}
            isDriverService={isDriverService}
            driverDailyRate={driverDailyRate}
            tarifTerkonfirmasi={
              booking.quotedAmount !== null &&
              booking.quotedAmount !== undefined &&
              Number(booking.quotedAmount) > 0
            }
            totalCleanBill={totalCleanBill}
            canDecide={canDecide}
            onOpenSurcharge={() => setSurchargeOpen(true)}
            onRemoveSurcharge={handleRemoveSurcharge}
          />

          {/* Pesanan yang batal/ditolak setelah dibayar menimbulkan kewajiban
              mengembalikan uang. Nominalnya dihitung server saat pembatalan,
              jadi yang ditampilkan di sini adalah angka yang tersimpan. */}
          {booking.refund ? <RefundSummaryCard refund={booking.refund} /> : null}
        </div>

        {/* Kolom Kanan: Sticky Action Sidebar (~35% / col-span-4) */}
        <div className="min-w-0 lg:col-span-4 lg:sticky lg:top-6 lg:self-start max-h-[calc(100vh-3rem)] overflow-y-auto">
          <BookingActionSidebar
            booking={
              dataPembayaran
                ? {
                    ...booking,
                    payment: {
                      id: dataPembayaran.id,
                      status: dataPembayaran.status,
                      proofImageUrl: dataPembayaran.proofImageUrl ?? booking.payment?.proofImageUrl,
                      method: dataPembayaran.method,
                      totalAmount: dataPembayaran.totalAmount,
                    },
                  }
                : booking
            }
            document={document}
            status={status}
            rawStatus={rawStatus}
            driverDailyRate={driverDailyRate}
            totalCleanBill={totalCleanBill}
            hasAssignedDriver={hasAssignedDriver}
            isDriverService={isDriverService}
            isPending={isPending}
            onAcceptRequest={handleAcceptRequest}
            onConfirmBooking={handleConfirmBooking}
            onOpenRejectModal={() => setShowRejectModal(true)}
            onTransitionStatus={handleTransitionStatus}
            onOpenPaymentVerification={
              dataPembayaran ? () => setVerifikasiTerbuka(true) : undefined
            }
            onOpenCancelModal={() => setShowCancelModal(true)}
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
                Alasan penolakan <span className="text-danger">*</span>
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

      {/* Modal Dialog Konfirmasi Pembatalan Pesanan */}
      {showCancelModal ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-md border border-rule bg-surface p-5 shadow-lg">
            <h3 className="text-subtitle font-bold text-ink">Batalkan Pesanan?</h3>
            <p className="mt-1.5 text-meta text-ink-soft">
              Pesanan <strong className="text-ink">{booking.code}</strong> atas nama{" "}
              <strong className="text-ink">{booking.customerName}</strong> akan ditutup dan
              armadanya kembali ke katalog. Tindakan ini tidak bisa dibatalkan.
            </p>

            <div className="mt-3.5 space-y-1.5">
              <label
                htmlFor="cancel-reason-modal"
                className="block text-meta font-medium text-ink"
              >
                Alasan pembatalan <span className="text-danger">*</span>
              </label>
              <AutoGrowTextarea
                maxHeight={200}
                id="cancel-reason-modal"
                maxLength={300}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Pelanggan mengonfirmasi batal lewat telepon / indikasi penipuan saat pemeriksaan bukti transfer."
                className="w-full rounded-sm border border-rule-strong bg-canvas p-2.5 text-body text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
              />
              <p className="text-right text-micro text-ink-soft">
                {cancelReason.length}/300 karakter
              </p>
            </div>

            <div className="mt-4 flex justify-end gap-2.5">
              <Button
                variant="outline"
                size="md"
                disabled={isPending}
                onClick={() => setShowCancelModal(false)}
              >
                Kembali
              </Button>
              <Button
                variant="danger"
                size="md"
                disabled={isPending || !cancelReason.trim()}
                onClick={handleCancelBooking}
              >
                {isPending ? "Membatalkan..." : "Ya, Batalkan Pesanan"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Verifikasi Pembayaran dari halaman detail. `key` mengikat state modal
          ke pembayaran yang sedang dibuka, sama seperti di antrean pembayaran,
          supaya centang "Dana sudah masuk" tidak terbawa ke pesanan lain. */}
      <PaymentProofModal
        key={`${dataPembayaran?.id ?? "tanpa-pembayaran"}-${dataPembayaran?.status ?? ""}-${dataPembayaran?.updatedAt ?? ""}`}
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

      {/* Modal Konfirmasi Hapus Biaya Tambahan */}
      <Modal
        open={Boolean(surchargeToDelete)}
        onClose={() => {
          if (!isDeletingSurcharge) setSurchargeToDelete(null);
        }}
        title="Hapus Biaya Tambahan?"
        description="Penyesuaian manual yang dihapus akan dilepas dari total tagihan pesanan ini."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isDeletingSurcharge}
              onClick={() => setSurchargeToDelete(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={isDeletingSurcharge}
              onClick={confirmRemoveSurcharge}
            >
              {isDeletingSurcharge ? "Menghapus..." : "Ya, Hapus Biaya"}
            </Button>
          </>
        }
      >
        {surchargeToDelete ? (
          <div className="rounded-sm border border-rule bg-canvas p-3 text-meta">
            <p className="font-semibold text-ink">{surchargeToDelete.label}</p>
            {surchargeToDelete.note ? (
              <p className="mt-1 text-micro text-ink-soft">{surchargeToDelete.note}</p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
