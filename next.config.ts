import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  /* Skrip uji di .verify membuka dashboard lewat http://127.0.0.1:3000, sedangkan
     server dev dijalankan sebagai localhost. Next.js memblokir permintaan asal lain
     ke aset dev, termasuk bundel HMR, sehingga React tidak pernah ter-hidrasi dan
     semua tombol mati saat diuji. Daftar ini hanya berlaku di mode dev. */
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
