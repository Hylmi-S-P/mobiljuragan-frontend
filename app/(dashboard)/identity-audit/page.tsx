import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IdentityAuditTable } from "@/components/customers/IdentityAuditTable";
import { getCurrentAdminProfile, getIdentityAudit } from "@/lib/api";

export const metadata: Metadata = {
  title: "Jejak Identitas | MobilJuragan",
  description:
    "Catatan perubahan nama dan kata sandi akun pelanggan untuk keperluan audit.",
};

export const dynamic = "force-dynamic";

export default async function IdentityAuditPage() {
  const profile = await getCurrentAdminProfile();
  if (profile?.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const { items, pagination } = await getIdentityAudit();

  return <IdentityAuditTable items={items} total={pagination.total} />;
}
