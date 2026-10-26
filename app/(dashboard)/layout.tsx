import { DashboardShell } from "@/components/layout/DashboardShell";
import { getNavCounts } from "@/lib/navCounts";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  /* Angka sidebar diambil sekali di tata letak, bukan per halaman, supaya tidak
     berubah-ubah saat berpindah menu. */
  const navCounts = await getNavCounts();

  return <DashboardShell navCounts={navCounts}>{children}</DashboardShell>;
}
