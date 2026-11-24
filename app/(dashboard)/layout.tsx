import { DashboardShell } from "@/components/layout/DashboardShell";
import { getCurrentAdminProfile } from "@/lib/api";
import { getNavCounts } from "@/lib/navCounts";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  /* Angka sidebar diambil sekali di tata letak, bukan per halaman, supaya tidak
     berubah-ubah saat berpindah menu. */
  const [{ counts: navCounts, details: navDetails }, adminProfile] = await Promise.all([
    getNavCounts(),
    getCurrentAdminProfile(),
  ]);

  return (
    <DashboardShell
      navCounts={navCounts}
      navDetails={navDetails}
      userRole={adminProfile?.role ?? "ADMIN"}
    >
      {children}
    </DashboardShell>
  );
}
