export type NavLink = { label: string; href: string };
export type NavGroup = { label: string; items: NavLink[] };
export type NavEntry = NavLink | NavGroup;

export const WORKSPACE_NAME = "CV. Mobil Juragan Express Transport";
export const WORKSPACE_ROLE = "Portal admin";

/* Grup "Manajemen Armada" tidak punya halaman sendiri, jadi kepala grup
   dirender sebagai tombol akordeon, bukan tautan. */
export const NAV_ENTRIES: NavEntry[] = [
  { label: "Dashboard", href: "/" },
  { label: "Pemesanan Masuk", href: "/bookings" },
  { label: "Verifikasi Pembayaran", href: "/payments" },
  {
    label: "Manajemen Armada",
    items: [
      { label: "Katalog", href: "/fleet/catalog" },
      { label: "Kalender Armada", href: "/fleet/calendar" },
      { label: "Manajemen Supir", href: "/fleet/drivers" },
    ],
  },
  { label: "Customer Care", href: "/customer-care" },
  { label: "Laporan Keuangan", href: "/finance" },
  { label: "AI HUB", href: "/admin/ai-hub" },
  { label: "Manajemen FAQ", href: "/faqs" },
  { label: "Manajemen Admin", href: "/admin" },
];

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

export function navLinks(entries: NavEntry[] = NAV_ENTRIES): NavLink[] {
  return entries.flatMap((entry) => (isNavGroup(entry) ? entry.items : [entry]));
}

/* Halaman rujukan keadaan kosong dan galat tidak masuk navigasi utama,
   tapi tetap punya judul topbar sendiri. */
const EXTRA_PAGE_TITLES: Record<string, string> = {
  "/empty": "Empty State",
  "/error-boundary": "Error State",
  "/payments": "Verifikasi Pembayaran",
};

export function pageTitleFor(pathname: string): string {
  if (/^\/bookings\/.+/.test(pathname)) return "Detail Pemesanan";
  if (/^\/payments(\/.*)?$/.test(pathname)) return "Verifikasi Pembayaran";
  if (EXTRA_PAGE_TITLES[pathname]) return EXTRA_PAGE_TITLES[pathname];
  return navLinks().find((link) => link.href === pathname)?.label ?? "MobilJuragan";
}
