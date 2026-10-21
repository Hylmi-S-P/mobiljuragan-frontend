import type { Metadata } from "next";
import { PaymentVerificationHub } from "@/components/payments/PaymentVerificationHub";
import { getAdminPayments } from "@/lib/operations";
import type { AdminPaymentsResponse } from "@/lib/types";

export const metadata: Metadata = {
  title: "Verifikasi Pembayaran | MobilJuragan",
  description:
    "Antrean verifikasi bukti transfer bank, pencocokan nominal mutasi unik, dan validasi pelunasan sewa armada CV. Mobil Juragan Express Transport Merauke.",
};

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  let initialData: AdminPaymentsResponse = {
    items: [],
    pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
  };

  try {
    initialData = await getAdminPayments({ limit: 100 });
  } catch {
    // Fallback ke objek kosong jika backend belum aktif saat proses SSR/build
    initialData = {
      items: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
    };
  }

  return <PaymentVerificationHub initialResponse={initialData} />;
}
