import "server-only";
import { cookies } from "next/headers";
import type { AdminAccount, AdminRole, CanonicalBookingStatus } from "./types";

const API_BASE_URL =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Mengembalikan undefined jika dipanggil di luar konteks request Next.js.
export async function getSessionToken(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get("admin_token")?.value;
  } catch {
    return undefined;
  }
}

// Mendukung autentikasi via nomor telepon resmi maupun username.
export async function apiAdminLogin(usernameOrPhone: string, password: string, rememberMe = false) {
  const res = await fetch(`${API_BASE_URL}/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: usernameOrPhone,
      phoneNumber: usernameOrPhone,
      password,
      rememberMe,
    }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "LOGIN_FAILED",
      json?.error?.message || "Nomor telepon/username atau kata sandi salah.",
      json?.error?.details,
    );
  }

  return json.data as {
    token: string;
    user: { id: string; fullName: string; phoneNumber: string; role: string };
  };
}

// Menyelaraskan enum role Prisma backend (ADMIN / STAFF) ke model peran dashboard.
type StaffUserPayload = {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  isActive: boolean;
};

function mapUserToAdminAccount(user: StaffUserPayload): AdminAccount {
  const role: AdminRole = user.role === "ADMIN" ? "super_admin" : "staf_operasional";
  return {
    id: user.id,
    name: user.fullName,
    username: user.phoneNumber,
    role,
    active: Boolean(user.isActive),
  };
}

/*
 * Memuat daftar akun staf/admin dari Express.
 *
 * Sebelumnya fungsi ini diam-diam mengembalikan data contoh ketika backend tidak
 * terjangkau atau menolak permintaan. Cara itu menyembunyikan kegagalan: tabel tetap
 * terisi seolah semuanya normal, padahal datanya bukan dari database. Sekarang kegagalan
 * dilempar sebagai ApiError supaya halaman bisa menampilkan penyebabnya.
 */
export async function getAdminAccounts(): Promise<AdminAccount[]> {
  const token = await getSessionToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/admin/users`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "FETCH_ADMIN_ACCOUNTS_FAILED",
      json?.error?.message || "Gagal memuat daftar akun admin dari backend.",
    );
  }

  return Array.isArray(json?.data) ? json.data.map(mapUserToAdminAccount) : [];
}

export async function apiCreateAdminAccount(data: {
  fullName: string;
  phoneNumber: string;
  role: AdminRole;
  password: string;
}) {
  const token = await getSessionToken();
  const backendRole = data.role === "super_admin" ? "ADMIN" : "STAFF";

  const res = await fetch(`${API_BASE_URL}/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      role: backendRole,
      password: data.password,
    }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "CREATE_ADMIN_FAILED",
      json?.error?.message || "Gagal membuat akun admin.",
      json?.error?.details,
    );
  }

  return mapUserToAdminAccount(json.data);
}

export async function apiUpdateAdminAccount(
  id: string,
  data: {
    fullName?: string;
    phoneNumber?: string;
    role?: AdminRole;
    password?: string;
    isActive?: boolean;
  },
) {
  const token = await getSessionToken();
  const backendRole =
    data.role !== undefined ? (data.role === "super_admin" ? "ADMIN" : "STAFF") : undefined;

  const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      role: backendRole,
      password: data.password ? data.password : undefined,
      isActive: data.isActive,
    }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "UPDATE_ADMIN_FAILED",
      json?.error?.message || "Gagal memperbarui akun admin.",
      json?.error?.details,
    );
  }

  return mapUserToAdminAccount(json.data);
}
// Pesan dari backend sudah menjelaskan alasan penolakan (mis. akun masih terikat
// pemesanan atau merupakan admin aktif terakhir), jadi ApiError diteruskan apa adanya
// supaya Server Action bisa menampilkan sebabnya ke pengguna.
export async function apiDeleteAdminAccount(id: string) {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "DELETE_ADMIN_FAILED",
      json?.error?.message || "Gagal menghapus akun admin.",
      json?.error?.details,
    );
  }

  return json.data as { id: string; fullName: string };
}
// Balasan tim pada tiket customer care. Endpoint mengubah status tiket menjadi
// menunggu pelanggan, jadi pemanggil perlu merevalidasi halaman terkait.
export async function apiReplyToTicket(ticketId: string, body: string) {
  const token = await getSessionToken();

  const res = await fetch(
    `${API_BASE_URL}/admin/tickets/${encodeURIComponent(ticketId)}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ body }),
    },
  );

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "TICKET_REPLY_FAILED",
      json?.error?.message || "Gagal mengirim balasan tiket.",
      json?.error?.details,
    );
  }

  return json.data;
}



// Memperbarui status pemesanan sewa (konfirmasi tarif, penolakan, pelunasan, serah terima, selesai).
export async function apiUpdateBookingStatus(
  id: string,
  status: CanonicalBookingStatus,
  quotedAmount?: number,
  note?: string,
) {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}/admin/bookings/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      status,
      ...(quotedAmount !== undefined ? { quotedAmount } : {}),
      ...(note ? { note } : {}),
    }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "UPDATE_BOOKING_STATUS_FAILED",
      json?.error?.message || "Gagal memperbarui status pemesanan.",
      json?.error?.details,
    );
  }

  return json.data;
}



// Menugaskan supir resmi ke pesanan sewa bertipe WITH_DRIVER.
export async function apiAssignDriverToBooking(id: string, driverId: string, note?: string) {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}/admin/bookings/${encodeURIComponent(id)}/driver`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      driverId,
      ...(note ? { note } : {}),
    }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "ASSIGN_DRIVER_FAILED",
      json?.error?.message || "Gagal menugaskan supir ke pemesanan.",
      json?.error?.details,
    );
  }

  return json.data;
}



// Menambah pengemudi resmi baru ke roster supir.
export async function apiCreateDriver(data: {
  fullName: string;
  phoneNumber?: string;
  licenseNumber?: string;
  routeScope: "DALAM_KOTA" | "LUAR_KOTA";
}) {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}/admin/drivers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "CREATE_DRIVER_FAILED",
      json?.error?.message || "Gagal mendaftarkan supir baru.",
      json?.error?.details,
    );
  }

  return json.data;
}



// Memperbarui data supir dan wilayah rute tugas.
export async function apiUpdateDriver(
  id: string,
  data: {
    fullName?: string;
    phoneNumber?: string;
    licenseNumber?: string;
    routeScope?: "DALAM_KOTA" | "LUAR_KOTA";
  },
) {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}/admin/drivers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "UPDATE_DRIVER_FAILED",
      json?.error?.message || "Gagal memperbarui data supir.",
      json?.error?.details,
    );
  }

  return json.data;
}



// Mengubah status kesiapan supir (SIAGA / LIBUR).
export async function apiUpdateDriverReadiness(
  id: string,
  readiness: "SIAGA" | "LIBUR",
  note?: string,
) {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}/admin/drivers/${encodeURIComponent(id)}/readiness`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      readiness,
      ...(note ? { note } : {}),
    }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "UPDATE_READINESS_FAILED",
      json?.error?.message || "Gagal mengubah status kesiapan supir.",
      json?.error?.details,
    );
  }

  return json.data;
}



// Menonaktifkan / menghapus supir dari roster operasional.
export async function apiDeleteDriver(id: string) {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}/admin/drivers/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "DELETE_DRIVER_FAILED",
      json?.error?.message || "Gagal menonaktifkan supir.",
      json?.error?.details,
    );
  }

  return json.data;
}



// Memperbarui status tiket bantuan (RESOLVED / CLOSED / IN_PROGRESS / OPEN).
export async function apiUpdateTicketStatus(
  ticketId: string,
  status: "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED",
) {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}/admin/tickets/${encodeURIComponent(ticketId)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ status }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "UPDATE_TICKET_STATUS_FAILED",
      json?.error?.message || "Gagal memperbarui status tiket bantuan.",
      json?.error?.details,
    );
  }

  return json.data;
}

// Konfigurasi AI Gateway (9Router / LiteLLM / OpenRouter)
export async function apiUpdateAiConfig(payload: {
  gatewayUrl?: string;
  apiKey?: string;
  activeModel?: string;
  fallbackModel?: string;
  fallbackGatewayUrl?: string;
  fallbackApiKey?: string;
  autoFallbackEnabled?: boolean;
  proxyUrl?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  enableRag?: boolean;
}) {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}/admin/ai/config`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "UPDATE_AI_CONFIG_FAILED",
      json?.error?.message || "Gagal menyimpan konfigurasi AI.",
    );
  }
  return json.data;
}

// Health check dan deteksi kuota / rate-limit live
export async function apiCheckAiGatewayHealth() {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}/admin/ai/health`, {
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
      json?.error?.code || "CHECK_HEALTH_FAILED",
      json?.error?.message || "Gagal memeriksa kesehatan AI Gateway.",
    );
  }
  return json.data;
}

// Basis Pengetahuan (Knowledge Base RAG)
export async function apiCreateKnowledgeDocument(payload: {
  title: string;
  category: string;
  content: string;
  isActive?: boolean;
}) {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}/admin/ai/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "CREATE_DOC_FAILED",
      json?.error?.message || "Gagal membuat dokumen pengetahuan.",
    );
  }
  return json.data;
}

export async function apiUpdateKnowledgeDocument(
  id: string,
  payload: {
    title?: string;
    category?: string;
    content?: string;
    isActive?: boolean;
  },
) {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}/admin/ai/documents/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "UPDATE_DOC_FAILED",
      json?.error?.message || "Gagal memperbarui dokumen pengetahuan.",
    );
  }
  return json.data;
}

export async function apiDeleteKnowledgeDocument(id: string) {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}/admin/ai/documents/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "DELETE_DOC_FAILED",
      json?.error?.message || "Gagal menghapus dokumen pengetahuan.",
    );
  }
  return json.data;
}

export async function apiFetchGatewayModels(gatewayUrl?: string, apiKey?: string) {
  const token = await getSessionToken();

  const params = new URLSearchParams();
  if (gatewayUrl) params.append("gatewayUrl", gatewayUrl);
  if (apiKey) params.append("apiKey", apiKey);

  const res = await fetch(`${API_BASE_URL}/admin/ai/models?${params.toString()}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "FETCH_MODELS_FAILED",
      json?.error?.message || "Gagal mengambil daftar model.",
    );
  }
  return json.data as { models: string[]; source: string; count: number };
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

export async function apiGetAiGatewayLogs(): Promise<AiGatewayLogData> {
  const token = await getSessionToken();
  const res = await fetch(`${API_BASE_URL}/admin/ai/logs`, {
    method: "GET",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, "FETCH_LOGS_FAILED", "Gagal memuat log gateway.");
  if (Array.isArray(json?.data)) {
    return { httpLogs: json.data, rawLogs: [] };
  }
  return {
    httpLogs: json?.data?.httpLogs || [],
    rawLogs: json?.data?.rawLogs || [],
  };
}

export async function apiClearAiGatewayLogs(): Promise<void> {
  const token = await getSessionToken();
  const res = await fetch(`${API_BASE_URL}/admin/ai/logs`, {
    method: "DELETE",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new ApiError(res.status, "CLEAR_LOGS_FAILED", "Gagal membersihkan log.");
}

export async function apiParseKnowledgeFile(filename: string, contentBase64: string): Promise<{
  title: string;
  content: string;
  format: string;
  lineCount: number;
}> {
  const token = await getSessionToken();
  const res = await fetch(`${API_BASE_URL}/admin/ai/documents/parse-file`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ filename, contentBase64 }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "PARSE_FILE_FAILED",
      json?.message || "Gagal mengekstrak isi dokumen.",
    );
  }
  return json.data;
}

export async function apiTestAiChat(
  prompt: string,
  history?: Array<{ role: string; content: string }>,
  options?: { temperature?: number; maxTokens?: number; systemPrompt?: string }
) {
  const token = await getSessionToken();

  const res = await fetch(`${API_BASE_URL}/admin/ai/chat/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      prompt,
      history,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      systemPrompt: options?.systemPrompt,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code || "TEST_CHAT_FAILED",
      json?.error?.message || "Gagal memproses pesan uji chat.",
    );
  }
  return json.data as {
    reply: string;
    modelUsed: string;
    tokens?: number | null;
    latencyMs: number;
    tokensPerSecond?: number;
    ragDocumentsInjected: number;
    referencedDocuments?: string[];
    isSimulationFallback: boolean;
    isFallbackTriggered?: boolean;
    fallbackReason?: string;
    gatewayNotice?: string;
  };
}

