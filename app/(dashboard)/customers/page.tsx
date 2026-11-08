import type { Metadata } from "next";
import { CustomerAccountsTable } from "@/components/customers/CustomerAccountsTable";
import { getCustomerAccounts } from "@/lib/api";

export const metadata: Metadata = {
  title: "Akun Pelanggan | MobilJuragan",
  description:
    "Penelusuran dan pemulihan identitas akun pelanggan MobilJuragan Merauke.",
};

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const { items, pagination } = await getCustomerAccounts();

  return <CustomerAccountsTable initialItems={items} initialTotal={pagination.total} />;
}
