import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminAccountsTable } from "@/components/admin/AdminAccountsTable";
import { getAdminAccounts, getCurrentAdminProfile } from "@/lib/api";

export const metadata: Metadata = {
  title: "Manajemen Akun | MobilJuragan",
  description: "Pengelolaan akun admin dan super admin portal operasional MobilJuragan Merauke.",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await getCurrentAdminProfile();
  if (profile?.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const accounts = await getAdminAccounts();

  return <AdminAccountsTable initialAccounts={accounts} />;
}
