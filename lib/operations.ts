import "server-only";
import { getSessionToken, ApiError } from "./api";
import type {
  AdminPaymentItem,
  AdminPaymentsResponse,
  Booking,
  BookingMode,
  BookingStatus,
  CanonicalBookingStatus,
  Driver,
  DriverRoute,
  DriverStatus,
  LineItem,
  Vehicle,
  VehicleStatus,
} from "./types";

/**
 * Pemanggil API Express untuk data operasional, khusus dipakai Server Component.
 *
 * Semua fungsi di sini memetakan bentuk respons Express ke tipe tampilan yang sudah
 * dipakai komponen dashboard. Pemisahan ini disengaja: komponen tidak perlu tahu nama
 * field backend (mis. `licensePlate`), dan kalau kontrak backend berubah, hanya berkas
 * ini yang ikut berubah.
 *
 * Catatan: `fetch` tidak melempar error saat status 4xx/5xx, jadi setiap panggilan
 * memeriksa `res.ok` dan melempar ApiError supaya halaman bisa menampilkan penyebabnya.
 */
const API_BASE_URL =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function apiGet<T>(path: string): Promise<T> {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "API_REQUEST_FAILED",
      json?.error?.message || `Gagal memuat data dari ${path}.`,
      json?.error?.details,
    );
  }

  return json?.data as T;
}

/* Kendaraan */

const VEHICLE_STATUS: Record<string, VehicleStatus> = {
  AVAILABLE: "tersedia",
  BOOKED: "disewa",
  MAINTENANCE: "servis",
  UNAVAILABLE: "tidak_tersedia",
};

type ApiVehicle = {
  id: string;
  externalId: string | null;
  name: string;
  licensePlate: string;
  category: string | null;
  transmission: string | null;
  seatingCapacity: number | null;
  pricePerDay?: number | null;
  operationalStatus: string;
};

function mapVehicle(v: ApiVehicle): Vehicle {
  return {
    id: v.externalId || v.id,
    name: v.name,
    plate: v.licensePlate,
    status: VEHICLE_STATUS[v.operationalStatus] ?? "tidak_tersedia",
    category: v.category,
    transmission: v.transmission,
    seats: v.seatingCapacity,
    pricePerDay: v.pricePerDay ?? 400000,
    // `usage` dan `allowedModes` tidak dikirim backend. Dibiarkan null/kosong
    // daripada diisi teks karangan.
    usage: null,
    allowedModes: [] as BookingMode[],
  };
}

/*
 * Portal staf memakai `operationalStatus=ALL`.
 *
 * `GET /vehicles` tanpa parameter hanya mengembalikan unit berstatus AVAILABLE, yang tepat
 * untuk pelanggan yang mencari unit siap sewa. Portal staf justru perlu melihat seluruh unit:
 * kalau unit yang sedang perawatan atau disewa disembunyikan, tabel Katalog diam-diam
 * kehilangan baris, dan tabel Pesanan yang mencari kendaraan lewat id akan menampilkan sel
 * nama kosong.
 */
export async function getAllVehicles(): Promise<Vehicle[]> {
  const data = await apiGet<ApiVehicle[]>("/vehicles?operationalStatus=ALL");
  return (data ?? []).map(mapVehicle);
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}/vehicles/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: "no-store",
  });

  // 404 bukan kegagalan halaman; pemanggil yang memutuskan memanggil notFound().
  if (res.status === 404) return null;
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      json?.error?.code || "VEHICLE_FETCH_FAILED",
      json?.error?.message || "Gagal memuat detail kendaraan.",
      json?.error?.details,
    );
  }

  const json = await res.json();
  return json?.data ? mapVehicle(json.data) : null;
}

/* Supir */

const DRIVER_READINESS: Record<string, DriverStatus> = {
  SIAGA: "siaga",
  LIBUR: "libur",
  SEDANG_TUGAS: "sedang_tugas",
};

const DRIVER_ROUTE: Record<string, DriverRoute> = {
  DALAM_KOTA: "dalam_kota",
  LUAR_KOTA: "luar_kota",
};

type ApiDriver = {
  id: string;
  externalId: string | null;
  fullName: string;
  phoneNumber: string | null;
  licenseNumber: string | null;
  routeScope: string;
  readiness: string;
};

function mapDriver(d: ApiDriver): Driver {
  return {
    id: d.externalId || d.id,
    label: d.fullName,
    route: DRIVER_ROUTE[d.routeScope] ?? "dalam_kota",
    contact: d.phoneNumber,
    licenseNumber: d.licenseNumber,
    status: DRIVER_READINESS[d.readiness] ?? "siaga",
  };
}

export async function getDrivers(): Promise<Driver[]> {
  // includeInactive agar supir nonaktif tetap tampil di roster beserta statusnya.
  const data = await apiGet<ApiDriver[]>("/admin/drivers?includeInactive=true");
  return (data ?? []).map(mapDriver);
}

/* Pemesanan */

const BOOKING_STATUS_MAP: Record<CanonicalBookingStatus, BookingStatus> = {
  CREATED: "perlu_konfirmasi_tarif",
  PENDING_CONFIRMATION: "perlu_konfirmasi_tarif",
  CONFIRMED: "tarif_terkonfirmasi",
  REJECTED: "ditolak",
  IN_PROGRESS: "tarif_terkonfirmasi",
  COMPLETED: "tarif_terkonfirmasi",
  CANCELLED: "ditolak",
};

/* Pesanan yang sudah dikonfirmasi tetapi belum punya supir harus muncul sebagai
   "perlu alokasi supir", bukan "tarif terkonfirmasi". Sebelumnya status ini tidak
   pernah dihasilkan sama sekali, sehingga pill "Perlu Alokasi Sopir" di halaman
   Pemesanan Masuk selalu menampilkan angka nol dan terlihat seperti filter rusak. */
function resolveBookingStatus(b: ApiBooking): BookingStatus {
  const dasar = BOOKING_STATUS_MAP[b.status] ?? "perlu_konfirmasi_tarif";

  const butuhSupir = b.rentalType === "WITH_DRIVER";
  const sudahDikonfirmasi = dasar === "tarif_terkonfirmasi";
  const supirBelumAda = b.driverId === null || b.driverId === undefined;

  if (butuhSupir && sudahDikonfirmasi && supirBelumAda) {
    return "perlu_alokasi_sopir";
  }

  return dasar;
}

type ApiBooking = {
  id: string;
  bookingCode: string;
  vehicleId: string;
  driverId: string | null;
  startDateTime: string;
  endDateTime: string;
  rentalType: string;
  pickupLocation: string | null;
  numberGuests: number | null;
  tariffStatus: string;
  quotedAmount: string | number | null;
  status: CanonicalBookingStatus;
  customer?: { fullName: string; phoneNumber: string } | null;
  vehicle?: { externalId: string | null; id: string; name: string; licensePlate: string } | null;
  driver?: { fullName: string; readiness?: string } | null;
  payment?: {
    id: string;
    status: any;
    proofImageUrl?: string | null;
    method?: string | null;
    totalAmount?: string | number | null;
  } | null;
};

function countDays(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 1;
}

function mapBooking(b: ApiBooking): Booking {
  const isDriverService = b.rentalType === "WITH_DRIVER";

  const lineItems: LineItem[] = [
    {
      id: `${b.id}-sewa`,
      label: isDriverService ? "Sewa unit dengan supir" : "Sewa unit lepas kunci",
      // Nominal hanya ditampilkan kalau tim sudah mengonfirmasi tarifnya.
      amount:
        b.quotedAmount !== null && b.quotedAmount !== undefined ? String(b.quotedAmount) : null,
      note: `${countDays(b.startDateTime, b.endDateTime)} hari`,
    },
  ];

  return {
    id: b.id,
    code: b.bookingCode,
    customerName: b.customer?.fullName ?? "Pelanggan",
    customerContext: b.customer?.phoneNumber ?? null,
    vehicleId: b.vehicle?.externalId || b.vehicleId,
    mode: isDriverService ? "dengan_supir" : "lepas_kunci",
    startDate: b.startDateTime,
    endDate: b.endDateTime,
    dayCount: countDays(b.startDateTime, b.endDateTime),
    status: resolveBookingStatus(b),
    rawStatus: b.status,
    tariffStatus: b.tariffStatus,
    quotedAmount: b.quotedAmount !== null && b.quotedAmount !== undefined ? Number(b.quotedAmount) : null,
    driverId: b.driverId,
    serviceType: isDriverService ? "Dengan Supir" : "Lepas Kunci",
    pickupRoute: b.pickupLocation,
    driverName: b.driver?.fullName ?? null,
    driverStatus: b.driver?.readiness ? (DRIVER_READINESS[b.driver.readiness] ?? null) : null,
    whatsappIntent: (b as { whatsappIntent?: { message: string; url: string } }).whatsappIntent ?? null,
    lineItems,
    payment: b.payment
      ? {
          id: b.payment.id,
          status: b.payment.status,
          proofImageUrl: b.payment.proofImageUrl ?? null,
          method: b.payment.method ?? null,
          totalAmount:
            b.payment.totalAmount !== null && b.payment.totalAmount !== undefined
              ? Number(b.payment.totalAmount)
              : null,
        }
      : null,
  };
}

export async function getBookings(): Promise<Booking[]> {
  const data = await apiGet<{ items: ApiBooking[] }>("/admin/bookings?limit=100");
  return (data?.items ?? []).map(mapBooking);
}

// Booking memakai identifier yang sama untuk detail: kode booking (MJ-...) maupun UUID.
export async function getBookingById(id: string): Promise<Booking | null> {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}/admin/bookings/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      json?.error?.code || "BOOKING_FETCH_FAILED",
      json?.error?.message || "Gagal memuat detail pemesanan.",
      json?.error?.details,
    );
  }

  const json = await res.json();
  return json?.data ? mapBooking(json.data) : null;
}

/* Kalender armada */

export type FleetSchedule = {
  bookingId: string;
  bookingCode: string;
  startDateTime: string;
  endDateTime: string;
  status: CanonicalBookingStatus;
  customerName: string | null;
};

export type FleetEntry = Vehicle & {
  activeBookingsCount: number;
  schedules: FleetSchedule[];
};

type ApiFleetEntry = ApiVehicle & {
  activeBookingsCount: number;
  schedules: Array<{
    bookingId: string;
    bookingCode: string;
    startDateTime: string;
    endDateTime: string;
    status: CanonicalBookingStatus;
    customerName: string | null;
  }>;
};

export type FleetCalendar = {
  timeRange: { start: string; end: string } | null;
  totalVehicles: number;
  fleet: FleetEntry[];
};

export async function getFleetCalendar(): Promise<FleetCalendar> {
  const data = await apiGet<{
    timeRange: { start: string; end: string } | null;
    totalVehicles: number;
    fleet: ApiFleetEntry[];
  }>("/admin/fleet/calendar");

  return {
    timeRange: data?.timeRange ?? null,
    totalVehicles: data?.totalVehicles ?? 0,
    fleet: (data?.fleet ?? []).map((entry) => ({
      ...mapVehicle(entry),
      activeBookingsCount: entry.activeBookingsCount ?? 0,
      schedules: entry.schedules ?? [],
    })),
  };
}
/* Customer care */

export type SupportTicketView = {
  id: string;
  ticketNumber: string;
  customerLabel: string;
  title: string;
  category: string;
  status: string;
  handledBy?: "AI" | "HUMAN" | string;
  handoverAt?: string | null;
  messageCount: number;
  updatedAt: string;
};

export type TicketMessageView = {
  id: string;
  from: "pelanggan" | "tim";
  text: string;
  sentAt: string;
  senderName: string;
};

const TICKET_STATUS_MAP: Record<string, string> = {
  OPEN: "baru",
  IN_PROGRESS: "ditangani",
  /* Tim sudah menjawab, sekarang giliran pelanggan. */
  WAITING_CUSTOMER: "menunggu_pelanggan",
  RESOLVED: "selesai",
  CLOSED: "selesai",
};

type ApiTicket = {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  status: string;
  handledBy?: string;
  handoverAt?: string | null;
  updatedAt: string;
  customer?: { fullName: string } | null;
  _count?: { messages: number };
};

export async function getSupportTickets(): Promise<SupportTicketView[]> {
  const data = await apiGet<ApiTicket[]>("/admin/tickets");
  return (data ?? []).map((t) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    customerLabel: t.customer?.fullName ?? "Pelanggan",
    title: t.title,
    category: t.category,
    status: TICKET_STATUS_MAP[t.status] ?? "baru",
    handledBy: t.handledBy,
    handoverAt: t.handoverAt,
    messageCount: t._count?.messages ?? 0,
    updatedAt: t.updatedAt,
  }));
}

type ApiTicketDetail = ApiTicket & {
  messages: Array<{
    id: string;
    body: string;
    isCustomer: boolean;
    sentAt: string;
    sender?: { fullName: string } | null;
  }>;
};

export async function getTicketMessages(ticketId: string): Promise<TicketMessageView[]> {
  const detail = await getTicketDetail(ticketId);
  return detail.messages;
}

export async function getTicketDetail(
  ticketId: string,
): Promise<{ messages: TicketMessageView[]; handledBy?: string }> {
  const data = await apiGet<ApiTicketDetail>(`/admin/tickets/${encodeURIComponent(ticketId)}`);
  const messages = (data?.messages ?? []).map((m) => ({
    id: m.id,
    from: m.isCustomer ? ("pelanggan" as const) : ("tim" as const),
    text: m.body,
    sentAt: m.sentAt,
    senderName: m.sender?.fullName ?? "Tim",
  }));
  return { messages, handledBy: data?.handledBy };
}


/* Laporan Keuangan */

export type FinanceSummary = {
  summary: {
    totalRevenue: number;
    pendingRevenue: number;
    completedBookingsCount: number;
    confirmedOrActiveCount: number;
    averageOrderValue: number;
    totalAllBookings: number;
  };
  rentalTypes: {
    withoutDriver: {
      count: number;
      revenue: number;
      percentage: number;
    };
    withDriver: {
      count: number;
      revenue: number;
      percentage: number;
    };
  };
  fleetBreakdown: Array<{
    vehicleId: string;
    externalId: string;
    name: string;
    licensePlate: string;
    category: string | null;
    completedBookings: number;
    totalRevenue: number;
    activeBookings: number;
  }>;
  monthlyTrends: Array<{
    label: string;
    revenue: number;
    bookings: number;
  }>;
};

export async function getFinanceSummary(range: string = "all"): Promise<FinanceSummary> {
  return await apiGet<FinanceSummary>(`/admin/finance/summary?range=${encodeURIComponent(range)}`);
}

/* Konfigurasi AI & Knowledge Base */

export type AiConfigData = {
  config: {
    id: string;
    gatewayUrl: string;
    apiKey: string | null;
    activeModel: string;
    fallbackModel: string;
    fallbackGatewayUrl: string | null;
    fallbackApiKey: string | null;
    autoFallbackEnabled: boolean;
    proxyUrl: string | null;
    healthStatus: string;
    lastLatencyMs: number | null;
    lastHealthCheckedAt: string | null;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    enableRag: boolean;
    updatedAt: string;
  };
  stats: {
    documentCount: number;
    activeDocumentCount: number;
  };
};

export type AiGatewayHealth = {
  healthStatus: "HEALTHY" | "RATE_LIMITED" | "DEGRADED" | "OFFLINE";
  statusCode: number;
  latencyMs: number;
  message: string;
  checkedAt: string;
  gatewayUrl: string;
  activeModel: string;
  fallbackModel: string;
  autoFallbackEnabled: boolean;
  proxyUrl?: string;
};

export async function getAiGatewayHealth(): Promise<AiGatewayHealth> {
  return await apiGet<AiGatewayHealth>("/admin/ai/health");
}

export type KnowledgeDocument = {
  id: string;
  title: string;
  category: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getAiConfig(): Promise<AiConfigData> {
  return await apiGet<AiConfigData>("/admin/ai/config");
}

export async function getKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  return await apiGet<KnowledgeDocument[]>("/admin/ai/documents");
}

export type AiGatewayLog = {
  id: string;
  timestamp: string;
  event: 'CHAT_COMPLETION' | 'HEALTH_CHECK' | 'GATEWAY_ROUTING' | 'DOC_PARSED';
  model: string;
  status: number;
  latencyMs: number;
  tokens?: number;
  tokensPerSecond?: number;
  details: string;
};

export type AiGatewayLogData = {
  httpLogs: AiGatewayLog[];
  rawLogs: string[];
};

export async function getAiGatewayLogs(): Promise<AiGatewayLogData> {
  const res = await apiGet<AiGatewayLogData | AiGatewayLog[]>("/admin/ai/logs");
  if (Array.isArray(res)) {
    return { httpLogs: res, rawLogs: [] };
  }
  return {
    httpLogs: res?.httpLogs || [],
    rawLogs: res?.rawLogs || [],
  };
}

/* ==========================================
 * Verifikasi Pembayaran (Admin Payment Queue)
 * ========================================== */

export async function getAdminPayments(params?: {
  status?: string;
  method?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AdminPaymentsResponse> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "ALL" && params.status !== "semua") {
    query.append("status", params.status);
  }
  if (params?.method) query.append("method", params.method);
  if (params?.search) query.append("search", params.search);
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));

  const qs = query.toString();
  const path = `/admin/payments${qs ? `?${qs}` : ""}`;
  return await apiGet<AdminPaymentsResponse>(path);
}

export async function verifyPayment(
  id: string,
  data: { action: "APPROVE" | "REJECT"; notes?: string },
): Promise<AdminPaymentItem> {
  const token = await getSessionToken();
  const res = await fetch(`${API_BASE_URL}/admin/payments/${encodeURIComponent(id)}/verify`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "VERIFY_PAYMENT_FAILED",
      json?.error?.message || "Gagal memproses verifikasi pembayaran.",
      json?.error?.details,
    );
  }

  return json?.data as AdminPaymentItem;
}


