import type { Metadata } from "next";

import { DocumentTemplateUploader } from "@/components/documents/DocumentTemplateUploader";
import {
  getDaftarVersiTemplate,
  getTemplateAktif,
  type TemplateAktif,
  type VersiTemplate,
} from "@/lib/api";

export const metadata: Metadata = {
  title: "Template Dokumen | MobilJuragan",
  description:
    "Unggah dokumen resmi yang diunduh pelanggan, misalnya Form Kesanggupan untuk sewa lepas kunci.",
};

export const dynamic = "force-dynamic";

/**
 * Alamat dasar backend.
 *
 * Dihitung di server karena berbeda antara pengembangan (port 4000) dan
 * produksi (satu domain dengan awalan /api). Menuliskan jalur relatif di
 * komponen klien akan salah di salah satunya.
 */
function alamatApi(): string {
  return (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000/api/v1"
  ).replace(/\/$/, "");
}

/**
 * Halaman pengelolaan dokumen resmi.
 *
 * Admin mengunggah berkas PDF atau Word yang sudah jadi, dan pelanggan
 * mengunduh berkas itu apa adanya. Halaman ini tidak menyusun isi dokumen.
 */
export default async function DocumentsPage() {
  let aktif: TemplateAktif | null = null;
  let daftarVersi: VersiTemplate[] = [];
  let galat: string | null = null;

  try {
    [aktif, daftarVersi] = await Promise.all([getTemplateAktif(), getDaftarVersiTemplate()]);
  } catch (error) {
    galat = error instanceof Error ? error.message : "Gagal memuat dokumen.";
  }

  const tautanBerkasAktif = aktif
    ? `${alamatApi()}/admin/document-templates/${aktif.id}/berkas`
    : null;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-title font-semibold text-ink">Template Dokumen</h1>
        <p className="mt-1 text-meta text-ink-soft">
          Unggah dokumen resmi perusahaan di sini. Pelanggan akan mengunduh berkas ini apa
          adanya dari aplikasi, lalu mencetak dan menandatanganinya.
        </p>
      </header>

      {galat ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-body text-red-800">
          <p className="font-semibold">Dokumen belum bisa dimuat.</p>
          <p className="mt-1 text-meta">{galat}</p>
          <p className="mt-2 text-meta">
            Pastikan backend menyala dan migrasi terbaru sudah dijalankan.
          </p>
        </div>
      ) : (
        <DocumentTemplateUploader
          aktif={aktif}
          daftarVersi={daftarVersi}
          tautanBerkasAktif={tautanBerkasAktif}
        />
      )}
    </div>
  );
}