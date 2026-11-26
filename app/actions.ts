"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  apiAdminLogin,
  apiCreateAdminAccount,
  apiUpdateAdminAccount,
  apiDeleteAdminAccount,
  apiCorrectCustomerName,
  apiSetCustomerActive,
  apiUnlockCustomer,
  apiRevokeCustomerSessions,
  apiDeleteCustomerAccount,
  getCustomerDetail,
  apiReplyToTicket,
  apiTakeOverTicket,
  apiUpdateBookingStatus,
  apiUpdateRefund,
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
  apiGetKnowledgeCategories,
  apiCreateKnowledgeCategory,
  apiUpdateKnowledgeCategory,
  apiDeleteKnowledgeCategory,
  apiTestAiChat,
  apiGetAiGatewayLogs,
  apiClearAiGatewayLogs,
  apiParseKnowledgeFile,
  apiReindexRagKnowledge,
  apiUnggahFotoKendaraan,
  apiUnggahMedia,
  apiCreateBookingLineItem,
  apiCancelBookingLineItem,
  apiUnggahTemplate,
  apiAktifkanVersi,
  apiCreateFaq,
  apiUpdateFaq,
  apiDeleteFaq,
  apiToggleFaqActive,
  apiCreateVehicle,
  apiUpdateVehicle,
  apiDeleteVehicle,
  apiCompleteVehicleService,
  ApiError,
  apiClaimTicket,
  apiTakeoverTicket,
  apiReleaseTicket,
  apiGetBookingDocuments,
  apiAdminVerifyBookingDocuments,
  type VehiclePayload,
} from "@/lib/api";
import {
  getTicketDetail,
  getTicketMessages,
  getFinanceSummary,
  type FinanceSummary,
  type KnowledgeDocument,
  type TicketMessageView,
} from "@/lib/operations";
import {
  PILIHAN_BULAN_OMZET,
  PILIHAN_PERIODE_KEUANGAN,
  jumlahBulanUntukPeriode,
  type JumlahBulanOmzet,
  type PeriodeKeuangan,
} from "@/lib/financePeriod";
import type {
  AdminRole,
  CanonicalBookingStatus,
  FaqItem,
  Vehicle,
  BookingDocument,
} from "@/lib/types";

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
  const password = (formData.get("password") as string) || "";
  const rememberMe = formData.get("rememberMe") === "on";

  const errors: Record<string, string> = {};
  if (!username) errors.username = "Username wajib diisi.";
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
  /* Di production cookie wajib hanya terkirim lewat HTTPS. */
  const secure = process.env.NODE_ENV === "production";
  cookieStore.set("admin_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    // Tanpa pilihan ingat sesi, cookie dihapus saat browser ditutup.
    // JWT backend tetap kedaluwarsa setelah 1 jam meski cookie masih ada.
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 7 } : {}),
  });
  cookieStore.set("client_token", token, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    secure,
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 7 } : {}),
  });

  redirect("/");
}

function extractFieldErrors(details: unknown): Record<string, string> | undefined {
  if (!details || typeof details !== "object") return undefined;
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(details as Record<string, unknown>)) {
    if (Array.isArray(val) && typeof val[0] === "string") {
      result[key] = val[0];
    } else if (typeof val === "string") {
      result[key] = val;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function isValidAdminUsername(value: string): boolean {
  return (
    value.length >= 3 &&
    value.length <= 30 &&
    /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])$/i.test(value) &&
    !/[._-]{2}/.test(value)
  );
}

function validateAdminPassword(password: string): string | null {
  if (password.length < 8) return "Kata sandi minimal 8 karakter.";
  if (new TextEncoder().encode(password).length > 72) return "Kata sandi maksimal 72 byte.";
  if (!/[A-Z]/.test(password)) return "Kata sandi harus memuat huruf besar.";
  if (!/[a-z]/.test(password)) return "Kata sandi harus memuat huruf kecil.";
  if (!/[0-9]/.test(password)) return "Kata sandi harus memuat angka.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Kata sandi harus memuat simbol.";
  return null;
}

export async function createAdminAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const fullName = (formData.get("fullName") as string)?.trim() || "";
  const username = (formData.get("username") as string)?.trim().toLowerCase() || "";
  const role = (formData.get("role") as AdminRole) || "staf_operasional";
  const password = (formData.get("password") as string) || "";

  const errors: Record<string, string> = {};
  if (fullName.length < 3) errors.fullName = "Nama lengkap minimal 3 karakter.";
  if (!username || !isValidAdminUsername(username)) {
    errors.username =
      "Username harus 3-30 karakter, diawali dan diakhiri huruf/angka, tanpa tanda baca berurutan.";
  }
  const passwordErr = validateAdminPassword(password);
  if (passwordErr) {
    errors.password = passwordErr;
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: Object.values(errors)[0],
      errors,
    };
  }

  try {
    await apiCreateAdminAccount({
      fullName,
      username,
      role,
      password,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      const errorsFromApi = extractFieldErrors(err.details);
      const firstDetail = errorsFromApi ? Object.values(errorsFromApi)[0] : undefined;
      return {
        success: false,
        message: firstDetail && err.message === "Format data tidak valid." ? firstDetail : err.message,
        errors: errorsFromApi,
      };
    }
    return { success: false, message: "Gagal membuat akun admin pada backend." };
  }

  revalidatePath("/admin");
  return { success: true, message: `Akun ${fullName} berhasil dibuat.` };
}

export async function updateAdminAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = formData.get("id") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const rawUsername = (formData.get("username") as string | null)?.trim().toLowerCase();
  const username = rawUsername ? rawUsername : undefined;
  const role = (formData.get("role") as AdminRole) || undefined;
  const rawPassword = (formData.get("password") as string | null) ?? "";
  const password = rawPassword.length > 0 ? rawPassword : undefined;
  const activeVal = formData.get("active");
  const isActive = activeVal !== null ? activeVal === "true" : undefined;

  if (!id) {
    return { success: false, message: "ID akun tidak valid." };
  }

  const errors: Record<string, string> = {};
  if (fullName !== undefined && fullName.length > 0 && fullName.length < 3) {
    errors.fullName = "Nama lengkap minimal 3 karakter.";
  }
  if (username !== undefined && !isValidAdminUsername(username)) {
    errors.username =
      "Username harus 3-30 karakter, diawali dan diakhiri huruf/angka, tanpa tanda baca berurutan.";
  }

  if (password) {
    const passwordErr = validateAdminPassword(password);
    if (passwordErr) {
      errors.password = passwordErr;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: Object.values(errors)[0],
      errors,
    };
  }

  try {
    await apiUpdateAdminAccount(id, {
      fullName,
      username,
      role,
      password,
      isActive,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      const errorsFromApi = extractFieldErrors(err.details);
      const firstDetail = errorsFromApi ? Object.values(errorsFromApi)[0] : undefined;
      return {
        success: false,
        message: firstDetail && err.message === "Format data tidak valid." ? firstDetail : err.message,
        errors: errorsFromApi,
      };
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
 * Memuat percakapan satu tiket saat admin berpindah tiket di Customer Care.
 *
 * Sebelumnya percakapan hanya diambil sekali untuk tiket pertama, lalu tidak pernah
 * dimuat ulang. Akibatnya mengklik tiket lain tetap menampilkan pesan tiket pertama,
 * pesan pelanggan tertukar antar tiket, dan balasan bisa dikirim ke tiket yang salah.
 */
export async function loadTicketMessagesAction(ticketId: string): Promise<{
  success: boolean;
  messages: TicketMessageView[];
  handledBy?: string;
  assignedAdminId?: string | null;
  assignedAdminName?: string | null;
  isMine?: boolean;
  status?: string;
  rawStatus?: string;
  message?: string;
}> {
  if (!ticketId) {
    return { success: false, messages: [], message: "Tiket tidak valid." };
  }

  try {
    const detail = await getTicketDetail(ticketId);
    return {
      success: true,
      messages: detail.messages,
      handledBy: detail.handledBy,
      assignedAdminId: detail.assignedAdminId,
      assignedAdminName: detail.assignedAdminName,
      isMine: detail.isMine,
      status: detail.status,
      rawStatus: detail.rawStatus,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, messages: [], message: err.message };
    }
    return { success: false, messages: [], message: "Percakapan tiket gagal dimuat." };
  }
}

/**
 * Server Action untuk mengubah status tiket bantuan.
 *
 * Hanya status yang bukan akhir yang bisa dipilih. Tiket diselesaikan atau
 * ditutup oleh sistem — bukan oleh staf — supaya percakapan yang belum selesai
 * tidak hilang dari antrean.
 */
export async function updateTicketStatusAction(
  ticketId: string,
  status: "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER",
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
    message: `Status tiket berhasil diubah menjadi ${status}.`,
  };
}

/**
 * Server Action untuk mengambil alih tiket bantuan dari asisten AI.
 */
export async function takeOverTicketAction(ticketId: string): Promise<ActionState> {
  if (!ticketId) {
    return { success: false, message: "Tiket tidak valid." };
  }

  try {
    await apiTakeOverTicket(ticketId);
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal mengambil alih tiket dari AI." };
  }

  revalidatePath("/customer-care");
  return { success: true, message: "Tiket berhasil diambil alih dari AI." };
}

/**
 * A15.1 â€” mengambil tiket supaya terkunci ke admin ini.
 */
export async function claimTicketAction(ticketId: string): Promise<ActionState> {
  if (!ticketId) return { success: false, message: "Tiket tidak valid." };

  try {
    await apiClaimTicket(ticketId);
  } catch (err) {
    if (err instanceof ApiError) return { success: false, message: err.message };
    return { success: false, message: "Gagal mengambil tiket." };
  }

  revalidatePath("/customer-care");
  return { success: true, message: "Tiket diambil. Sekarang Anda bisa membalas." };
}

/**
 * A15.1 â€” mengambil alih tiket dari admin lain. Khusus ADMIN.
 */
export async function takeoverAssignedTicketAction(ticketId: string): Promise<ActionState> {
  if (!ticketId) return { success: false, message: "Tiket tidak valid." };

  try {
    await apiTakeoverTicket(ticketId);
  } catch (err) {
    if (err instanceof ApiError) return { success: false, message: err.message };
    return { success: false, message: "Gagal mengambil alih tiket." };
  }

  revalidatePath("/customer-care");
  return { success: true, message: "Tiket diambil alih dari admin sebelumnya." };
}

/**
 * A15.1 â€” melepas tiket supaya bisa diambil admin lain.
 */
export async function releaseTicketAction(ticketId: string): Promise<ActionState> {
  if (!ticketId) return { success: false, message: "Tiket tidak valid." };

  try {
    await apiReleaseTicket(ticketId);
  } catch (err) {
    if (err instanceof ApiError) return { success: false, message: err.message };
    return { success: false, message: "Gagal melepas tiket." };
  }

  revalidatePath("/customer-care");
  return { success: true, message: "Tiket dilepas. Admin lain sekarang bisa mengambilnya." };
}

/**
 * Server Action untuk mengubah status pemesanan sewa (konfirmasi tarif, penolakan, pelunasan, serah terima, selesai).
 */
export async function updateBookingStatusAction(
  bookingId: string,
  status: CanonicalBookingStatus,
  note?: string,
): Promise<ActionState & { data?: unknown }> {
  if (!bookingId) {
    return { success: false, message: "Kode pemesanan tidak valid." };
  }

  try {
    const data = await apiUpdateBookingStatus(bookingId, status, note);
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/refunds");
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
): Promise<ActionState & { data?: { id?: string } }> {
  const fullName = (formData.get("fullName") as string)?.trim() || "";
  const phoneNumber = (formData.get("phoneNumber") as string)?.trim() || undefined;
  const licenseNumber = (formData.get("licenseNumber") as string)?.trim() || undefined;
  /* Jenis SIM dipilih dari daftar, jadi nilainya sudah pasti salah satu enum.
     String kosong berarti "belum ditetapkan" dan dikirim sebagai null. */
  const licenseTypeRaw = (formData.get("licenseType") as string)?.trim() || "";
  const licenseType =
    licenseTypeRaw === "SIM_A" ||
    licenseTypeRaw === "SIM_B1" ||
    licenseTypeRaw === "SIM_B2" ||
    licenseTypeRaw === "SIM_C"
      ? licenseTypeRaw
      : null;
  const rawRoute = (formData.get("route") as string)?.trim() || "dalam_kota";
  const routeScope = rawRoute === "luar_kota" ? "LUAR_KOTA" : "DALAM_KOTA";

  const errors: Record<string, string> = {};
  if (!fullName || fullName.length < 3) errors.fullName = "Nama supir minimal 3 karakter.";

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  let hasil: unknown;
  try {
    hasil = await apiCreateDriver({
      fullName,
      phoneNumber,
      licenseNumber,
      licenseType,
      routeScope,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal mendaftarkan supir baru ke backend." };
  }

  revalidatePath("/fleet/drivers");
  return {
    success: true,
    message: `Supir ${fullName} berhasil didaftarkan ke roster.`,
    /* ID asli dikembalikan supaya pemanggil bisa mengganti id sementara `d-...`
       di layar. Tanpa ini, menyunting supir yang baru ditambah akan mengirim
       PATCH ke id sementara dan ditolak 404. */
    data: hasil as { id?: string },
  };
}

/**
 * Server Action untuk memperbarui data supir.
 */
export async function updateDriverAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState & { data?: { id?: string } }> {
  const id = (formData.get("id") as string)?.trim() || "";
  const fullName = (formData.get("fullName") as string)?.trim() || undefined;
  const phoneNumber = (formData.get("phoneNumber") as string)?.trim() || undefined;
  const licenseNumber = (formData.get("licenseNumber") as string)?.trim() || undefined;
  /* Jenis SIM dipilih dari daftar, jadi nilainya sudah pasti salah satu enum.
     String kosong berarti "belum ditetapkan" dan dikirim sebagai null. */
  const licenseTypeRaw = (formData.get("licenseType") as string)?.trim() || "";
  const licenseType =
    licenseTypeRaw === "SIM_A" ||
    licenseTypeRaw === "SIM_B1" ||
    licenseTypeRaw === "SIM_B2" ||
    licenseTypeRaw === "SIM_C"
      ? licenseTypeRaw
      : null;
  /* Foto SIM tidak lagi diunggah dari form supir: kelayakan mengemudi diperiksa
     saat wawancara dengan melihat dokumen fisik. Kolomnya sengaja TIDAK dikirim
     sama sekali, bukan dikirim sebagai null. Backend membedakan "tidak diubah"
     (undefined) dari "dikosongkan" (null); kalau null yang dikirim, foto lama
     pada data yang sudah ada akan terhapus setiap kali profil disunting. */
  const rawRoute = (formData.get("route") as string)?.trim() || "dalam_kota";
  const routeScope = rawRoute === "luar_kota" ? "LUAR_KOTA" : "DALAM_KOTA";

  if (!id) return { success: false, message: "ID supir tidak valid." };

  let hasil: unknown;
  try {
    hasil = await apiUpdateDriver(id, {
      fullName,
      phoneNumber,
      licenseNumber,
      licenseType,
      routeScope,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal memperbarui data supir." };
  }

  revalidatePath("/fleet/drivers");
  return {
    success: true,
    message: "Data supir berhasil diperbarui.",
    data: hasil as { id?: string },
  };
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
  const payload: Parameters<typeof apiUpdateAiConfig>[0] = {};

  if (formData.has("gatewayUrl")) {
    const v = String(formData.get("gatewayUrl") ?? "").trim();
    if (v) payload.gatewayUrl = v;
  }
  if (formData.has("apiKey")) {
    const v = String(formData.get("apiKey") ?? "").trim();
    if (v) payload.apiKey = v;
  }
  if (formData.has("activeModel")) {
    const v = String(formData.get("activeModel") ?? "").trim();
    if (v) payload.activeModel = v;
  }
  if (formData.has("fallbackModel")) {
    const v = String(formData.get("fallbackModel") ?? "").trim();
    if (v) payload.fallbackModel = v;
  }
  if (formData.has("fallbackGatewayUrl")) {
    const v = String(formData.get("fallbackGatewayUrl") ?? "").trim();
    if (v) payload.fallbackGatewayUrl = v;
  }
  if (formData.has("fallbackApiKey")) {
    const v = String(formData.get("fallbackApiKey") ?? "").trim();
    if (v) payload.fallbackApiKey = v;
  }
  if (formData.has("autoFallbackEnabled")) {
    payload.autoFallbackEnabled = formData.get("autoFallbackEnabled") === "on";
  }
  if (formData.has("proxyUrl")) {
    payload.proxyUrl = String(formData.get("proxyUrl") ?? "").trim();
  }
  if (formData.has("systemPrompt")) {
    payload.systemPrompt = String(formData.get("systemPrompt") ?? "").trim();
  }
  if (formData.has("temperature")) {
    const t = parseFloat(String(formData.get("temperature") ?? ""));
    if (!Number.isNaN(t)) payload.temperature = t;
  }
  if (formData.has("maxTokens")) {
    const m = parseInt(String(formData.get("maxTokens") ?? ""), 10);
    if (!Number.isNaN(m)) payload.maxTokens = m;
  }
  if (formData.has("enableRag")) {
    const v = formData.get("enableRag");
    payload.enableRag = v === "on" || v === "true";
  }

  try {
    await apiUpdateAiConfig(payload);
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
): Promise<ActionState & { data?: KnowledgeDocument }> {
  const title = (formData.get("title") as string)?.trim();
  const category = (formData.get("category") as string)?.trim() || "SOP";
  const content = (formData.get("content") as string)?.trim();
  const isActive = formData.get("isActive") !== "off";

  if (!title || !content) {
    return { success: false, message: "Judul dan isi dokumen pengetahuan wajib diisi." };
  }

  let createdDoc: KnowledgeDocument;
  try {
    createdDoc = (await apiCreateKnowledgeDocument({
      title,
      category,
      content,
      isActive,
    })) as KnowledgeDocument;
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal menambahkan dokumen pengetahuan." };
  }

  revalidatePath("/admin/ai-hub");
  return {
    success: true,
    message: "Dokumen pengetahuan berhasil ditambahkan.",
    data: createdDoc,
  };
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
 * Server Action untuk mengambil live log aktivitas 9Router Gateway.
 */
export async function getAiGatewayLogsAction() {
  try {
    const data = await apiGetAiGatewayLogs();
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      data: { httpLogs: [], rawLogs: [] },
      message: err instanceof Error ? err.message : "Gagal memuat log.",
    };
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
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal membersihkan log.",
    };
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
 * Server Action untuk menyinkronkan ulang seluruh chunk & embedding indeks RAG.
 */
export async function reindexRagKnowledgeAction(force: boolean = false) {
  try {
    const data = await apiReindexRagKnowledge(force);
    revalidatePath("/admin/ai-hub");
    return {
      success: true,
      data,
      message: `Indeks RAG disinkronkan: ${data.chunksTotal} chunk (${data.embeddedNow} baru, ${data.reused} digunakan ulang).`,
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      message: err instanceof Error ? err.message : "Gagal menyinkronkan indeks RAG.",
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

/**
 * Server Action untuk membuat entri FAQ baru.
 */
export async function createFaqAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState & { data?: FaqItem }> {
  const question = (formData.get("question") as string)?.trim() || "";
  const answer = (formData.get("answer") as string)?.trim() || "";
  const category = (formData.get("category") as string)?.trim() || "Umum";
  const orderIndexStr = formData.get("orderIndex") as string;
  const orderIndex =
    orderIndexStr !== null && orderIndexStr !== "" ? parseInt(orderIndexStr, 10) : 0;
  const activeVal = formData.get("isActive");
  const isActive = activeVal !== null ? activeVal === "true" || activeVal === "on" : true;

  const errors: Record<string, string> = {};
  if (!question) errors.question = "Pertanyaan wajib diisi.";
  if (!answer) errors.answer = "Jawaban wajib diisi.";
  if (!category) errors.category = "Kategori wajib diisi.";

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const data = await apiCreateFaq({
      question,
      answer,
      category,
      orderIndex: isNaN(orderIndex) ? 0 : orderIndex,
      isActive,
    });
    revalidatePath("/faqs");
    return { success: true, message: "FAQ baru berhasil ditambahkan.", data };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal membuat FAQ pada backend." };
  }
}

/**
 * Server Action untuk memperbarui data FAQ.
 */
export async function updateFaqAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState & { data?: FaqItem }> {
  const id = (formData.get("id") as string)?.trim() || "";
  const question = (formData.get("question") as string)?.trim();
  const answer = (formData.get("answer") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  const orderIndexStr = formData.get("orderIndex") as string;
  const orderIndex =
    orderIndexStr !== null && orderIndexStr !== "" ? parseInt(orderIndexStr, 10) : undefined;
  const activeVal = formData.get("isActive");
  const isActive = activeVal !== null ? activeVal === "true" || activeVal === "on" : undefined;

  if (!id) {
    return { success: false, message: "ID FAQ tidak valid." };
  }

  const errors: Record<string, string> = {};
  if (question !== undefined && !question) errors.question = "Pertanyaan tidak boleh kosong.";
  if (answer !== undefined && !answer) errors.answer = "Jawaban tidak boleh kosong.";
  if (category !== undefined && !category) errors.category = "Kategori tidak boleh kosong.";

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const data = await apiUpdateFaq(id, {
      question,
      answer,
      category,
      orderIndex: orderIndex !== undefined && !isNaN(orderIndex) ? orderIndex : undefined,
      isActive,
    });
    revalidatePath("/faqs");
    return { success: true, message: "FAQ berhasil diperbarui.", data };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal memperbarui FAQ pada backend." };
  }
}

/**
 * Server Action untuk menghapus FAQ secara permanen.
 */
export async function deleteFaqAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = (formData.get("id") as string)?.trim() || "";
  if (!id) {
    return { success: false, message: "ID FAQ tidak valid." };
  }

  try {
    await apiDeleteFaq(id);
    revalidatePath("/faqs");
    return { success: true, message: "FAQ berhasil dihapus." };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal menghapus FAQ pada backend." };
  }
}

/**
 * Server Action untuk toggle status aktif / visibilitas mobile FAQ.
 */
export async function toggleFaqActiveAction(id: string): Promise<ActionState & { data?: FaqItem }> {
  if (!id) {
    return { success: false, message: "ID FAQ tidak valid." };
  }

  try {
    const data = await apiToggleFaqActive(id);
    revalidatePath("/faqs");
    return {
      success: true,
      message: `Status FAQ berhasil diubah menjadi ${data.isActive ? "Tampil di Mobile" : "Disembunyikan"}.`,
      data,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal mengubah status visibilitas FAQ." };
  }
}

/**
 * Server Action untuk penyesuaian cepat prioritas urutan FAQ.
 */
export async function updateFaqPriorityAction(
  id: string,
  orderIndex: number,
): Promise<ActionState & { data?: FaqItem }> {
  if (!id) {
    return { success: false, message: "ID FAQ tidak valid." };
  }

  try {
    const data = await apiUpdateFaq(id, { orderIndex });
    revalidatePath("/faqs");
    return { success: true, message: "Prioritas urutan berhasil diperbarui.", data };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal memperbarui urutan FAQ." };
  }
}

/**
 * Server Action untuk menyimpan atau menambah armada mobil beserta tarif sewa harian.
 */
/**
 * Menyimpan unit armada: menambah baru atau memperbarui yang sudah ada.
 *
 * `mode` WAJIB disebut pemanggil, karena hanya pemanggil yang tahu apakah admin
 * sedang membuka modal "Tambah Armada" atau "Edit Spesifikasi". Sebelumnya
 * keputusan itu ditebak dari awalan id (`v-`), dan tebakan itu salah begitu id
 * sementara tertinggal di state: unit yang baru dibuat lalu disunting akan
 * dikirim sebagai unit BARU, sehingga datanya terduplikasi atau ditolak karena
 * externalId sudah dipakai.
 *
 * Tebakan awalan `v-` masih dipertahankan sebagai cadangan untuk pemanggil lama,
 * tetapi bukan lagi satu-satunya penentu.
 */
export async function saveVehicleAction(
  vehicle: Vehicle,
  mode?: "create" | "update",
): Promise<ActionState & { data?: { id?: string } }> {
  try {
    const isNew = mode ? mode === "create" : vehicle.id.startsWith("v-") || !vehicle.id;
    /* Unit dalam masa pemeriksaan yang tetap berstatus "pemeriksaan" (atau "disewa")
       tidak mengirim perubahan operationalStatus. Namun bila staf mengubah statusnya
       dari "pemeriksaan" ke "servis" (MAINTENANCE) atau "tidak_tersedia" (UNAVAILABLE)
       karena ditemukan kerusakan saat inspeksi, operationalStatus dikirim agar masa
       IN_SERVICE ditutup di backend. */
    const sedangPemeriksaanAtauDisewa =
      vehicle.status === "pemeriksaan" || vehicle.status === "disewa";
    const operationalStatus: NonNullable<VehiclePayload["operationalStatus"]> =
      vehicle.status === "tersedia"
        ? "AVAILABLE"
        : vehicle.status === "servis"
          ? "MAINTENANCE"
          : vehicle.status === "disewa"
            ? "BOOKED"
            : "UNAVAILABLE";
    const payload = {
      name: vehicle.name,
      licensePlate: vehicle.plate,
      category: vehicle.category ?? "MPV",
      transmission:
        vehicle.transmission?.toUpperCase() === "MATIC"
          ? "AUTOMATIC"
          : vehicle.transmission?.toUpperCase() || "MANUAL",
      seatingCapacity: vehicle.seats ?? 7,
      pricePerDay: Number(vehicle.pricePerDay) || 0,
      /* Foto ikut dikirim. Sebelumnya hanya menjadi pratinjau di layar lalu
           hilang saat modal ditutup, sehingga unit tidak pernah punya foto. */
      imageUrl: vehicle.imageUrl ?? undefined,
      ...(sedangPemeriksaanAtauDisewa ? {} : { operationalStatus }),
    };

    let result;
    if (isNew) {
      result = await apiCreateVehicle(payload);
    } else {
      result = await apiUpdateVehicle(vehicle.id, payload);
    }

    revalidatePath("/fleet/catalog");
    revalidatePath("/fleet/calendar");
    return {
      success: true,
      message: isNew
        ? `Unit ${vehicle.name} berhasil ditambahkan ke katalog.`
        : `Spesifikasi & tarif ${vehicle.name} berhasil diperbarui.`,
      data: result,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal menyimpan perubahan armada ke database." };
  }
}

/**
 * Server Action untuk menghapus unit armada mobil dari katalog.
 */
export async function deleteVehicleAction(id: string): Promise<ActionState> {
  if (!id) {
    return { success: false, message: "ID armada tidak valid." };
  }

  try {
    await apiDeleteVehicle(id);
    revalidatePath("/fleet/catalog");
    revalidatePath("/fleet/calendar");
    return { success: true, message: "Armada berhasil dihapus dari sistem." };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal menghapus armada pada backend." };
  }
}

/**
 * Server Action untuk menutup masa pemeriksaan armada.
 *
 * Catatan wajib diisi: tanpa catatan, tidak ada jejak kondisi unit saat
 * dikembalikan pelanggan, dan riwayat inspeksi hanya berisi stempel waktu.
 */
export async function completeVehicleServiceAction(
  id: string,
  note: string,
): Promise<ActionState> {
  const catatan = note.trim();
  if (!id) {
    return { success: false, message: "ID armada tidak valid." };
  }
  if (catatan.length < 3) {
    return { success: false, message: "Catatan inspeksi wajib diisi minimal 3 karakter." };
  }

  try {
    await apiCompleteVehicleService(id, catatan);
    revalidatePath("/fleet/catalog");
    revalidatePath("/fleet/calendar");
    return { success: true, message: "Masa pemeriksaan ditutup. Unit kembali tersedia." };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal menutup masa pemeriksaan armada." };
  }
}

// Menghapus cookie sesi staf/admin dan mengembalikan tampilan ke halaman masuk.
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("admin_token");
  cookieStore.delete("client_token");
  redirect("/login");
}

/**
 * Kategori dokumen pengetahuan RAG.
 *
 * Dipisah dari aksi dokumen karena urusannya berbeda: dokumen mengubah isi
 * pengetahuan, kategori mengubah cara pengetahuan dikelompokkan.
 */
export async function createKnowledgeCategoryAction(
  label: string,
): Promise<
  ActionState & { data?: { id: string; slug: string; label: string; orderIndex: number } }
> {
  if (!label.trim()) {
    return { success: false, message: "Nama kategori wajib diisi." };
  }

  try {
    const data = await apiCreateKnowledgeCategory(label.trim());
    revalidatePath("/admin/ai-hub");
    return { success: true, message: "Kategori berhasil ditambahkan.", data };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal menambah kategori." };
  }
}

export async function updateKnowledgeCategoryAction(
  id: string,
  payload: { label?: string; orderIndex?: number },
): Promise<ActionState> {
  if (!id) {
    return { success: false, message: "ID kategori tidak valid." };
  }

  try {
    await apiUpdateKnowledgeCategory(id, payload);
    revalidatePath("/admin/ai-hub");
    return { success: true, message: "Kategori berhasil diperbarui." };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal memperbarui kategori." };
  }
}

export async function deleteKnowledgeCategoryAction(id: string): Promise<ActionState> {
  if (!id) {
    return { success: false, message: "ID kategori tidak valid." };
  }

  try {
    await apiDeleteKnowledgeCategory(id);
    revalidatePath("/admin/ai-hub");
    return { success: true, message: "Kategori berhasil dihapus." };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal menghapus kategori." };
  }
}
/** Memuat ulang daftar kategori setelah ada perubahan. */
export async function getKnowledgeCategoriesAction(): Promise<
  ActionState & {
    data?: {
      id: string;
      slug: string;
      label: string;
      orderIndex: number;
      jumlahDokumen?: number;
    }[];
  }
> {
  try {
    const data = await apiGetKnowledgeCategories();
    return { success: true, message: "Daftar kategori dimuat.", data };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal memuat kategori." };
  }
}

export async function getBookingDocumentsAction(
  bookingId: string,
): Promise<ActionState & { data?: BookingDocument | null }> {
  try {
    const data = await apiGetBookingDocuments(bookingId);
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal memuat dokumen pemesanan." };
  }
}

export async function verifyBookingDocumentsAction(
  bookingId: string,
  action: "APPROVE" | "REJECT",
  rejectionReason?: string,
  rejectionTargets?: string[],
): Promise<ActionState & { data?: BookingDocument }> {
  try {
    const data = await apiAdminVerifyBookingDocuments(
      bookingId,
      action,
      rejectionReason,
      rejectionTargets,
    );
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${bookingId}`);
    return {
      success: true,
      message:
        action === "APPROVE"
          ? "Dokumen persyaratan lepas kunci berhasil diverifikasi dan disetujui."
          : "Dokumen persyaratan telah ditolak. Pelanggan dapat mengunggah ulang perbaikan.",
      data,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal memverifikasi dokumen." };
  }
}

// Template Dokumen Resmi (Form Kesanggupan)

/**
 * Mengunggah berkas dokumen resmi sebagai versi baru.
 *
 * Berkas diteruskan apa adanya ke backend. Pemeriksaan jenis dan ukuran
 * dilakukan di sana, karena hanya di server isi berkas bisa dibaca untuk
 * memastikan itu benar-benar PDF atau Word.
 */
export async function unggahTemplateDokumenAction(
  formData: FormData,
): Promise<ActionState & { versi?: number }> {
  const berkas = formData.get("berkas");

  if (!(berkas instanceof File) || berkas.size === 0) {
    return { success: false, message: "Pilih berkas dokumen terlebih dahulu." };
  }

  const judul = (formData.get("judul") as string | null)?.trim() || undefined;
  const catatan = (formData.get("catatan") as string | null)?.trim() || undefined;

  try {
    const hasil = await apiUnggahTemplate({ berkas, judul, catatan });

    revalidatePath("/documents");
    return {
      success: true,
      message: `Dokumen tersimpan sebagai versi ${hasil.versi} dan langsung dipakai pelanggan.`,
      versi: hasil.versi,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mengunggah dokumen.",
    };
  }
}

/** Mengaktifkan kembali versi lama tanpa membuat versi baru. */
export async function aktifkanVersiTemplateAction(id: string): Promise<ActionState> {
  try {
    const hasil = await apiAktifkanVersi(id);
    revalidatePath("/documents");
    return { success: true, message: `Versi ${hasil.versi} diaktifkan kembali.` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mengaktifkan versi.",
    };
  }
}

/**
 * Mengunggah foto armada setelah data unitnya tersimpan.
 *
 * Dipisah dari `saveVehicleAction` karena endpoint unggah membutuhkan ID unit
 * yang sudah ada. Untuk unit baru, ID itu baru didapat setelah penyimpanan
 * pertama berhasil.
 */
export async function unggahFotoKendaraanAction(
  id: string,
  formData: FormData,
): Promise<ActionState & { imageUrl?: string }> {
  const berkas = formData.get("berkas");

  if (!(berkas instanceof File) || berkas.size === 0) {
    return { success: false, message: "Pilih berkas foto terlebih dahulu." };
  }

  try {
    const imageUrl = await apiUnggahFotoKendaraan(id, berkas);
    revalidatePath("/fleet/catalog");
    revalidatePath("/fleet/calendar");
    return { success: true, message: "Foto armada tersimpan.", imageUrl };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mengunggah foto armada.",
    };
  }
}

/**
 * Menyimpan penyesuaian biaya manual (surcharge) pada satu pesanan.
 *
 * Sebelumnya modal hanya memanggil `onApply` yang menambah baris ke state React.
 * Deskripsi, nominal, dan justifikasi audit yang wajib diisi hilang begitu halaman
 * dimuat ulang, dan tidak ada satu pun jejak yang tersisa — padahal modalnya
 * menyatakan "Penyesuaian tercatat pada riwayat pesanan".
 *
 * Sekarang barisnya benar-benar tersimpan di `booking_line_items`, dan backend
 * mencatatnya ke audit log.
 */
export async function createBookingLineItemAction(
  bookingId: string,
  data: {
    kategori: string;
    deskripsi: string;
    nominal: number;
    arah: "TAMBAH" | "KURANG";
    justifikasi: string;
  },
): Promise<ActionState & { data?: unknown }> {
  if (!bookingId) {
    return { success: false, message: "Kode pemesanan tidak valid." };
  }

  if (!data.deskripsi?.trim()) {
    return { success: false, message: "Deskripsi penyesuaian wajib diisi." };
  }
  if (!Number.isFinite(data.nominal) || data.nominal <= 0) {
    return { success: false, message: "Nominal penyesuaian harus lebih dari 0." };
  }
  if (!data.justifikasi?.trim()) {
    return { success: false, message: "Justifikasi wajib diisi untuk audit internal." };
  }

  try {
    const hasil = await apiCreateBookingLineItem(bookingId, {
      ...data,
      deskripsi: data.deskripsi.trim(),
      justifikasi: data.justifikasi.trim(),
    });
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${bookingId}`);
    return {
      success: true,
      message: "Penyesuaian biaya tersimpan dan tercatat pada riwayat pesanan.",
      data: hasil,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal menyimpan penyesuaian biaya ke backend." };
  }
}

/**
 * Membatalkan penyesuaian biaya yang sudah tersimpan.
 *
 * Barisnya tidak dihapus di backend, hanya ditandai dibatalkan, supaya
 * penyesuaian yang pernah menagih pelanggan tetap bisa ditelusuri.
 */
export async function cancelBookingLineItemAction(
  bookingId: string,
  lineItemId: string,
): Promise<ActionState> {
  if (!bookingId || !lineItemId) {
    return { success: false, message: "Penyesuaian biaya tidak valid." };
  }

  try {
    await apiCancelBookingLineItem(bookingId, lineItemId);
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${bookingId}`);
    return { success: true, message: "Penyesuaian biaya dibatalkan." };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Gagal membatalkan penyesuaian biaya." };
  }
}

/**
 * Memuat ulang ringkasan keuangan dengan rentang bulan tertentu.
 *
 * Dipakai pemilih periode di tab Pemasukan. Datanya diambil di server, bukan di
 * browser, karena token sesi hanya ada di cookie HttpOnly dan endpoint finance
 * dijaga peran ADMIN/STAFF. Hanya grafik yang ikut berubah — kartu ringkasan
 * dan tabel armada tetap memakai rentang `range` seperti sebelumnya.
 */
export async function muatUlangGrafikKeuanganAction(
  bulan: JumlahBulanOmzet,
): Promise<ActionState & { data?: FinanceSummary }> {
  if (!PILIHAN_BULAN_OMZET.includes(bulan)) {
    return { success: false, message: "Rentang bulan tidak dikenali." };
  }

  try {
    const data = await getFinanceSummary("all", bulan);
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Grafik keuangan gagal dimuat ulang." };
  }
}

export async function muatUlangRingkasanKeuanganAction(
  periode: PeriodeKeuangan,
): Promise<ActionState & { data?: FinanceSummary }> {
  if (!PILIHAN_PERIODE_KEUANGAN.includes(periode)) {
    return { success: false, message: "Periode laporan keuangan tidak dikenali." };
  }

  try {
    const data = await getFinanceSummary(periode, jumlahBulanUntukPeriode(periode));
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Laporan keuangan gagal dimuat ulang." };
  }
}

// Akun Pelanggan & Koreksi Identitas

/**
 * Mengoreksi nama pelanggan.
 *
 * Alasan wajib diisi: inilah satu-satunya keterangan mengapa identitas seseorang
 * diubah oleh orang lain, dan ikut tersimpan di `identity_audits` di backend.
 */
export async function correctCustomerNameAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = (formData.get("id") as string) || "";
  const fullName = (formData.get("fullName") as string)?.trim() || "";
  const reason = (formData.get("reason") as string)?.trim() || "";

  const errors: Record<string, string> = {};
  if (!id) errors.id = "Akun tidak dikenali.";
  if (fullName.length < 3) errors.fullName = "Nama minimal 3 karakter.";
  if (reason.length < 10) {
    errors.reason = "Alasan minimal 10 karakter agar jejaknya bisa ditelusuri.";
  }
  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const hasil = await apiCorrectCustomerName(id, fullName, reason);
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    revalidatePath("/identity-audit");
    return { success: true, message: hasil.message };
  } catch (err) {
    if (err instanceof ApiError) return { success: false, message: err.message };
    return { success: false, message: "Gagal mengoreksi nama pelanggan." };
  }
}

/** Membuka penguncian akun pelanggan yang terkunci karena percobaan masuk. */
export async function unlockCustomerAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = (formData.get("id") as string) || "";
  const reason = (formData.get("reason") as string)?.trim() || "";

  if (!id) return { success: false, message: "Akun tidak dikenali." };

  try {
    const hasil = await apiUnlockCustomer(id, reason);
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: true, message: hasil.message };
  } catch (err) {
    if (err instanceof ApiError) return { success: false, message: err.message };
    return { success: false, message: "Gagal membuka penguncian akun." };
  }
}

/** Mengeluarkan pelanggan dari semua perangkat. */
export async function revokeCustomerSessionsAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = (formData.get("id") as string) || "";
  const reason = (formData.get("reason") as string)?.trim() || "";

  if (!id) return { success: false, message: "Akun tidak dikenali." };

  try {
    const hasil = await apiRevokeCustomerSessions(id, reason);
    revalidatePath(`/customers/${id}`);
    return { success: true, message: hasil.message };
  } catch (err) {
    if (err instanceof ApiError) return { success: false, message: err.message };
    return { success: false, message: "Gagal mencabut sesi pelanggan." };
  }
}

/** Mengambil detail akun pelanggan beserta riwayat identitasnya. */
export async function getCustomerDetailAction(id: string) {
  if (!id) {
    return { success: false as const, message: "Akun tidak dikenali." };
  }
  try {
    const detail = await getCustomerDetail(id);
    return {
      success: true as const,
      user: detail.user,
      riwayat: detail.riwayatIdentitas ?? [],
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false as const, message: err.message };
    }
    return { success: false as const, message: "Gagal memuat riwayat identitas." };
  }
}

/** Mengaktifkan atau menonaktifkan akun pelanggan. */
export async function setCustomerActiveAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = (formData.get("id") as string) || "";
  const isActive = formData.get("isActive") === "true";
  const reason = (formData.get("reason") as string)?.trim() || undefined;

  if (!id) return { success: false, message: "Akun tidak dikenali." };

  try {
    const hasil = await apiSetCustomerActive(id, isActive, reason);
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: true, message: hasil.message };
  } catch (err) {
    if (err instanceof ApiError) return { success: false, message: err.message };
    return { success: false, message: "Gagal mengubah status aktif akun." };
  }
}

/** Menghapus akun pelanggan secara atomik beserta seluruh data terkaitnya. */
export async function deleteCustomerAccountAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = (formData.get("id") as string) || "";
  if (!id) return { success: false, message: "Akun tidak dikenali." };

  try {
    const hasil = await apiDeleteCustomerAccount(id);
    revalidatePath("/customers");
    revalidatePath("/identity-audit");
    revalidatePath("/bookings");
    revalidatePath("/fleet/catalog");
    revalidatePath("/fleet/calendar");
    revalidatePath("/fleet/drivers");
    revalidatePath("/customer-care");
    revalidatePath("/");
    const rincianArmada =
      hasil.releasedVehicles > 0 ? ` ${hasil.releasedVehicles} armada dikembalikan ke Tersedia.` : "";
    const rincianSupir =
      hasil.releasedDrivers > 0 ? ` ${hasil.releasedDrivers} supir kembali Siaga.` : "";
    return {
      success: true,
      message: `Akun ${hasil.fullName} dihapus atomik (${hasil.deletedBookings} pesanan, ${hasil.deletedTickets} tiket).${rincianArmada}${rincianSupir}`,
    };
  } catch (err) {
    if (err instanceof ApiError) return { success: false, message: err.message };
    return { success: false, message: "Gagal menghapus akun pelanggan." };
  }
}

/**
 * Menyimpan data rekening atau menutup baris pengembalian dana.
 *
 * Nominal dihitung ulang server setiap kali pembatalan terjadi; aksi ini hanya
 * menyimpan hasil transfer yang benar-benar dilakukan kantor, termasuk saat
 * admin memutuskan potongan berbeda dari aturan bawaan.
 */
export async function updateRefundAction(
  id: string,
  payload: {
    nominal?: number;
    namaBank?: string;
    nomorRekening?: string;
    namaPemilik?: string;
    buktiMediaId?: string;
    catatan?: string;
    status?: "MENUNGGU" | "DIPROSES" | "SELESAI";
    konfirmasiDana?: boolean;
  },
): Promise<ActionState> {
  if (!id) {
    return { success: false, message: "Baris pengembalian dana tidak valid." };
  }

  try {
    await apiUpdateRefund(id, payload);
    revalidatePath("/refunds");
    revalidatePath("/bookings");
    revalidatePath("/");
    return {
      success: true,
      message:
        payload.status === "SELESAI"
          ? "Pengembalian dana ditandai selesai."
          : "Data pengembalian dana tersimpan.",
    };
  } catch (err) {
    if (err instanceof ApiError) return { success: false, message: err.message };
    return { success: false, message: "Gagal menyimpan pengembalian dana." };
  }
}

/** Mengunggah foto bukti transfer pengembalian dana (opsional). */
export async function unggahBuktiRefundAction(
  formData: FormData,
): Promise<ActionState & { mediaId?: string; url?: string }> {
  const berkas = formData.get("berkas");
  if (!(berkas instanceof File) || berkas.size === 0) {
    return { success: false, message: "Pilih berkas gambar terlebih dahulu." };
  }

  try {
    const uploaded = await apiUnggahMedia(berkas, "PAYMENT_PROOF");
    if (!uploaded.id) {
      return { success: false, message: "Server tidak mengembalikan ID media." };
    }
    return {
      success: true,
      message: "Bukti transfer berhasil diunggah.",
      mediaId: uploaded.id,
      url: uploaded.url,
    };
  } catch (err) {
    if (err instanceof ApiError) return { success: false, message: err.message };
    return { success: false, message: "Gagal mengunggah bukti transfer." };
  }
}

