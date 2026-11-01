import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/api";

/*
 * Berkas KTP/SIM tidak boleh dapat diakses tanpa sesi, jadi Express meminta
 * header Authorization. Tag <img> di browser tidak bisa mengirim header itu,
 * sehingga permintaan diteruskan lewat rute ini: token diambil dari cookie
 * server, bukan dari klien.
 */
const API_BASE_URL =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const token = await getSessionToken();
  if (!token) {
    return new NextResponse("Sesi admin tidak ditemukan.", { status: 401 });
  }

  const { path } = await params;
  const key = (path ?? []).map((segment) => encodeURIComponent(segment)).join("/");
  if (!key || key.includes("..")) {
    return new NextResponse("Nama berkas tidak valid.", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/documents/file/${key}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return new NextResponse("Gagal menghubungi server dokumen.", { status: 502 });
  }

  if (!upstream.ok) {
    // Status asli diteruskan apa adanya (403 kepemilikan, 404 berkas hilang)
    // supaya kartu dokumen bisa membedakan "bukan milik pesanan" dan "hilang".
    return new NextResponse(null, { status: upstream.status });
  }

  return new NextResponse(await upstream.arrayBuffer(), {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    },
  });
}
