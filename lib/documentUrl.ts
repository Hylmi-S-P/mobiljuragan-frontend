/**
 * Mengubah URL berkas dokumen dari API menjadi URL yang bisa dipakai browser.
 *
 * Express menyimpan path relatif (`/api/v1/documents/file/<booking>/<berkas>`)
 * dan mewajibkan header Authorization. Tag `<img>` tidak bisa mengirim header,
 * jadi path diarahkan ke route handler `/api/documents/file/...` yang menyisipkan
 * token dari cookie sesi admin.
 */
const API_FILE_MARKER = "/api/v1/documents/file/";
const LOCAL_FILE_PREFIX = "/api/documents/file/";

export function resolveDocumentUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // Base64 lama (data URI) dan berkas di host lain dibiarkan apa adanya.
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  const markerIndex = url.indexOf(API_FILE_MARKER);
  if (markerIndex >= 0) {
    return `${LOCAL_FILE_PREFIX}${url.slice(markerIndex + API_FILE_MARKER.length)}`;
  }

  return url.startsWith("/") ? url : `/${url}`;
}

/** Dokumen bertipe PDF tidak bisa dirender `<img>`. */
export function isPdfUrl(url: string): boolean {
  return /\.pdf(?:$|\?)/i.test(url);
}
