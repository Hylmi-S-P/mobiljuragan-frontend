import type { Metadata } from "next";
import { IdentityAuditTable } from "@/components/customers/IdentityAuditTable";
import { getIdentityAudit } from "@/lib/api";

export const metadata: Metadata = {
  title: "Jejak Identitas | MobilJuragan",
  description:
    "Catatan perubahan nama dan kata sandi akun pelanggan untuk keperluan audit.",
};

export const dynamic = "force-dynamic";

export default async function IdentityAuditPage() {
  const { items, pagination } = await getIdentityAudit();

  return <IdentityAuditTable items={items} total={pagination.total} />;
}
