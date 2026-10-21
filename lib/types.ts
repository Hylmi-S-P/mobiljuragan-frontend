export type BookingMode = "lepas_kunci" | "dengan_supir";

export type VehicleStatus = "tersedia" | "disewa" | "servis" | "tidak_tersedia";

export type Vehicle = {
  id: string;
  name: string;
  plate: string;
  status: VehicleStatus;
  /* Spesifikasi teknis unit, dipakai untuk pencocokan mode sewa di katalog. */
  category: string | null;
  transmission: string | null;
  seats: number | null;
  pricePerDay: number;
  usage: string | null;
  allowedModes: BookingMode[];
};

/* Nama status kanonik pada kontrak backend, dipakai untuk integrasi API. */
export type CanonicalBookingStatus =
  | "CREATED"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type BookingStatus =
  "perlu_konfirmasi_tarif" | "perlu_alokasi_sopir" | "tarif_terkonfirmasi" | "ditolak";

export type LineItem = {
  id: string;
  label: string;
  /* null berarti nominal belum dikonfirmasi, dirender sebagai placeholder bertanda. */
  amount: string | null;
  note?: string | null;
};

export type Booking = {
  id: string;
  code: string;
  customerName: string;
  customerContext: string | null;
  vehicleId: string;
  mode: BookingMode;
  startDate: string;
  endDate: string;
  dayCount: number;
  status: BookingStatus;
  rawStatus?: CanonicalBookingStatus;
  serviceType: string;
  pickupRoute: string | null;
  quotedAmount?: number | null;
  driverId?: string | null;
  driverName: string | null;
  driverStatus: DriverStatus | null;
  whatsappIntent?: { message: string; url: string } | null;
  lineItems: LineItem[];
};

export type DriverStatus = "siaga" | "libur" | "sedang_tugas";

export type DriverRoute = "dalam_kota" | "luar_kota";

export type Driver = {
  id: string;
  label: string;
  route: DriverRoute;
  contact: string | null;
  licenseNumber: string | null;
  status: DriverStatus;
};

export type AdminRole = "super_admin" | "staf_operasional";

export type AdminAccount = {
  id: string;
  name: string;
  username: string;
  role: AdminRole;
  active: boolean;
};

export type SupportTicketStatus =
  "baru" | "menunggu_pelanggan" | "eskalasi" | "ditangani" | "selesai";

export type SupportTicket = {
  id: string;
  customerLabel: string;
  title: string;
  category: string;
  status: SupportTicketStatus;
};

export type TicketMessage = {
  id: string;
  from: "pelanggan" | "tim";
  text: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
  orderIndex: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

// ==========================================
// Modul Pembayaran (Payment Lifecycle)
// ==========================================

export type PaymentStatus =
  | "UNPAID"
  | "PENDING_VERIFICATION"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export type PaymentMethod = "QRIS" | "BANK_TRANSFER" | "CASH";

export type AdminPaymentCustomer = {
  id: string;
  fullName: string;
  phoneNumber: string;
};

export type AdminPaymentVehicle = {
  id: string;
  name: string;
  licensePlate: string;
  brand?: string | null;
  model?: string | null;
};

export type AdminPaymentBooking = {
  id: string;
  bookingCode: string;
  status: string;
  startDate?: string;
  endDate?: string;
  customer?: AdminPaymentCustomer | null;
  vehicle?: AdminPaymentVehicle | null;
};

export type AdminPaymentItem = {
  id: string;
  bookingId: string;
  baseAmount: number;
  uniqueCode: number;
  totalAmount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  qrisPayload?: string | null;
  proofImageUrl?: string | null;
  bankName?: string | null;
  senderAccount?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  booking: AdminPaymentBooking;
};

export type AdminPaymentsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminPaymentsResponse = {
  items: AdminPaymentItem[];
  pagination: AdminPaymentsPagination;
};
