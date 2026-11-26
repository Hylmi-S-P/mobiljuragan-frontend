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
  request: Request,
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
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]),
    });
  } catch {
    return new NextResponse("Gagal menghubungi server dokumen.", { status: 502 });
  }

  if (!upstream.ok) {
    // Status asli diteruskan apa adanya (403 kepemilikan, 404 berkas hilang)
    // supaya kartu dokumen bisa membedakan "bukan milik pesanan" dan "hilang".
    return new NextResponse(null, { status: upstream.status });
  }

  const contentLength = upstream.headers.get("content-length");

  /*
   * Badan respons diteruskan sebagai aliran, bukan `arrayBuffer()`. Berkas
   * dokumen bisa beberapa megabita, dan menyalinnya utuh ke memori per
   * permintaan hanya membuang RAM tanpa manfaat.
   *
   * `no-store` dipakai karena KTP/SIM adalah berkas pribadi: di komputer kantor
   * yang dipakai bergantian, cache peramban membuat berkas bisa dibuka orang
   * berikutnya tanpa melewati pemeriksaan sesi.
   */
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      ...(contentLength ? { "Content-Length": contentLength } : {}),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
