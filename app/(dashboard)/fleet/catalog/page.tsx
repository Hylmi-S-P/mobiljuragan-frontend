import type { Metadata } from "next";
import { VehicleCatalogTable } from "@/components/fleet/VehicleCatalogTable";
import { getAllVehicles, getRentedVehicleIds } from "@/lib/operations";

export const metadata: Metadata = {
  title: "Katalog Armada | MobilJuragan",
  description:
    "Katalog resmi armada MobilJuragan Merauke beserta spesifikasi, plat nomor, dan ketersediaan unit.",
};

// Daftar armada harus mengikuti kondisi terkini di MariaDB, jadi dirender ulang tiap request.
export const dynamic = "force-dynamic";

export default async function FleetCatalogPage() {
  /* Dua permintaan berjalan bersamaan: daftar unit dan unit yang sedang tersewa.
     Keduanya tidak saling bergantung, jadi tidak perlu berurutan. */
  const [vehicles, rentedIds] = await Promise.all([getAllVehicles(), getRentedVehicleIds()]);

  return (
    <VehicleCatalogTable initialVehicles={vehicles} rentedVehicleIds={[...rentedIds]} />
  );
}
