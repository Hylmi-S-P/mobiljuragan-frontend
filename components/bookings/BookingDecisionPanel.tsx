"use client";

import { useMemo, useState, useTransition } from "react";

import { assignDriverAction, updateBookingStatusAction } from "@/app/actions";
import { ManualSurchargeModal } from "@/components/modals/ManualSurchargeModal";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatRupiahDots, parseRupiahDots } from "@/lib/format";
import { AMOUNT_PLACEHOLDER, TARIFF_PENDING_NOTE } from "@/lib/uiText";
import { BOOKING_STATUS } from "@/lib/labels";
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

export function BookingDecisionPanel({
  booking,
  vehicle,
  availableDrivers = [],
}: Props) {
  const isDriverService = booking.mode === "dengan_supir";

  const [items, setItems] = useState<LineItem[]>(() => {
    // Susun item awal, sertakan breakdown supir jika layanan dengan supir
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
  const [quotedAmount, setQuotedAmount] = useState<number>(
    booking.quotedAmount ?? (isDriverService ? 750000 : 500000) * (booking.dayCount || 1),
  );
  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    booking.driverId ?? "",
  );
  const [assignedDriverName, setAssignedDriverName] = useState<string | null>(
    booking.driverName,
  );
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
  const isConfirmed = rawStatus === "CONFIRMED";
  const isInProgress = rawStatus === "IN_PROGRESS";
  const isCompleted = rawStatus === "COMPLETED";
  const isRejected = rawStatus === "REJECTED" || rawStatus === "CANCELLED";

  const statusMeta = BOOKING_STATUS[status] ?? {
    label: rawStatus,
    tone: "neutral" as const,
  };

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

  // Logika filter supir resmi:
  // 1. HANYA supir dengan status 'siaga' yang ditampilkan (supir sedang tugas / libur TIDAK MUNCUL).
  // 2. Disaring berdasarkan rute (Luar Kota vs Dalam Kota) sesuai pesanan.
  const eligibleDrivers = useMemo(() => {
    const siagaOnly = availableDrivers.filter((d) => d.status === "siaga");
    const routeMatched = siagaOnly.filter((d) =>
      isLuarKotaBooking ? d.route === "luar_kota" : d.route === "dalam_kota",
    );
    // Jika tidak ada supir siaga di rute spesifik, fallback ke seluruh supir siaga agar penugasan tidak terblokir
    return routeMatched.length > 0 ? routeMatched : siagaOnly;
  }, [availableDrivers, isLuarKotaBooking]);

  function applySurcharge(item: LineItem) {
    setItems((current) => [...current, item]);
    setSurchargeOpen(false);
  }

  // Penugasan supir otomatis saat dropdown dipilih (tanpa perlu tombol terpisah yang meluap)
  function handleAutoAssignDriver(driverId: string) {
    if (!driverId) return;

    startTransition(async () => {
      const result = await assignDriverAction(booking.id, driverId);
      if (result.success) {
        const chosen = availableDrivers.find((d) => d.id === driverId);
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

  function handleConfirmBooking() {
    startTransition(async () => {
      const result = await updateBookingStatusAction(
        booking.id,
        "CONFIRMED",
        quotedAmount,
        "Tarif disepakati dan dikonfirmasi admin.",
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

  function handleTransitionStatus(
    nextStatus: CanonicalBookingStatus,
    note?: string,
  ) {
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
    <section className="min-w-0 rounded-md border border-rule bg-surface">
      <div className="border-b border-rule px-4 py-3">
        <h3 className="text-body font-semibold text-ink">
          Armada &amp; Rincian Pembayaran
        </h3>
      </div>

      <div className="space-y-3.5 px-4 py-3.5">
        {notice ? (
          <p
            className={`rounded-sm border px-3 py-2 text-meta ${
              notice.isError
                ? "border-danger bg-danger/10 text-danger"
                : "border-teal/40 bg-canvas text-ink"
            }`}
          >
            {notice.text}
          </p>
        ) : null}

        {/* Informasi Kartu Armada */}
        <div className="flex items-start gap-3 rounded-sm border border-rule bg-canvas p-2.5">
          <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-sm border border-rule bg-surface text-micro font-semibold text-ink-soft">
            {vehicle.category ?? "Unit"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-meta font-semibold text-ink">{vehicle.name}</p>
            <p className="mt-0.5 text-micro text-ink-soft">Plat {vehicle.plate}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <StatusChip tone={vehicle.status === "tersedia" ? "available" : "neutral"}>
                {vehicle.status === "tersedia"
                  ? "Unit siap di kantor MobilJuragan"
                  : "Perlu cek unit"}
              </StatusChip>
              {isDriverService && assignedDriverName ? (
                <StatusChip tone="available">
                  {`Supir: ${assignedDriverName}`}
                </StatusChip>
              ) : null}
            </div>
          </div>
        </div>

        {/* Penugasan Supir (HANYA jika layanan Dengan Supir) */}
        {isDriverService ? (
          <div className="rounded-sm border border-rule bg-canvas p-3">
            <label
              htmlFor="driver-assignment-select"
              className="block text-meta font-semibold text-ink"
            >
              Penugasan Pengemudi Resmi Merauke
            </label>
            <p className="mt-0.5 text-micro text-ink-soft">
              Pilih supir berstatus Siaga ({isLuarKotaBooking ? "Rute Luar Kota" : "Rute Dalam Kota"}). Penugasan otomatis tersimpan saat dipilih.
            </p>

            <div className="mt-2.5 w-full min-w-0">
              <select
                id="driver-assignment-select"
                value={selectedDriverId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedDriverId(val);
                  if (val) handleAutoAssignDriver(val);
                }}
                disabled={isPending || isCompleted || isRejected}
                className="h-11 w-full rounded-sm border border-rule-strong bg-surface px-3 text-meta text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
              >
                <option value="">-- Pilih Supir Siaga --</option>
                {eligibleDrivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.label}
                  </option>
                ))}
              </select>

              {eligibleDrivers.length === 0 ? (
                <p className="mt-1.5 text-micro text-amber-700">
                  Perhatian: Tidak ada supir siaga untuk rute ini di roster operasional.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          /* Kartu Khusus Layanan Lepas Kunci (Tanpa Supir) */
          <div className="rounded-sm border border-rule bg-canvas p-3">
            <p className="text-meta font-semibold text-ink">
              Layanan Lepas Kunci (Self-Drive)
            </p>
            <p className="mt-0.5 text-micro text-ink-soft">
              Penyewa mengemudi secara mandiri tanpa penugasan supir. Pastikan verifikasi fisik SIM A aktif &amp; KTP asli saat serah terima unit di kantor.
            </p>
          </div>
        )}

        {/* Rincian Tagihan & Nominal Tarif */}
        <div>
          <p className="text-micro font-bold uppercase text-ink-soft">
            Rincian tagihan &amp; penyesuaian biaya
          </p>
          <ul className="mt-2 divide-y divide-rule">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 py-1.5"
              >
                <span className="min-w-0">
                  <span className="block text-meta text-ink">{item.label}</span>
                  {item.note ? (
                    <span className="mt-0.5 block text-micro text-ink-soft">
                      {item.note}
                    </span>
                  ) : null}
                </span>
                <span className="tabular-nums shrink-0 text-meta font-semibold text-ink">
                  {rawStatus !== "CREATED" && rawStatus !== "PENDING_CONFIRMATION"
                    ? `Rp ${quotedAmount.toLocaleString("id-ID")}`
                    : AMOUNT_PLACEHOLDER}
                </span>
              </li>
            ))}
          </ul>
          {canDecide ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-2.5"
              onClick={() => setSurchargeOpen(true)}
            >
              + Tambah Surcharge Manual
            </Button>
          ) : null}
        </div>

        {/* Input Pengesahan Tarif Resmi (Format Rupiah dengan Pemisah Titik Ribuan) */}
        {canDecide ? (
          <div className="rounded-sm border border-rule bg-canvas p-3">
            <label
              htmlFor="quoted-amount-input"
              className="block text-meta font-semibold text-ink"
            >
              Input Nominal Tarif Sewa Resmi
            </label>
            <div className="relative mt-1.5 flex items-center">
              <span className="inline-flex h-11 items-center rounded-l-sm border border-r-0 border-rule-strong bg-rule/20 px-3.5 text-body font-bold text-ink">
                Rp
              </span>
              <input
                id="quoted-amount-input"
                type="text"
                inputMode="numeric"
                value={quotedAmount ? formatRupiahDots(quotedAmount) : ""}
                onChange={(e) => {
                  const parsed = parseRupiahDots(e.target.value);
                  // Batasi maksimal Rp 100.000.000 agar realistis dan terhindar dari integer overflow
                  setQuotedAmount(Math.min(100000000, parsed));
                }}
                placeholder="Contoh: 750.000"
                className="tabular-nums h-11 w-full rounded-r-sm border border-rule-strong bg-surface px-3 text-body font-semibold text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <p className="mt-1.5 text-micro text-ink-soft">
              Pemisah ribuan titik otomatis terpasang (contoh:{" "}
              <strong className="text-ink">1.000.000</strong>). Nominal ini disahkan sebagai tagihan resmi dan otomatis tercantum pada pesan WhatsApp penyewa.
            </p>
          </div>
        ) : null}

        {/* Total Tagihan Bersih */}
        <div className="rounded-sm border border-rule bg-canvas px-3.5 py-2.5">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-micro font-bold uppercase text-ink-soft">
              Total tagihan bersih
            </span>
            <span className="text-subtitle font-bold text-ink">
              {rawStatus !== "CREATED" && rawStatus !== "PENDING_CONFIRMATION"
                ? `Rp ${quotedAmount.toLocaleString("id-ID")}`
                : AMOUNT_PLACEHOLDER}
            </span>
          </div>
          <p className="mt-1 text-micro text-ink-soft">
            {canDecide ? TARIFF_PENDING_NOTE : "Tarif resmi telah disahkan oleh tim."}
          </p>
        </div>

        {/* Tombol Aksi Sesuai Siklus Hidup Pesanan */}
        {canDecide ? (
          <div className="space-y-2.5">
            <Button
              variant="confirm"
              size="md"
              className="w-full"
              disabled={isPending}
              onClick={handleConfirmBooking}
            >
              {isPending ? "Memproses..." : "Konfirmasi Tarif & Setujui Booking"}
            </Button>

            <Button
              variant="outline"
              size="md"
              className="w-full border-rose-300 bg-rose-50/60 font-semibold text-rose-700 hover:border-rose-500 hover:bg-rose-100"
              onClick={() => setShowRejectModal(true)}
            >
              Tolak Permintaan Sewa
            </Button>
          </div>
        ) : null}

        {/* Tahap Lanjutan: Pembayaran & Serah Terima Unit */}
        {isConfirmed ? (
          <div className="space-y-2 rounded-sm border border-rule bg-canvas p-3">
            <p className="text-meta font-semibold text-ink">
              Tahap Selanjutnya: Serah Terima Unit
            </p>
            <p className="text-micro text-ink-soft">
              Setelah pembayaran terverifikasi atau COD disepakati, serahkan unit di titik jemput untuk memulai masa sewa.
            </p>
            <Button
              variant="confirm"
              size="md"
              className="w-full"
              disabled={isPending}
              onClick={() => handleTransitionStatus("IN_PROGRESS", "Unit diserahkan kepada penyewa.")}
            >
              {isPending ? "Memproses..." : "Serahkan Armada (Mulai Sewa Berjalan)"}
            </Button>
          </div>
        ) : null}

        {/* Tahap Lanjutan: Penyelesaian Sewa */}
        {isInProgress ? (
          <div className="space-y-2 rounded-sm border border-rule bg-canvas p-3">
            <p className="text-meta font-semibold text-ink">
              Tahap Penyelesaian: Pengembalian Armada
            </p>
            <p className="text-micro text-ink-soft">
              Periksa kondisi fisik unit, bahan bakar (BBM), dan lepaskan supir kembali ke status Siaga.
            </p>
            <Button
              variant="confirm"
              size="md"
              className="w-full"
              disabled={isPending}
              onClick={() => handleTransitionStatus("COMPLETED", "Unit dikembalikan dalam kondisi baik. Sewa selesai.")}
            >
              {isPending ? "Memproses..." : "Selesaikan Sewa & Kembalikan Armada"}
            </Button>
          </div>
        ) : null}

        {/* Tautan Konfirmasi WhatsApp Resmi */}
        {whatsappUrl ? (
          <div className="pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-[#25D366] bg-[#25D366]/10 text-body font-semibold text-[#128C7E] hover:bg-[#25D366]/20 transition-colors"
            >
              Buka Pesan WhatsApp Konfirmasi
            </a>
          </div>
        ) : null}

        <p className="text-micro text-ink-soft">
          Status pesanan sekarang:{" "}
          <StatusChip tone={statusMeta.tone}>{statusMeta.label} ({rawStatus})</StatusChip>
        </p>
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
                placeholder="Contoh: Jadwal bentrok dengan agenda dinas resmi / armada dalam perawatan berkala."
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

      {surchargeOpen ? (
        <ManualSurchargeModal
          onClose={() => setSurchargeOpen(false)}
          onApply={applySurcharge}
          booking={booking}
        />
      ) : null}
    </section>
  );
}
