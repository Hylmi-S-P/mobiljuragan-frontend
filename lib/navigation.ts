export type NavLink = { label: string; href: string; adminOnly?: boolean };
export type NavGroup = { label: string; items: NavLink[]; adminOnly?: boolean };
export type NavEntry = NavLink | NavGroup;

export const WORKSPACE_NAME = "CV. Mobil Juragan Express Transport";
export const WORKSPACE_ROLE = "Portal Super Admin";

/* Grup "Manajemen Armada" tidak punya halaman sendiri, jadi kepala grup
   dirender sebagai tombol akordeon, bukan tautan. */
export const NAV_ENTRIES: NavEntry[] = [
  { label: "Dashboard", href: "/" },
  { label: "Pemesanan Masuk", href: "/bookings" },
  {
    label: "Manajemen Armada",
    items: [
      { label: "Katalog", href: "/fleet/catalog" },
      { label: "Kalender Armada", href: "/fleet/calendar" },
      { label: "Manajemen Supir", href: "/fleet/drivers" },
    ],
  },
  { label: "Customer Care", href: "/customer-care" },
  {
    /* Keperluan audit & pemulihan identitas, khusus Super Admin. */
    label: "Akun Pelanggan",
    adminOnly: true,
    items: [
      { label: "Daftar Akun", href: "/customers", adminOnly: true },
      { label: "Jejak Identitas", href: "/identity-audit", adminOnly: true },
    ],
  },
  { label: "Laporan Keuangan", href: "/finance" },
  /* Uang yang harus dikembalikan ke pelanggan. Diletakkan dekat laporan
     keuangan karena keduanya soal arus uang, tetapi halamannya terpisah:
     refund adalah daftar kerja, bukan laporan. */
  { label: "Pengembalian Dana", href: "/refunds" },
  { label: "Template Dokumen", href: "/documents", adminOnly: true },
  { label: "AI HUB", href: "/admin/ai-hub", adminOnly: true },
  { label: "Manajemen FAQ", href: "/faqs" },
  { label: "Manajemen Akun", href: "/admin", adminOnly: true },
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
  return (
    navLinks().find((link) => link.href === pathname || link.href.split("?")[0] === pathname)?.label ??
    "MobilJuragan"
  );
}
