/**
 * Mengubah tautan media dari backend menjadi alamat yang bisa dibuka peramban.
 *
 * Backend menyimpan tautan media sebagai jalur relatif, misalnya
 * `/api/v1/media/<id>?exp=...&sig=...`. Jalur itu benar kalau dashboard dan API
 * berada di satu domain, seperti di produksi lewat tunnel Cloudflare.
 *
 * Di luar susunan itu — misalnya saat pengembangan, ketika dashboard ada di
 * port 3000 dan API di port 4000 — jalur relatif akan dicari di server Next.js
 * dan hasilnya 404. Foto armada lalu tampil sebagai gambar rusak, padahal
 * berkasnya ada.
 *
 * Fungsi ini menyisipkan alamat asal API kalau tautannya relatif. Tautan yang
 * sudah absolut, data URL, atau blob URL dibiarkan apa adanya.
 */
export function tautanMedia(url: string | null | undefined): string | null {
  if (!url) return null;

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  /*
   * NEXT_PUBLIC_API_URL berakhiran `/api/v1`. Yang dibutuhkan di sini hanya
   * asal dan portnya, jadi akhiran itu dibuang lebih dulu.
   */
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
  const asal = apiUrl.replace(/\/api\/v1\/?$/, "");

  return `${asal}${url.startsWith("/") ? url : `/${url}`}`;
}
