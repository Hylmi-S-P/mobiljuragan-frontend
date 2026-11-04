import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Meneruskan berkas template dokumen aktif ke peramban admin.
 *
 * Kenapa perlu Route Handler, bukan tautan biasa:
 *
 * Endpoint backend `/admin/document-templates/:id/berkas` dilindungi
 * `requireAuth`, yang hanya membaca header `Authorization: Bearer ...`. Token
 * admin disimpan di cookie `admin_token` yang `httpOnly`, jadi peramban tidak
 * bisa mengirimnya sebagai header. Akibatnya tautan `<a href>` atau `<iframe>`
 * ke alamat itu selalu ditolak 401, dan tombol pratinjau/unduh di halaman
 * Template Dokumen tidak pernah berfungsi.
 *
 * Route Handler ini berjalan di server Next.js, tempat cookie bisa dibaca.
 * Ia mengambil token dari cookie, memanggil backend dengan header yang benar,
 * lalu mengalirkan berkasnya kembali ke peramban.
 *
 * Ini juga sebabnya berkas TIDAK diarahkan langsung ke alamat backend: kalau
 * diarahkan, peramban tetap harus mengirim Bearer sendiri dan gagal lagi.
 */

const API_BASE_URL = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000/api/v1"
).replace(/\/$/, "");

export async function GET(
  _request: Request,
  konteks: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await konteks.params;

  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (!token) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sesi admin tidak ditemukan. Silakan masuk lagi." } },
      { status: 401 },
    );
  }

  /* Hanya izinkan id berbentuk uuid supaya :id tidak bisa dipakai menyusun
     alamat lain di backend. */
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.json(
      { error: { code: "INVALID_ID", message: "Penanda dokumen tidak valid." } },
      { status: 400 },
    );
  }

  let balasan: Response;
  try {
    balasan = await fetch(`${API_BASE_URL}/admin/document-templates/${id}/berkas`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "BACKEND_UNREACHABLE",
          message: "Backend tidak dapat dihubungi untuk mengambil berkas dokumen.",
        },
      },
      { status: 502 },
    );
  }

  if (!balasan.ok || !balasan.body) {
    /* Pesan dari backend diteruskan apa adanya supaya penyebabnya jelas —
       misalnya sesi kedaluwarsa atau berkasnya memang tidak ada. */
    const teks = await balasan.text().catch(() => "");
    return new NextResponse(teks || "Gagal mengambil berkas dokumen.", {
      status: balasan.status || 502,
      headers: { "Content-Type": balasan.headers.get("content-type") ?? "application/json" },
    });
  }

  const namaBerkas = ambilNamaBerkas(balasan.headers.get("content-disposition"), id);

  return new NextResponse(balasan.body, {
    status: 200,
    headers: {
      "Content-Type": balasan.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${namaBerkas}"`,
      /* Berkas legal perusahaan bisa berubah tanpa pemberitahuan, jadi jangan
         disimpan peramban lebih lama dari sesi ini. */
      "Cache-Control": "private, no-store",
    },
  });
}

/** Mengambil nama berkas dari header backend, atau memakai cadangan yang aman. */
function ambilNamaBerkas(disposition: string | null, id: string): string {
  if (disposition) {
    const cocok = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
    if (cocok?.[1]) {
      /* Nama berkas berasal dari unggahan admin, jadi kutip dan garis miring
         dibuang supaya tidak bisa menyusun header lain. */
      return cocok[1].replace(/["\\\r\n]/g, "").trim() || `dokumen-${id}.pdf`;
    }
  }
  return `dokumen-${id}.pdf`;
}
