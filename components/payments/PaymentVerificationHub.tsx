"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Panel, PageLead } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import {
  IconArrowRight,
  IconCreditCard,
  IconSearch,
} from "@/components/ui/icons";
import { PaymentProofModal } from "@/components/payments/PaymentProofModal";
import { formatRupiah, formatDateTimeWit } from "@/lib/format";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS } from "@/lib/labels";
import { apiClient } from "@/lib/axios";
import { useDebounce } from "@/lib/useDebounce";
import type {
  AdminPaymentItem,
  AdminPaymentsResponse,
  PaymentStatus,
} from "@/lib/types";

type Props = {
  initialResponse?: AdminPaymentsResponse;
};

type TabFilter = "semua" | "menunggu" | "terbayar" | "ditolak";

export function PaymentVerificationHub({ initialResponse }: Props) {
  const queryClient = useQueryClient();

  // Ambil identitas staf/admin yang aktif login untuk modal verifikasi dan audit trail
  const { data: currentAdmin } = useQuery<{ id: string; fullName: string; role: string }>({
    queryKey: ["currentAdminMe"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/admin/auth/me");
        return res.data?.data?.user;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Search & Tab Filter States
  const [activeTab, setActiveTab] = useState<TabFilter>("menunggu");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Modal State
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Notification Toast State
  const [notice, setNotice] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  // TanStack Query for dynamic caching & syncing with backend
  const { data: response = initialResponse, isFetching } = useQuery<AdminPaymentsResponse>({
    queryKey: ["adminPayments", activeTab, debouncedSearch],
    queryFn: async (): Promise<AdminPaymentsResponse> => {
      const params: Record<string, string> = { limit: "100" };
      if (activeTab === "menunggu") {
        params.status = "PENDING_VERIFICATION";
      } else if (activeTab === "terbayar") {
        params.status = "PAID";
      } else if (activeTab === "ditolak") {
        params.status = "FAILED";
      }
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const res = await apiClient.get("/admin/payments", { params });
      return (res.data?.data || res.data) as AdminPaymentsResponse;
    },
    initialData: initialResponse,
    initialDataUpdatedAt: 0,
  });

  const rawItems = response?.items ?? [];

  // Hitung jumlah item per kategori dari keseluruhan data yang ada
  const counts = useMemo(() => {
    const all = rawItems.length;
    let pending = 0;
    let paid = 0;
    let rejected = 0;

    for (const item of rawItems) {
      if (item.status === "PENDING_VERIFICATION") pending++;
      else if (item.status === "PAID") paid++;
      else if (item.status === "FAILED" || item.status === "REFUNDED") rejected++;
    }

    return { all, pending, paid, rejected };
  }, [rawItems]);

  // Client-side fallback filter
  const displayedItems = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return rawItems.filter((item) => {
      // Filter tab
      if (activeTab === "menunggu" && item.status !== "PENDING_VERIFICATION") return false;
      if (activeTab === "terbayar" && item.status !== "PAID") return false;
      if (
        activeTab === "ditolak" &&
        item.status !== "FAILED" &&
        item.status !== "REFUNDED"
      )
        return false;

      // Filter search
      if (q.length === 0) return true;
      const bookingCode = item.booking?.bookingCode ?? "";
      const customerName = item.booking?.customer?.fullName ?? "";
      const phone = item.booking?.customer?.phoneNumber ?? "";
      const sender = item.senderAccount ?? "";
      const bank = item.bankName ?? "";

      return [bookingCode, customerName, phone, sender, bank].some((field) =>
        field.toLowerCase().includes(q),
      );
    });
  }, [rawItems, activeTab, debouncedSearch]);

  function handleOpenModal(item: AdminPaymentItem) {
    setSelectedPayment(item);
    setIsModalOpen(true);
  }

  function handleVerifySuccess(updated: AdminPaymentItem, action: "APPROVE" | "REJECT") {
    // Invalidate react-query cache to refresh payment list
    queryClient.invalidateQueries({ queryKey: ["adminPayments"] });

    const bookingCode = updated.booking?.bookingCode || "booking";
    if (action === "APPROVE") {
      setNotice({
        message: `Pembayaran ${bookingCode} berhasil disetujui. Status sewa kini tervalidasi lunas (PAID).`,
        type: "success",
      });
    } else {
      setNotice({
        message: `Bukti pembayaran ${bookingCode} telah ditolak.`,
        type: "error",
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Toast Notice */}
      {notice ? (
        <div
          className={`flex items-center justify-between rounded-sm border px-4 py-3 text-meta transition-all ${
            notice.type === "success"
              ? "border-teal/30 bg-teal/10 text-teal"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {notice.type === "success" ? "Berhasil:" : "Perhatian:"}
            </span>
            <span>{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-micro font-medium hover:underline"
          >
            Tutup
          </button>
        </div>
      ) : null}

      <Panel>
        {/* Controls: Search and Segmented Tab Filter */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Segmented Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 rounded-sm border border-rule bg-canvas p-1">
            <button
              type="button"
              onClick={() => setActiveTab("semua")}
              className={`rounded-xs px-3 py-1.5 text-meta font-medium transition-colors ${
                activeTab === "semua"
                  ? "bg-surface font-semibold text-ink shadow-xs"
                  : "text-ink-soft hover:bg-surface/50 hover:text-ink"
              }`}
            >
              Semua {counts.all > 0 ? `(${counts.all})` : ""}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("menunggu")}
              className={`rounded-xs px-3 py-1.5 text-meta font-medium transition-colors ${
                activeTab === "menunggu"
                  ? "bg-surface font-semibold text-ink shadow-xs"
                  : "text-ink-soft hover:bg-surface/50 hover:text-ink"
              }`}
            >
              Menunggu Verifikasi{" "}
              {counts.pending > 0 ? (
                <span className="ml-1 inline-flex items-center rounded-full bg-gold/40 px-1.5 py-0.2 text-micro font-bold text-ink">
                  {counts.pending}
                </span>
              ) : (
                ""
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("terbayar")}
              className={`rounded-xs px-3 py-1.5 text-meta font-medium transition-colors ${
                activeTab === "terbayar"
                  ? "bg-surface font-semibold text-ink shadow-xs"
                  : "text-ink-soft hover:bg-surface/50 hover:text-ink"
              }`}
            >
              Terbayar {counts.paid > 0 ? `(${counts.paid})` : ""}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ditolak")}
              className={`rounded-xs px-3 py-1.5 text-meta font-medium transition-colors ${
                activeTab === "ditolak"
                  ? "bg-surface font-semibold text-ink shadow-xs"
                  : "text-ink-soft hover:bg-surface/50 hover:text-ink"
              }`}
            >
              Ditolak {counts.rejected > 0 ? `(${counts.rejected})` : ""}
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[280px]">
            <input
              id="payment-search"
              maxLength={80}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode booking, nama, rekening..."
              className="h-10 w-full rounded-sm border border-rule bg-canvas pl-9 pr-3 text-meta text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
            <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-soft" />
          </div>
        </div>

        {/* Tabel Antrean Verifikasi Pembayaran */}
        <Table caption="Daftar Antrean Pembayaran dan Verifikasi Bukti Transfer MobilJuragan">
          <TableHead>
            <TableRow>
              <TableHeaderCell className="text-left">Kode & Jadwal</TableHeaderCell>
              <TableHeaderCell className="text-left">Pelanggan</TableHeaderCell>
              <TableHeaderCell>Metode Bayar</TableHeaderCell>
              <TableHeaderCell className="text-right">Nominal Pas</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Bukti Transfer</TableHeaderCell>
              <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {displayedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-ink-soft">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <IconCreditCard className="h-8 w-8 text-ink-soft/60" />
                    <p className="text-body font-medium text-ink">
                      {isFetching
                        ? "Memuat data pembayaran..."
                        : "Tidak ada transaksi pembayaran yang cocok"}
                    </p>
                    <p className="max-w-[42ch] text-meta text-ink-soft">
                      {debouncedSearch.trim()
                        ? `Tidak ada transaksi yang cocok dengan kata kunci "${debouncedSearch}". Coba ganti kata kunci pencarian.`
                        : activeTab === "menunggu"
                          ? "Semua bukti transfer telah diverifikasi. Tidak ada antrean pending saat ini."
                          : "Belum ada transaksi pada kategori ini."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayedItems.map((payment) => {
                const statusCfg = PAYMENT_STATUS[payment.status] ?? {
                  label: payment.status,
                  tone: "neutral" as const,
                };
                const hasProof = Boolean(payment.proofImageUrl);
                const isPending = payment.status === "PENDING_VERIFICATION";

                return (
                  <TableRow key={payment.id}>
                    {/* Kode Booking & Waktu */}
                    <TableCell className="text-left">
                      <div className="min-w-0">
                        <Link
                          href={`/bookings`}
                          className="font-semibold text-teal hover:underline"
                        >
                          {payment.booking?.bookingCode || payment.bookingId}
                        </Link>
                        <p className="text-micro text-ink-soft">
                          {formatDateTimeWit(payment.createdAt)}
                        </p>
                        {payment.booking?.vehicle ? (
                          <p className="truncate text-micro text-ink-soft">
                            {payment.booking.vehicle.name} ({payment.booking.vehicle.licensePlate})
                          </p>
                        ) : null}
                      </div>
                    </TableCell>

                    {/* Pelanggan */}
                    <TableCell className="text-left">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">
                          {payment.booking?.customer?.fullName || "Pelanggan"}
                        </p>
                        <p className="text-micro text-ink-soft">
                          {payment.booking?.customer?.phoneNumber || "-"}
                        </p>
                      </div>
                    </TableCell>

                    {/* Metode & Bank */}
                    <TableCell>
                      <div className="inline-flex flex-col items-center">
                        <span className="text-meta font-medium text-ink">
                          {PAYMENT_METHOD_LABEL[payment.method] || payment.method}
                        </span>
                        {payment.bankName ? (
                          <span className="text-micro text-ink-soft">{payment.bankName}</span>
                        ) : null}
                      </div>
                    </TableCell>

                    {/* Nominal Pas (Dengan Kode Unik) */}
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-ink tabular-nums">
                          {formatRupiah(payment.totalAmount)}
                        </span>
                        <span className="text-micro text-ink-soft tabular-nums">
                          Tarif: {formatRupiah(payment.baseAmount)} (+{payment.uniqueCode})
                        </span>
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <StatusChip tone={statusCfg.tone}>{statusCfg.label}</StatusChip>
                      {payment.acknowledgedBy ? (
                        <p
                          className="mt-1 max-w-[18ch] truncate text-micro text-ink-soft"
                          title={`Diverifikasi oleh: ${payment.acknowledgedBy}${payment.acknowledgedAt ? ` (${formatDateTimeWit(payment.acknowledgedAt)})` : ""}`}
                        >
                          Oleh: {payment.acknowledgedBy.split(" (")[0]}
                        </p>
                      ) : null}
                    </TableCell>

                    {/* Bukti Transfer */}
                    <TableCell>
                      {hasProof ? (
                        <button
                          type="button"
                          onClick={() => handleOpenModal(payment)}
                          className="inline-flex items-center gap-1 text-meta font-medium text-teal hover:underline"
                        >
                          Lihat Struk
                        </button>
                      ) : payment.method === "QRIS" ? (
                        <span className="text-micro text-ink-soft">Otomatis QRIS</span>
                      ) : payment.method === "CASH" ? (
                        <span className="text-micro text-ink-soft">Tunai di Tempat</span>
                      ) : (
                        <span className="text-micro text-ink-soft">Belum Ada</span>
                      )}
                    </TableCell>

                    {/* Aksi */}
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(payment)}
                        className={`inline-flex items-center gap-1 rounded-sm px-2.5 py-1 text-meta font-medium transition-colors ${
                          isPending
                            ? "bg-navy text-white hover:bg-navy-hover"
                            : "border border-rule bg-canvas text-ink hover:border-navy hover:text-navy"
                        }`}
                      >
                        <span>{isPending ? "Periksa" : "Rincian"}</span>
                        <IconArrowRight className="h-3 w-3" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Panel>

      {/* Modal Pemeriksaan Bukti & Verifikasi Pembayaran.
          `key` mengikat state modal ke pembayaran yang sedang dibuka. Tanpa ini,
          centang "sudah dicocokkan" dan tahap konfirmasi terbawa ke pembayaran
          berikutnya, sehingga admin bisa menandai lunas tanpa membaca peringatan. */}
      <PaymentProofModal
        key={selectedPayment?.id ?? "tanpa-pembayaran"}
        open={isModalOpen}
        payment={selectedPayment}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPayment(null);
        }}
        onSuccess={handleVerifySuccess}
        currentAdmin={currentAdmin}
      />
    </div>
  );
}
