import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerAccountsTable } from "@/components/customers/CustomerAccountsTable";
import { getCurrentAdminProfile, getCustomerAccounts } from "@/lib/api";

export const metadata: Metadata = {
  title: "Akun Pelanggan | MobilJuragan",
  description:
    "Penelusuran dan pemulihan identitas akun pelanggan MobilJuragan Merauke.",
};

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const profile = await getCurrentAdminProfile();
  if (profile?.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const { items, pagination } = await getCustomerAccounts();

  return <CustomerAccountsTable initialItems={items} initialTotal={pagination.total} />;
}
