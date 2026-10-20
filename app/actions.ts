"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  apiAdminLogin,
  apiCreateAdminAccount,
  apiUpdateAdminAccount,
  apiDeleteAdminAccount,
  apiReplyToTicket,
  apiUpdateBookingStatus,
  apiAssignDriverToBooking,
  apiCreateDriver,
  apiUpdateDriver,
  apiUpdateDriverReadiness,
  apiDeleteDriver,
  apiUpdateTicketStatus,
  apiUpdateAiConfig,
  apiCheckAiGatewayHealth,
  apiCreateKnowledgeDocument,
  apiUpdateKnowledgeDocument,
  apiDeleteKnowledgeDocument,
  apiFetchGatewayModels,
  apiTestAiChat,
  apiGetAiGatewayLogs,
  apiClearAiGatewayLogs,
  apiParseKnowledgeFile,
  ApiError,
} from "@/lib/api";
import type { AdminRole, CanonicalBookingStatus } from "@/lib/types";

export type ActionState = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string>;
};

/**
 * Server Action untuk proses Login Staf & Admin ke Dashboard.
 * Menggunakan kredensial Express API dan menyimpan token ke cookie sesi.
 */
export async function loginAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const username = (formData.get("username") as string)?.trim() || "";
  const password = (formData.get("password") as string)?.trim() || "";
  const rememberMe = formData.get("rememberMe") === "on";

  const errors: Record<string, string> = {};
  if (!username) errors.username = "Username atau nomor telepon wajib diisi.";
  if (!password) errors.password = "Kata sandi wajib diisi.";

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  let token = "";
  try {
    const data = await apiAdminLogin(username, password, rememberMe);
    token = data.token;
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return {
      success: false,
      message: "Gagal terhubung ke server backend Express. Pastikan backend aktif.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set("admin_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // Tanpa pilihan ingat sesi, cookie dihapus saat browser ditutup.
    // JWT backend tetap kedaluwarsa setelah 1 jam meski cookie masih ada.
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 7 } : {}),
  });
  cookieStore.set("client_token", token, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 7 } : {}),
  });

  redirect("/");
}

// Validasi minimal 8 karakter sandi disesuaikan dengan aturan bcrypt backend.
export async function createAdminAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const fullName = (formData.get("fullName") as string)?.trim() || "";
  const phoneNumber = (formData.get("phoneNumber") as string)?.trim() || "";
  const role = (formData.get("role") as AdminRole) || "staf_operasional";
  const password = (formData.get("password") as string)?.trim() || "";

  const errors: Record<string, string> = {};
  if (!fullName) errors.fullName = "Nama lengkap wajib diisi.";
  if (!phoneNumber) errors.phoneNumber = "Nomor telepon/kontak wajib diisi.";
  if (!password || password.length < 8) {
    errors.password = "Kata sandi minimal 8 karakter.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    await apiCreateAdminAccount({
      fullName,
      phoneNumber,
      role,
      password,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal membuat akun admin pada backend." };
  }

  revalidatePath("/admin");
  return { success: true, message: `Akun ${fullName} berhasil dibuat.` };
}

// Kata sandi bersifat opsional pada update; dikirim hanya jika staf memasukkan nilai baru.
export async function updateAdminAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = formData.get("id") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const phoneNumber = (formData.get("phoneNumber") as string)?.trim();
  const role = (formData.get("role") as AdminRole) || undefined;
  const password = (formData.get("password") as string)?.trim() || undefined;
  const activeVal = formData.get("active");
  const isActive = activeVal !== null ? activeVal === "true" : undefined;

  if (!id) {
    return { success: false, message: "ID akun tidak valid." };
  }

  try {
    await apiUpdateAdminAccount(id, {
      fullName,
      phoneNumber,
      role,
      password,
      isActive,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal memperbarui akun admin pada backend." };
  }

  revalidatePath("/admin");
  return { success: true, message: "Akun berhasil diperbarui." };
}

/**
 * Menghapus akun staf/admin.
 *
 * Dipakai langsung sebagai `action` pada form konfirmasi, sehingga menerima FormData
 * dan tidak memakai useActionState. Kegagalan dari backend (mis. akun masih terikat
 * pemesanan, atau merupakan admin aktif terakhir) dikembalikan sebagai pesan, bukan
 * dilempar, supaya halaman tetap bisa menampilkannya.
 */
export async function deleteAdminAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = formData.get("id") as string;

  if (!id) {
    return { success: false, message: "ID akun tidak valid." };
  }

  let deletedName = "";
  try {
    const result = await apiDeleteAdminAccount(id);
    deletedName = result.fullName;
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal menghapus akun admin pada backend." };
  }

  revalidatePath("/admin");
  return { success: true, message: `Akun ${deletedName} berhasil dihapus.` };
}
/**
 * Mengirim balasan tim pada sebuah tiket customer care.
 *
 * Dipanggil dari Client Component lewat startTransition, bukan dari form, supaya UI bisa
 * menampilkan balasan lebih dulu lalu menariknya kembali kalau pengiriman gagal.
 * Kegagalan dikembalikan sebagai pesan, bukan dilempar.
 */
export async function replyToTicketAction(ticketId: string, body: string): Promise<ActionState> {
  if (!ticketId) {
    return { success: false, message: "Tiket tidak valid." };
  }
  if (!body.trim()) {
    return { success: false, message: "Balasan tidak boleh kosong." };
  }

  try {
    await apiReplyToTicket(ticketId, body.trim());
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Balasan gagal dikirim ke backend." };
  }

  revalidatePath("/customer-care");
  return { success: true, message: "Balasan terkirim dan tersimpan pada tiket." };
}

/**
 * Server Action untuk mengubah status tiket bantuan (RESOLVED / CLOSED / OPEN).
 */
export async function updateTicketStatusAction(
  ticketId: string,
  status: "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED",
): Promise<ActionState> {
  if (!ticketId) {
    return { success: false, message: "Tiket tidak valid." };
  }

  try {
    await apiUpdateTicketStatus(ticketId, status);
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal memperbarui status tiket." };
  }

  revalidatePath("/customer-care");
  return {
    success: true,
    message: `Status tiket berhasil diubah menjadi ${status === "RESOLVED" ? "Selesai" : status === "CLOSED" ? "Ditutup" : status}.`,
  };
}

/**
 * Server Action untuk mengubah status pemesanan sewa (konfirmasi tarif, penolakan, pelunasan, serah terima, selesai).
 */
export async function updateBookingStatusAction(
  bookingId: string,
  status: CanonicalBookingStatus,
  quotedAmount?: number,
  note?: string,
): Promise<ActionState & { data?: unknown }> {
  if (!bookingId) {
    return { success: false, message: "Kode pemesanan tidak valid." };
  }

  try {
    const data = await apiUpdateBookingStatus(bookingId, status, quotedAmount, note);
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/");
    revalidatePath("/fleet/calendar");
    return {
      success: true,
      message:
        status === "CONFIRMED"
          ? "Tarif dan jadwal sewa berhasil dikonfirmasi."
          : status === "REJECTED"
            ? "Permintaan sewa berhasil ditolak."
            : status === "COMPLETED"
              ? "Sewa selesai dan unit telah dikembalikan."
              : status === "IN_PROGRESS"
                ? "Armada diserahterimakan dan masa sewa sedang berjalan."
                : `Status pemesanan berhasil diperbarui ke ${status}.`,
      data,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal memperbarui status pemesanan ke backend." };
  }
}

/**
 * Server Action untuk menugaskan supir ke pemesanan sewa dengan supir.
 */
export async function assignDriverAction(
  bookingId: string,
  driverId: string,
  note?: string,
): Promise<ActionState & { data?: unknown }> {
  if (!bookingId || !driverId) {
    return { success: false, message: "Pemesanan atau supir tidak valid." };
  }

  try {
    const data = await apiAssignDriverToBooking(bookingId, driverId, note);
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/fleet/drivers");
    return {
      success: true,
      message: "Supir resmi berhasil ditugaskan ke pesanan ini.",
      data,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal menugaskan supir ke backend." };
  }
}

/**
 * Server Action untuk menambah supir baru ke roster operasional.
 */
export async function createDriverAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const fullName = (formData.get("fullName") as string)?.trim() || "";
  const phoneNumber = (formData.get("phoneNumber") as string)?.trim() || undefined;
  const licenseNumber = (formData.get("licenseNumber") as string)?.trim() || undefined;
  const rawRoute = (formData.get("route") as string)?.trim() || "dalam_kota";
  const routeScope = rawRoute === "luar_kota" ? "LUAR_KOTA" : "DALAM_KOTA";

  const errors: Record<string, string> = {};
  if (!fullName || fullName.length < 3) errors.fullName = "Nama supir minimal 3 karakter.";

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    await apiCreateDriver({ fullName, phoneNumber, licenseNumber, routeScope });
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal mendaftarkan supir baru ke backend." };
  }

  revalidatePath("/fleet/drivers");
  return { success: true, message: `Supir ${fullName} berhasil didaftarkan ke roster.` };
}

/**
 * Server Action untuk memperbarui data supir.
 */
export async function updateDriverAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = (formData.get("id") as string)?.trim() || "";
  const fullName = (formData.get("fullName") as string)?.trim() || undefined;
  const phoneNumber = (formData.get("phoneNumber") as string)?.trim() || undefined;
  const licenseNumber = (formData.get("licenseNumber") as string)?.trim() || undefined;
  const rawRoute = (formData.get("route") as string)?.trim() || "dalam_kota";
  const routeScope = rawRoute === "luar_kota" ? "LUAR_KOTA" : "DALAM_KOTA";

  if (!id) return { success: false, message: "ID supir tidak valid." };

  try {
    await apiUpdateDriver(id, { fullName, phoneNumber, licenseNumber, routeScope });
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal memperbarui data supir." };
  }

  revalidatePath("/fleet/drivers");
  return { success: true, message: "Data supir berhasil diperbarui." };
}

/**
 * Server Action untuk toggle status kesiapan supir (SIAGA / LIBUR).
 */
export async function toggleDriverReadinessAction(
  driverId: string,
  readiness: "SIAGA" | "LIBUR",
): Promise<ActionState> {
  if (!driverId) return { success: false, message: "ID supir tidak valid." };

  try {
    await apiUpdateDriverReadiness(driverId, readiness);
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal mengubah status kesiapan supir." };
  }

  revalidatePath("/fleet/drivers");
  return { success: true, message: `Status supir berhasil diubah menjadi ${readiness}.` };
}

/**
 * Server Action untuk menonaktifkan supir.
 */
export async function deleteDriverAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) return { success: false, message: "ID supir tidak valid." };

  try {
    await apiDeleteDriver(id);
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal menonaktifkan supir." };
  }

  revalidatePath("/fleet/drivers");
  return { success: true, message: "Supir berhasil dinonaktifkan dari roster." };
}

/**
 * Server Action untuk memperbarui konfigurasi AI Gateway, model, dan mitigasi kuota.
 */
export async function updateAiConfigAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const gatewayUrl = (formData.get("gatewayUrl") as string)?.trim();
  const apiKey = (formData.get("apiKey") as string)?.trim();
  const activeModel = (formData.get("activeModel") as string)?.trim();
  const fallbackModel = (formData.get("fallbackModel") as string)?.trim();
  const fallbackGatewayUrl = (formData.get("fallbackGatewayUrl") as string)?.trim();
  const fallbackApiKey = (formData.get("fallbackApiKey") as string)?.trim();
  const autoFallbackEnabled = formData.get("autoFallbackEnabled") === "on";
  const proxyUrl = (formData.get("proxyUrl") as string)?.trim();
  const systemPrompt = (formData.get("systemPrompt") as string)?.trim();
  const temperature = parseFloat((formData.get("temperature") as string) || "0.7");
  const maxTokens = parseInt((formData.get("maxTokens") as string) || "1000", 10);
  const enableRag = formData.get("enableRag") === "on";

  try {
    await apiUpdateAiConfig({
      gatewayUrl,
      apiKey,
      activeModel,
      fallbackModel,
      fallbackGatewayUrl,
      fallbackApiKey,
      autoFallbackEnabled,
      proxyUrl,
      systemPrompt,
      temperature,
      maxTokens,
      enableRag,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal menyimpan konfigurasi AI Gateway." };
  }

  revalidatePath("/admin/ai-hub");
  return { success: true, message: "Konfigurasi AI Gateway berhasil disimpan." };
}

/**
 * Server Action untuk memeriksa kesehatan koneksi gateway dan status kuota secara langsung.
 */
export async function checkAiGatewayHealthAction() {
  try {
    const data = await apiCheckAiGatewayHealth();
    revalidatePath("/admin/ai-hub");
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal memeriksa kesehatan gateway.",
      data: null,
    };
  }
}

/**
 * Server Action untuk membuat dokumen pengetahuan baru.
 */
export async function createKnowledgeDocumentAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const title = (formData.get("title") as string)?.trim();
  const category = (formData.get("category") as string)?.trim() || "SOP";
  const content = (formData.get("content") as string)?.trim();
  const isActive = formData.get("isActive") !== "off";

  if (!title || !content) {
    return { success: false, message: "Judul dan isi dokumen pengetahuan wajib diisi." };
  }

  try {
    await apiCreateKnowledgeDocument({ title, category, content, isActive });
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal menambahkan dokumen pengetahuan." };
  }

  revalidatePath("/admin/ai-hub");
  return { success: true, message: "Dokumen pengetahuan berhasil ditambahkan." };
}

/**
 * Server Action untuk mengubah status aktif atau mengedit dokumen pengetahuan.
 */
export async function updateKnowledgeDocumentAction(
  id: string,
  payload: { title?: string; category?: string; content?: string; isActive?: boolean },
): Promise<ActionState> {
  if (!id) return { success: false, message: "ID dokumen tidak valid." };

  try {
    await apiUpdateKnowledgeDocument(id, payload);
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal memperbarui dokumen pengetahuan." };
  }

  revalidatePath("/admin/ai-hub");
  return { success: true, message: "Dokumen pengetahuan berhasil diperbarui." };
}

/**
 * Server Action untuk menghapus dokumen pengetahuan.
 */
export async function deleteKnowledgeDocumentAction(id: string): Promise<ActionState> {
  if (!id) return { success: false, message: "ID dokumen tidak valid." };

  try {
    await apiDeleteKnowledgeDocument(id);
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal menghapus dokumen pengetahuan." };
  }

  revalidatePath("/admin/ai-hub");
  return { success: true, message: "Dokumen pengetahuan berhasil dihapus." };
}

/**
 * Server Action untuk menarik live models dari gateway.
 */
export async function fetchGatewayModelsAction(gatewayUrl?: string, apiKey?: string) {
  try {
    const data = await apiFetchGatewayModels(gatewayUrl, apiKey);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal mengambil daftar model.",
      data: {
        models: ["gemini-2.5-flash", "claude-3-5-sonnet", "deepseek-chat", "gpt-4o-mini"],
        source: "fallback",
        count: 4,
      },
    };
  }
}

/**
 * Server Action untuk mengambil live log aktivitas 9Router Gateway.
 */
export async function getAiGatewayLogsAction() {
  try {
    const data = await apiGetAiGatewayLogs();
    return { success: true, data };
  } catch (err) {
    return { success: false, data: [], message: err instanceof Error ? err.message : "Gagal memuat log." };
  }
}

/**
 * Server Action untuk membersihkan live log 9Router.
 */
export async function clearAiGatewayLogsAction() {
  try {
    await apiClearAiGatewayLogs();
    revalidatePath("/admin/ai-hub");
    return { success: true };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Gagal membersihkan log." };
  }
}

/**
 * Server Action untuk mengekstrak isi dokumen digital (PDF, DOCX, MD, TXT).
 */
export async function parseKnowledgeFileAction(filename: string, contentBase64: string) {
  try {
    const data = await apiParseKnowledgeFile(filename, contentBase64);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      data: null,
      message: err instanceof Error ? err.message : "Gagal mengekstrak isi berkas dokumen.",
    };
  }
}

/**
 * Server Action untuk uji coba chat sandbox dengan RAG context dan parameter dinamis.
 */
export async function testAiChatAction(
  prompt: string,
  history?: Array<{ role: string; content: string }>,
  options?: { temperature?: number; maxTokens?: number; systemPrompt?: string },
) {
  try {
    const data = await apiTestAiChat(prompt, history, options);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal memproses pesan chat.",
      data: null,
    };
  }
}

// Menghapus cookie sesi staf/admin dan mengembalikan tampilan ke halaman masuk.
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("admin_token");
  cookieStore.delete("client_token");
  redirect("/login");
}
