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

  /* Batas ukuran badan permintaan untuk Server Action.
   *
   * Bawaannya 1 MB. Batas itu berlaku untuk SEMUA Server Action, termasuk yang
   * membawa berkas lewat FormData. Selama ini dashboard hanya memberi tahu
   * pengguna batas 5 MB (foto armada dan foto SIM) dan 15 MB (dokumen template),
   * sedangkan server menolak apa pun di atas 1 MB dengan pesan
   * "Body exceeded 1 MB limit". Artinya berkas yang ukurannya wajar selalu gagal
   * sebelum sempat diproses.
   *
   * Nilainya disamakan dengan batas backend ditambah ruang untuk pembungkus
   * multipart dan kolom teks lain di form yang sama:
   * - gambar: BATAS_UKURAN_BERKAS 8 MB (backend/src/lib/imagePipeline.ts)
   * - dokumen: BATAS_UKURAN_DOKUMEN 15 MB (backend/src/lib/documentTemplateBerkas.ts)
   *
   * 20 MB memberi ruang untuk dokumen terbesar tanpa membuka pintu untuk
   * unggahan liar. Backend tetap menegakkan batasnya sendiri, jadi angka ini
   * adalah gerbang pertama, bukan satu-satunya. */
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },

    /* Batas badan permintaan saat `proxy.ts` aktif.
     *
     * Selama proyek ini memakai proxy (gerbang sesi di `proxy.ts`), Next.js
     * menyalin badan permintaan ke memori agar bisa dibaca lebih dari sekali.
     * Bawaannya 10 MB, dan yang penting: kalau batas itu terlampaui, Next
     * TIDAK mengembalikan galat — ia hanya memotong badan permintaan di 10 MB
     * dan menulis peringatan di log. Akibatnya unggahan besar bisa sampai ke
     * Server Action dalam keadaan terpotong, lalu gagal dengan pesan yang
     * menyesatkan tentang isi berkas, bukan tentang ukurannya.
     *
     * Nilainya dibuat lebih besar dari `bodySizeLimit` di atas supaya proxy
     * tidak pernah menjadi pembatas yang lebih ketat daripada Server Action
     * yang dilindunginya. */
    proxyClientMaxBodySize: "22mb",
  },
};

export default nextConfig;