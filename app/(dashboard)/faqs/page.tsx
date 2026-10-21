import type { Metadata } from "next";
import { FaqManagementHub } from "@/components/faqs/FaqManagementHub";
import { getAdminFaqs } from "@/lib/api";
import type { FaqItem } from "@/lib/types";

export const metadata: Metadata = {
  title: "Manajemen FAQ | MobilJuragan",
  description:
    "Pengelolaan daftar tanya jawab pelanggan, pengaturan kategori, prioritas tampilan, dan status visibilitas mobile.",
};

export const dynamic = "force-dynamic";

export default async function FaqsPage() {
  let faqs: FaqItem[] = [];
  try {
    faqs = await getAdminFaqs();
  } catch {
    // Fallback ke array kosong jika backend belum aktif saat SSR
    faqs = [];
  }

  return <FaqManagementHub initialFaqs={faqs} />;
}
