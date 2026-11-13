import type { Metadata } from "next";
import { RefundQueue } from "@/components/refunds/RefundQueue";
import { getRefunds } from "@/lib/operations";
import type { BookingRefund, RefundStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Pengembalian Dana | MobilJuragan",
  description:
    "Antrean pengembalian dana pesanan yang dibatalkan setelah dibayar pada CV. Mobil Juragan Express Transport Merauke.",
};

export const dynamic = "force-dynamic";

const STATUS_SAH: RefundStatus[] = ["MENUNGGU", "DIPROSES", "SELESAI"];

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function RefundsPage({ searchParams }: PageProps) {
  const parameter = searchParams ? await searchParams : undefined;
  const status = STATUS_SAH.find((nilai) => nilai === parameter?.status);

  /* Data uang harus selalu dari database. Kalau backend sedang tidak bisa
     dihubungi, halaman tetap tampil dengan antrean kosong dan pesan jujur,
     bukan daftar contoh yang bisa dibaca sebagai transaksi sungguhan. */
  let refunds: BookingRefund[] = [];
  let galat: string | null = null;

  try {
    refunds = await getRefunds({ status });
  } catch {
    galat = "Antrean pengembalian dana gagal dimuat. Coba muat ulang halaman.";
  }

  return (
    <div className="flex flex-col gap-6">
      <RefundQueue initialRefunds={refunds} statusAwal={status ?? null} galat={galat} />
    </div>
  );
}
