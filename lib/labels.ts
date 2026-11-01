import type { ChipTone } from "@/components/ui/StatusChip";
import type {
  AdminRole,
  BookingMode,
  BookingStatus,
  CanonicalBookingStatus,
  DriverRoute,
  DriverStatus,
  PaymentMethod,
  PaymentStatus,
  SupportTicketStatus,
  VehicleStatus,
} from "./types";

export const VEHICLE_STATUS: Record<VehicleStatus, { label: string; tone: ChipTone }> = {
  tersedia: { label: "Tersedia", tone: "available" },
  disewa: { label: "Disewa", tone: "busy" },
  servis: { label: "Servis", tone: "vehicleService" },
  tidak_tersedia: { label: "Tidak Tersedia", tone: "vehicleUnavailable" },
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
  staf_operasional: "Staf",
};

export const TICKET_STATUS: Record<SupportTicketStatus, { label: string; tone: ChipTone }> = {
  baru: { label: "Baru", tone: "pending" },
  /* Tim sudah membalas dan menunggu jawaban pelanggan; ini bukan keadaan darurat. */
  menunggu_pelanggan: { label: "Menunggu pelanggan", tone: "busy" },
  eskalasi: { label: "Eskalasi ke staf", tone: "danger" },
  ditangani: { label: "Ditangani", tone: "busy" },
  selesai: { label: "Selesai", tone: "available" },
};

/* Tiga tahap yang ditampilkan ke pengguna.

   Backend menyimpan lima status, tetapi di layar admin perbedaan antara
   "ditangani" dan "menunggu pelanggan" tidak mengubah apa pun yang harus
   dikerjakan. Yang perlu dibedakan hanya: belum disentuh, sedang dikerjakan,
   dan sudah selesai. Status internal tetap utuh supaya alur dan riwayat tidak
   berubah; ini murni cara menampilkannya. */
export type TicketStage = "baru" | "diproses" | "selesai";

export const TICKET_STAGE: Record<TicketStage, { label: string; tone: ChipTone }> = {
  baru: { label: "Baru", tone: "pending" },
  diproses: { label: "Diproses", tone: "busy" },
  selesai: { label: "Selesai", tone: "available" },
};

export function ticketStageOf(status: string): TicketStage {
  if (status === "baru" || status === "OPEN") return "baru";
  if (status === "selesai" || status === "RESOLVED" || status === "CLOSED") return "selesai";
  return "diproses";
}

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

/*
 * Nilai kategori harus sama persis dengan yang tersimpan di database.
 *
 * Sebelumnya daftar ini memakai "Pickup" dan "Commercial" dengan huruf besar
 * di awal, sedangkan database menyimpan "PICKUP" dan "COMMERCIAL". Akibatnya
 * `<select>` tidak menemukan pilihan yang cocok dan menampilkan pilihan
 * pertama, "MPV", untuk unit pickup dan commercial. Nilainya sendiri tidak
 * ikut berubah saat disimpan, tetapi yang terlihat di layar menyesatkan admin
 * yang menyunting unit itu.
 */
export const VEHICLE_CATEGORY_OPTIONS = ["MPV", "SUV", "PICKUP", "COMMERCIAL"];

export const VEHICLE_TRANSMISSION_OPTIONS = ["Manual", "Automatic"];

/**
 * Menyeragamkan nilai transmisi ke bentuk yang ditampilkan di layar.
 *
 * Database menyimpan `MANUAL` / `AUTOMATIC` (huruf besar semua), sedangkan
 * daftar pilihan di form memakai `Manual` / `Automatic`. Tanpa penyeragaman,
 * `<select>` tidak menemukan pilihan yang cocok dengan nilai dari database lalu
 * menampilkan pilihan pertama, sehingga unit matic terbaca "Manual" saat
 * disunting. Lebih dari sekadar salah baca: menyimpannya tanpa mengubah apa pun
 * benar-benar mengubah nilainya menjadi MANUAL.
 *
 * Kasus yang sama pernah terjadi pada kategori armada dan sudah diperbaiki lewat
 * `VEHICLE_CATEGORY_OPTIONS`. Di sini penyeragamannya dilakukan sekali di
 * pembacaan data, bukan diulang di setiap komponen.
 *
 * Nilai yang tidak dikenali dikembalikan apa adanya supaya tidak ada informasi
 * yang hilang.
 */
export function normalisasiTransmisi(nilai: string | null | undefined): string | null {
  if (!nilai) return null;

  const bersih = nilai.trim().toUpperCase();

  if (bersih === "AUTOMATIC" || bersih === "MATIC" || bersih === "A/T") return "Automatic";
  if (bersih === "MANUAL" || bersih === "M/T") return "Manual";

  return nilai;
}

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

/* Konfigurasi label dan tone visual untuk status pembayaran */
export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: ChipTone }> = {
  UNPAID: { label: "Belum Bayar", tone: "neutral" },
  PENDING_VERIFICATION: { label: "Menunggu Verifikasi", tone: "pending" },
  PAID: { label: "Terbayar", tone: "available" },
  FAILED: { label: "Ditolak", tone: "danger" },
  REFUNDED: { label: "Dikembalikan", tone: "service" },
};

/* Label bahasa Indonesia yang natural untuk metode pembayaran */
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  QRIS: "QRIS Dinamis",
  BANK_TRANSFER: "Transfer Bank",
  CASH: "Tunai di Tempat (COD)",
};

/* Golongan SIM yang bisa dipilih. Urutannya dari yang paling ringan ke paling
   berat, mengikuti kebiasaan pencatatan di Indonesia. */
export const DRIVER_LICENSE: Record<
  "SIM_A" | "SIM_B1" | "SIM_B2" | "SIM_C",
  { label: string; keterangan: string }
> = {
  SIM_A: { label: "SIM A", keterangan: "Sepeda motor" },
  SIM_B1: { label: "SIM B1", keterangan: "Kendaraan ringan, maksimal 3.500 kg" },
  SIM_B2: { label: "SIM B2", keterangan: "Kendaraan berat, di atas 3.500 kg" },
  SIM_C: { label: "SIM C", keterangan: "Kendaraan niaga" },
};
