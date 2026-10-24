const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/*
 * Merauke memakai Waktu Indonesia Timur (UTC+9). Zona ditulis eksplisit, bukan
 * mengikuti jam mesin, karena dua alasan: server dan klien bisa berada di zona
 * berbeda sehingga hasil render tidak cocok, dan tanggal sewa harus dibaca dalam
 * waktu setempat tempat armada dipakai.
 */
const ZONA_WIT = "Asia/Jayapura";

type BagianTanggal = { year: number; month: number; day: number };

/** Mengambil tahun/bulan/tanggal dari ISO sesuai zona WIT. */
function bagianTanggalWit(iso: string): BagianTanggal | null {
  const waktu = new Date(iso);
  if (Number.isNaN(waktu.getTime())) return null;

  const bagian = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_WIT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(waktu);

  const ambil = (jenis: string) => Number(bagian.find((item) => item.type === jenis)?.value);
  const year = ambil("year");
  const month = ambil("month");
  const day = ambil("day");

  if (!year || !month || !day) return null;
  return { year, month: month - 1, day };
}

/*
 * Format tanggal ditulis manual supaya hasil server dan klien selalu identik.
 * Tanggal yang tidak terbaca tidak membuat seluruh tabel gagal render; barisnya
 * hanya menampilkan tanda hubung.
 */
export function formatDateRange(startIso: string, endIso: string, dayCount: number): string {
  const start = bagianTanggalWit(startIso);
  const end = bagianTanggalWit(endIso);
  if (!start || !end) return "Tanggal tidak tersedia";

  const sameMonth = start.month === end.month && start.year === end.year;
  const range = sameMonth
    ? `${start.day} - ${end.day} ${MONTHS[start.month]}`
    : `${start.day} ${MONTHS[start.month]} - ${end.day} ${MONTHS[end.month]}`;

  return `${range} ${end.year} (${dayCount} Hari)`;
}

/* Satu tanggal saja, tanpa rentang dan tanpa jumlah hari.
   Dipakai di tempat yang memang hanya butuh tanggal mulai, supaya tidak muncul
   tulisan berulang seperti "20 - 20 Nov 2026 (1 Hari)". */
export function formatDateSingle(iso: string): string {
  const bagian = bagianTanggalWit(iso);
  if (!bagian) return "Tanggal tidak tersedia";
  return `${bagian.day} ${MONTHS[bagian.month]} ${bagian.year}`;
}

export function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return `Rp ${Number(digits).toLocaleString("id-ID")}`;
}

export function formatRupiah(value: number | string): string {
  const num = typeof value === "number" ? value : Number(String(value).replace(/\D/g, "") || 0);
  return `Rp ${num.toLocaleString("id-ID")}`;
}

/**
 * Memformat angka atau string numerik dengan pemisah ribuan titik khas Indonesia (contoh: 1.000 atau 1.000.000).
 */
export function formatRupiahDots(value: number | string): string {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

/**
 * Mengonversi teks rupiah berpemisah titik kembali ke angka number murni (contoh: "1.000.000" -> 1000000).
 */
export function parseRupiahDots(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export function formatDateTimeWit(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    const date = new Date(iso);
    return (
      new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jayapura",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date) + " WIT"
    );
  } catch {
    return String(iso);
  }
}

