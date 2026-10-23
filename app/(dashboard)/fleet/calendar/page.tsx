import type { Metadata } from "next";
import { FleetTimelineCalendar } from "@/components/fleet/FleetTimelineCalendar";
import { getFleetCalendar } from "@/lib/operations";

export const metadata: Metadata = {
  title: "Kalender Armada | MobilJuragan",
  description:
    "Matriks jadwal dan ketersediaan sembilan unit armada MobilJuragan Merauke secara real-time.",
};

// Jadwal sewa berubah mengikuti pemesanan aktif, jadi data diambil segar tiap request.
export const dynamic = "force-dynamic";

export default async function FleetCalendarPage() {
  const calendar = await getFleetCalendar();

  return <FleetTimelineCalendar calendar={calendar} />;
}
