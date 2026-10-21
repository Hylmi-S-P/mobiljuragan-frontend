import type { ChipTone } from "@/components/ui/StatusChip";
import type {
  AdminRole,
  BookingMode,
  BookingStatus,
  CanonicalBookingStatus,
  DriverRoute,
  DriverStatus,
  SupportTicketStatus,
  VehicleStatus,
} from "./types";

export const VEHICLE_STATUS: Record<VehicleStatus, { label: string; tone: ChipTone }> = {
  tersedia: { label: "Tersedia", tone: "available" },
  disewa: { label: "Disewa", tone: "busy" },
  servis: { label: "Servis", tone: "service" },
  tidak_tersedia: { label: "Tidak Tersedia", tone: "neutral" },
};

/* Legenda Ringkasan dan Kalender hanya memuat status sewa, bukan status arsip. */
export const RENTAL_STATUS_ORDER: VehicleStatus[] = ["tersedia", "disewa", "servis"];

/* Gold hanya untuk satu status per layar, jadi "perlu alokasi sopir" memakai navy.
   Kolom canonical adalah nama status pada siklus hidup backend. */
export const BOOKING_STATUS: Record<
  BookingStatus,
  { label: string; tone: ChipTone; canonical: CanonicalBookingStatus }
> = {
  perlu_konfirmasi_tarif: {
    label: "Perlu Konfirmasi Tarif",
    tone: "pending",
    canonical: "PENDING_CONFIRMATION",
  },
  perlu_alokasi_sopir: {
    label: "Perlu Alokasi Sopir",
    tone: "busy",
    canonical: "PENDING_CONFIRMATION",
  },
  tarif_terkonfirmasi: {
    label: "Tarif Terkonfirmasi",
    tone: "available",
    canonical: "CONFIRMED",
  },
  ditolak: { label: "Ditolak", tone: "danger", canonical: "REJECTED" },
};

export const DRIVER_STATUS: Record<DriverStatus, { label: string; tone: ChipTone }> = {
  siaga: { label: "Siaga", tone: "available" },
  libur: { label: "Libur", tone: "neutral" },
  sedang_tugas: { label: "Sedang Tugas", tone: "busy" },
};

export const DRIVER_ROUTE: Record<DriverRoute, string> = {
  dalam_kota: "Dalam Kota",
  luar_kota: "Luar Kota",
};

export const BOOKING_MODE_LABEL: Record<BookingMode, string> = {
  lepas_kunci: "Lepas Kunci",
  dengan_supir: "Dengan Sopir",
};

export const ADMIN_ROLE: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  staf_operasional: "Staf Operasional (Kantor MobilJuragan)",
};

export const TICKET_STATUS: Record<SupportTicketStatus, { label: string; tone: ChipTone }> = {
  baru: { label: "Baru", tone: "pending" },
  /* Tim sudah membalas dan menunggu jawaban pelanggan; ini bukan keadaan darurat. */
  menunggu_pelanggan: { label: "Menunggu pelanggan", tone: "busy" },
  eskalasi: { label: "Eskalasi ke staf", tone: "danger" },
  ditangani: { label: "Ditangani", tone: "busy" },
  selesai: { label: "Selesai", tone: "available" },
};

/* Penamaan jenis bantuan tiket bantuan pelanggan selaras dengan aplikasi mobile MobilJuragan */
export const TICKET_CATEGORY_LABEL: Record<string, string> = {
  VEHICLE_ISSUE: "Kondisi Unit Armada",
  kendaraan: "Kondisi Unit Armada",
  PAYMENT_CONFIRMATION: "Pembayaran & Tagihan",
  pembayaran: "Pembayaran & Tagihan",
  CANCELLATION: "Jadwal & Reservasi",
  reservasi: "Jadwal & Reservasi",
  COMPLAINT: "Layanan Driver",
  layananSopir: "Layanan Driver",
  GENERAL: "Pertanyaan Umum",
  lainnya: "Pertanyaan Umum",
  OTHER: "Lainnya",
};

export function formatTicketCategory(category: string | null | undefined): string {
  if (!category) return "Pertanyaan Umum";
  return TICKET_CATEGORY_LABEL[category] ?? category.replace(/_/g, " ");
}

/* Pilihan kategori armada yang dipakai form katalog dan filter. */
export const VEHICLE_CATEGORY_OPTIONS = [
  "MPV",
  "SUV Premium",
  "Pickup 4x4",
  "Medium MPV",
  "Commercial",
  "Compact SUV",
  "MPV Modern",
  "MPV Nyaman",
];

export const VEHICLE_TRANSMISSION_OPTIONS = ["Manual", "Automatic"];

export const VEHICLE_SEAT_OPTIONS = [3, 5, 7, 9, 12];

/* Preset kategori FAQ resmi yang selaras dengan aplikasi mobile MobilJuragan. */
export const FAQ_CATEGORY_PRESETS = [
  "Booking & Sewa",
  "Pembayaran",
  "Armada",
  "Layanan Darurat",
  "Umum",
] as const;

export type FaqCategoryPreset = (typeof FAQ_CATEGORY_PRESETS)[number];
