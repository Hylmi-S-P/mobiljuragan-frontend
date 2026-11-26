import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/api";

const API_BASE_URL = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000/api/v1"
).replace(/\/$/, "");

export async function POST(
  request: Request,
  konteks: { params: Promise<{ id: string }> },
) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Sesi admin tidak ditemukan." },
      { status: 401 },
    );
  }

  const { id } = await konteks.params;
  if (!id || id.includes("/") || id.includes("..")) {
    return NextResponse.json(
      { success: false, message: "Identitas armada tidak valid." },
      { status: 400 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return NextResponse.json(
      { success: false, message: "Format unggahan harus multipart/form-data." },
      { status: 400 },
    );
  }

  if (!request.body) {
    return NextResponse.json(
      { success: false, message: "Berkas foto tidak boleh kosong." },
      { status: 400 },
    );
  }

  const contentLength = request.headers.get("content-length");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": contentType,
    ...(contentLength ? { "Content-Length": contentLength } : {}),
  };

  let upstream: Response;
  try {
    upstream = await fetch(
      `${API_BASE_URL}/admin/vehicles/${encodeURIComponent(id)}/photo`,
      {
        method: "POST",
        headers,
        body: request.body,
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(60_000)]),
        duplex: "half",
      } as RequestInit & { duplex: "half" },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Gagal menghubungi server untuk mengunggah foto armada." },
      { status: 502 },
    );
  }

  const json = (await upstream.json().catch(() => null)) as {
    data?: { media?: { url?: string } };
    error?: { message?: string };
  } | null;

  if (!upstream.ok) {
    return NextResponse.json(
      {
        success: false,
        message: json?.error?.message || "Gagal mengunggah foto armada.",
      },
      { status: upstream.status },
    );
  }

  revalidatePath("/fleet/catalog");
  revalidatePath("/fleet/calendar");
  return NextResponse.json({
    success: true,
    message: "Foto armada tersimpan.",
    imageUrl: json?.data?.media?.url ?? "",
  });
}
