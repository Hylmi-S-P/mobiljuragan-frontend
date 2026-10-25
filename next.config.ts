import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,

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
};

export default nextConfig;