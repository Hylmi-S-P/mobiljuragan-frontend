"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-xl">
        <ErrorState
          heading="Terjadi kendala pada aplikasi"
          cause="Halaman tidak berhasil dimuat dengan semestinya."
          nextAction="Periksa koneksi lalu muat ulang halaman."
          guidance="Jika masalah berlanjut, hubungi admin sistem."
          onRetry={reset}
        />
        {error.digest ? (
          <p className="mt-3 text-meta text-ink-soft">Kode kejadian untuk laporan: {error.digest}</p>
        ) : null}
      </div>
    </main>
  );
}
