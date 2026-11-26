import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  ...(process.env.NEXT_OUTPUT_STANDALONE === "true" ? { output: "standalone" as const } : {}),

  /* Daftar asal yang boleh memakai aset dev, termasuk bundel HMR.
   *
   * Sebelumnya hanya berisi "127.0.0.1". Server dev terbuka di localhost dan di
   * IP jaringan (Tailscale 100.90.184.52, LAN 192.168.1.3). Kalau dashboard
   * dibuka lewat IP, Next.js menolak handshake HMR dengan
   * ERR_INVALID_HTTP_RESPONSE. Klien dev lalu menyambung ulang tanpa henti, dan
   * di layar tampak sebagai halaman yang berkedip serta memuat ulang sendiri.
   *
   * Gejala itu sudah diukur: lewat localhost HMR tersambung sekali tanpa galat,
   * lewat IP terjadi delapan percobaan dan delapan galat dalam dua puluh detik.
   *
   * Daftar ini hanya berlaku di mode dev. Build produksi tidak memakainya. */
  allowedDevOrigins: ["127.0.0.1", "localhost", "100.90.184.52", "192.168.1.3"],

  /* Unggahan berkas besar (template dokumen 15 MB, foto armada 5 MB, bukti
   * transfer) sekarang dialirkan langsung lewat Route Handler `/api/uploads/*`
   * yang dilewati oleh `proxy.ts`. Server Action dan `proxy.ts` hanya perlu
   * menyangga payload form biasa agar penggunaan RAM container `512m` tetap aman. */
  experimental: {
    optimizePackageImports: ["recharts", "@tanstack/react-query"],
    serverActions: {
      bodySizeLimit: "2mb",
    },
    proxyClientMaxBodySize: "4mb",
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
