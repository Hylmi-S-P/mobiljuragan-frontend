import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/api";

const API_BASE_URL = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000/api/v1"
).replace(/\/$/, "");

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Sesi admin tidak ditemukan." },
      { status: 401 },
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
      { success: false, message: "Berkas gambar tidak boleh kosong." },
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
    upstream = await fetch(`${API_BASE_URL}/media`, {
      method: "POST",
      headers,
      body: request.body,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(60_000)]),
      duplex: "half",
    } as RequestInit & { duplex: "half" });
  } catch {
    return NextResponse.json(
      { success: false, message: "Gagal menghubungi server untuk mengunggah bukti transfer." },
      { status: 502 },
    );
  }

  const json = (await upstream.json().catch(() => null)) as {
    data?: { id?: string; url?: string };
    error?: { message?: string };
  } | null;

  if (!upstream.ok) {
    return NextResponse.json(
      {
        success: false,
        message: json?.error?.message || "Gagal mengunggah bukti transfer.",
      },
      { status: upstream.status },
    );
  }

  const mediaId = String(json?.data?.id ?? "");
  if (!mediaId) {
    return NextResponse.json(
      { success: false, message: "Server tidak mengembalikan ID media." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Bukti transfer berhasil diunggah.",
    mediaId,
    url: String(json?.data?.url ?? ""),
  });
}
