import { NextResponse, type NextRequest } from "next/server";

/*
 * Gerbang sesi memverifikasi `admin_token` ke Express pada setiap rute privat.
 * Token palsu atau kedaluwarsa dibersihkan lalu diarahkan ke halaman masuk.
 */
const API_BASE_URL =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

/** Halaman yang boleh dibuka tanpa sesi. */
const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("admin_token")?.value;

  if (!token) {
    return redirectToLogin(request);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/admin/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return redirectToLogin(request);
    }
  } catch {
    // Biarkan layout berjalan agar error boundary halaman bisa menjelaskan gangguan jaringan.
    return NextResponse.next();
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const response = NextResponse.redirect(url);
  // Bersihkan cookie sesi yang sudah tidak valid supaya tidak ikut terkirim lagi.
  response.cookies.delete("admin_token");
  response.cookies.delete("client_token");
  return response;
}

export const config = {
  /*
   * Lindungi semua halaman kecuali aset statis, berkas Next internal, favicon,
   * dan route handler `/api/*`. Route handler memeriksa sesi sendiri: gerbang di
   * sini akan memanggil `/admin/auth/me` untuk setiap gambar dokumen, sehingga
   * pratinjau KTP/SIM lambat sekaligus gagal saat jaringan goyah.
   */
  matcher: [
    "/((?!_next/static|_next/image|api/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
