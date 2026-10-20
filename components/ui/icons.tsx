/**
 * Ikon SVG yang digambar sendiri untuk dashboard admin.
 *
 * Satu keluarga, satu ketebalan garis (1.5), satu ukuran dasar 20px, dan selalu memakai
 * `currentColor` supaya ikut warna teks di sekitarnya. Sengaja tidak memakai emoji atau
 * glyph unicode sebagai ikon, karena itu terbaca sebagai tempelan, bukan sistem.
 */
type IconProps = {
  className?: string;
};

function Svg({ children, className = "h-5 w-5" }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

/** Ringkasan: papan pantau empat bidang. */
export function IconDashboard({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="3" width="7.5" height="9" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.5" />
      <rect x="3" y="15" width="7.5" height="6" rx="1.5" />
    </Svg>
  );
}

/** Pemesanan masuk: baki surat. */
export function IconInbox({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 13h4l1.5 2.5h7L17 13h4" />
      <path d="M5 4.5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" />
    </Svg>
  );
}

/** Laporan keuangan: grafik tren naik & arus kas. */
export function IconTrendingUp({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </Svg>
  );
}

/** AI & RAG Hub: kilau cerdas / model AI. */
export function IconSparkles({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m12 3 1.9 4.8L18.7 9.7l-4.8 1.9L12 16.4l-1.9-4.8-4.8-1.9 4.8-1.9L12 3Z" />
      <path d="M19 16l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
    </Svg>
  );
}

/** Armada: mobil tampak samping. */
export function IconCar({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 16.5v-3.2l1.9-4.4A2 2 0 0 1 6.7 7.6h10.6a2 2 0 0 1 1.8 1.3l1.9 4.4v3.2" />
      <path d="M3 16.5h18" />
      <path d="M6.5 16.5v2M17.5 16.5v2" />
      <path d="M6 13h12" />
    </Svg>
  );
}

/** Kalender armada. */
export function IconCalendar({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10.5h17" />
      <path d="M8 14.5h3M8 17.5h6" />
    </Svg>
  );
}

/** Roster supir. */
export function IconUsers({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="9.5" cy="8" r="3.3" />
      <path d="M3.5 20v-1.2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4V20" />
      <path d="M16.2 5.4a3.3 3.3 0 0 1 0 5.9" />
      <path d="M18 14.9a4 4 0 0 1 2.5 3.7V20" />
    </Svg>
  );
}

/** Customer care: gelembung percakapan. */
export function IconChat({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M20 15.5a2 2 0 0 1-2 2H8.5L4 21V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />
      <path d="M8.5 9h7M8.5 12.5h4.5" />
    </Svg>
  );
}

/** Akun admin. */
export function IconShield({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3.2 19 6v6.1c0 4.3-2.9 7.7-7 8.7-4.1-1-7-4.4-7-8.7V6l7-2.8Z" />
      <path d="M9.3 12.1l1.9 1.9 3.5-3.7" />
    </Svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8 20.5 20.5" />
    </Svg>
  );
}

/** Ikon pengguna pada kolom username di halaman masuk. */
export function IconUser({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 20v-1.25a6.5 6.5 0 0 1 13 0V20" />
    </Svg>
  );
}

/** Mata untuk memperlihatkan atau menyamarkan kata sandi. */
export function IconEye({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2.5 12s3.25-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.25 5.5-9.5 5.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </Svg>
  );
}

/** Mata tertutup saat kata sandi ditampilkan. */
export function IconEyeOff({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m3 3 18 18" />
      <path d="M10.6 6.65A10.8 10.8 0 0 1 12 6.5c6.25 0 9.5 5.5 9.5 5.5a16.3 16.3 0 0 1-3.15 3.65M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.25 5.5 9.5 5.5c1.2 0 2.25-.2 3.2-.55" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 5.5v13M5.5 12h13" />
    </Svg>
  );
}

export function IconPencil({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 20h4.2L19 9.2 14.8 5 4 15.8V20Z" />
      <path d="M13.6 6.2 17.8 10.4" />
    </Svg>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h16" />
      <path d="M9.5 7V4.8h5V7" />
      <path d="M6.2 7l.9 12.2h9.8L17.8 7" />
      <path d="M10.2 11v5M13.8 11v5" />
    </Svg>
  );
}

export function IconChevronDown({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 9.5 12 15.5 18 9.5" />
    </Svg>
  );
}

export function IconArrowRight({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4.5 12h14" />
      <path d="M13 6.5 18.5 12 13 17.5" />
    </Svg>
  );
}

export function IconAlert({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 4.4 21 19.6H3L12 4.4Z" />
      <path d="M12 10v4M12 17h.01" />
    </Svg>
  );
}

/** Rute penugasan supir. */
export function IconRoute({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.5 6h5.5a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6h5.5" />
    </Svg>
  );
}

/** Surat perintah jalan. */
export function IconClipboard({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9.5 4V2.8h5V4" />
      <path d="M9 10h6M9 14h4" />
    </Svg>
  );
}

export function IconClose({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" />
    </Svg>
  );
}

export function IconMenu({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}
