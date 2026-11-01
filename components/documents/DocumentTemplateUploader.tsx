"use client";

import { useRef, useState, useTransition } from "react";

import { aktifkanVersiTemplateAction, unggahTemplateDokumenAction } from "@/app/actions";
import type { TemplateAktif, VersiTemplate } from "@/lib/api";

type Props = {
  aktif: TemplateAktif | null;
  daftarVersi: VersiTemplate[];
  /**
   * Alamat berkas aktif, dihitung di server. Alamat backend berbeda antara
   * pengembangan dan produksi, jadi tidak boleh ditulis relatif di sini.
   */
  tautanBerkasAktif: string | null;
};

/** Mengubah jumlah byte menjadi teks yang enak dibaca. */
function ukuran(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Ikon singkat berdasarkan jenis berkas, supaya admin tahu apa yang aktif. */
function labelJenis(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime.includes("wordprocessingml")) return "DOCX";
  if (mime === "application/msword") return "DOC";
  return "DOKUMEN";
}

/**
 * Pengelola dokumen resmi yang diunduh pelanggan.
 *
 * Alurnya sengaja dibuat sesederhana pekerjaan sebenarnya: admin menyiapkan
 * dokumen di Word atau PDF seperti biasa, lalu mengunggah berkas itu. Aplikasi
 * tidak menyusun ulang isinya, jadi yang dicetak pelanggan persis berkas yang
 * dibuat admin.
 *
 * Setiap unggahan menjadi versi baru dan langsung dipakai. Versi lama tetap
 * tersimpan supaya dokumen yang sudah ditandatangani bisa ditelusuri.
 */
export function DocumentTemplateUploader({ aktif, daftarVersi, tautanBerkasAktif }: Props) {
  const [berkas, setBerkas] = useState<File | null>(null);
  const [catatan, setCatatan] = useState("");
  const [pesan, setPesan] = useState<{ jenis: "sukses" | "galat"; teks: string } | null>(null);
  const [sedangUnggah, mulaiUnggah] = useTransition();
  const [sedangAktifkan, mulaiAktifkan] = useTransition();
  const inputBerkas = useRef<HTMLInputElement>(null);

  function kirim() {
    if (!berkas) {
      setPesan({ jenis: "galat", teks: "Pilih berkas dokumen terlebih dahulu." });
      return;
    }

    const formData = new FormData();
    formData.append("berkas", berkas);
    formData.append("catatan", catatan);

    mulaiUnggah(async () => {
      const hasil = await unggahTemplateDokumenAction(formData);

      if (hasil.success) {
        setPesan({ jenis: "sukses", teks: hasil.message ?? "Dokumen tersimpan." });
        setBerkas(null);
        setCatatan("");
        if (inputBerkas.current) inputBerkas.current.value = "";
      } else {
        setPesan({ jenis: "galat", teks: hasil.message ?? "Gagal mengunggah dokumen." });
      }
    });
  }

  function aktifkan(id: string) {
    mulaiAktifkan(async () => {
      const hasil = await aktifkanVersiTemplateAction(id);
      setPesan({
        jenis: hasil.success ? "sukses" : "galat",
        teks: hasil.message ?? (hasil.success ? "Diaktifkan." : "Gagal."),
      });
    });
  }

  const masukanGaya =
    "w-full rounded-md border border-rule bg-surface px-3 py-2 text-body text-ink outline-none focus:border-teal focus:ring-1 focus:ring-teal";

  return (
    <div className="flex flex-col gap-6">
      {pesan ? (
        <div
          role="status"
          className={`rounded-md border px-4 py-3 text-meta ${
            pesan.jenis === "sukses"
              ? "border-teal/40 bg-teal/10 text-ink"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {pesan.teks}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* -------------------------------------------------- DOKUMEN AKTIF */}
          <section className="rounded-lg border border-rule bg-surface p-4">
            <h2 className="text-subtitle font-semibold text-ink">Dokumen yang Sedang Dipakai</h2>
            <p className="mt-1 text-micro text-ink-soft">
              Berkas inilah yang diunduh pelanggan dari aplikasi.
            </p>

            {aktif ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-canvas px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-meta font-semibold text-ink">
                    {aktif.berkasNama}
                  </p>
                  <p className="mt-0.5 text-micro text-ink-soft">
                    {labelJenis(aktif.berkasMime)} · {ukuran(aktif.berkasByte)} · versi{" "}
                    {aktif.versi}
                    {aktif.dibuatOleh ? ` · diunggah ${aktif.dibuatOleh}` : ""}
                  </p>
                </div>

                <a
                  href={tautanBerkasAktif ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-md border border-rule px-3 py-1.5 text-meta font-medium text-ink hover:border-ink"
                >
                  Buka berkas
                </a>
              </div>
            ) : (
              <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-meta text-amber-900">
                Belum ada dokumen. Pelanggan belum bisa mengunduh formulir sampai admin
                mengunggah satu berkas.
              </p>
            )}
          </section>

          {/* -------------------------------------------------- UNGGAH */}
          <section className="rounded-lg border border-rule bg-surface p-4">
            <h2 className="text-subtitle font-semibold text-ink">Unggah Dokumen Baru</h2>
            <p className="mt-1 text-micro text-ink-soft">
              Siapkan dokumen di Word atau PDF seperti biasa, lalu unggah berkasnya di sini.
              Setelah tersimpan, pelanggan langsung menerima versi baru ini.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-meta font-medium text-ink">Berkas dokumen</span>
                <input
                  ref={inputBerkas}
                  type="file"
                  accept=".pdf,.docx,.doc,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
                  className="block w-full cursor-pointer rounded-md border border-rule bg-surface px-3 py-2 text-meta text-ink file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-meta file:font-medium file:text-white"
                />
                <span className="text-micro text-ink-soft">
                  PDF, DOCX, atau DOC. Maksimal 15 MB.
                </span>
              </label>

              {berkas ? (
                <p className="rounded-md border border-rule bg-canvas px-3 py-2 text-micro text-ink-soft">
                  Dipilih: <strong className="text-ink">{berkas.name}</strong> ·{" "}
                  {ukuran(berkas.size)}
                </p>
              ) : null}

              <label className="flex flex-col gap-1">
                <span className="text-meta font-medium text-ink">Catatan perubahan</span>
                <input
                  className={masukanGaya}
                  placeholder="Contoh: menambah klausul denda keterlambatan"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                />
                <span className="text-micro text-ink-soft">
                  Opsional. Membantu menelusuri kenapa dokumen diganti.
                </span>
              </label>

              <div>
                <button
                  type="button"
                  onClick={kirim}
                  disabled={sedangUnggah || !berkas}
                  className="rounded-md bg-ink px-4 py-2 text-meta font-semibold text-white hover:bg-ink/90 disabled:opacity-60"
                >
                  {sedangUnggah ? "Mengunggah…" : "Unggah dan pakai dokumen ini"}
                </button>
              </div>
            </div>
          </section>

          {/* -------------------------------------------------- ALUR */}
          <section className="rounded-lg border border-rule bg-surface p-4">
            <h2 className="text-subtitle font-semibold text-ink">Alur di Sisi Pelanggan</h2>
            <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-4 text-meta text-ink-soft">
              <li>Pelanggan memilih sewa lepas kunci di aplikasi.</li>
              <li>Pelanggan menekan tombol unduh, lalu menerima berkas ini apa adanya.</li>
              <li>Berkas dicetak, diisi, dan ditandatangani di atas kertas.</li>
              <li>Pelanggan memfoto berkas yang sudah ditandatangani, lalu mengunggah fotonya.</li>
            </ol>
          </section>
        </div>

        {/* -------------------------------------------------- RIWAYAT */}
        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-rule bg-surface p-4">
            <h2 className="text-subtitle font-semibold text-ink">Riwayat Versi</h2>
            <p className="mt-1 text-micro text-ink-soft">
              Versi aktif sekarang: <strong>{aktif ? `v${aktif.versi}` : "belum ada"}</strong>
            </p>

            <ul className="mt-3 flex flex-col gap-2">
              {daftarVersi.map((versi) => (
                <li
                  key={versi.id}
                  className={`rounded-md border px-3 py-2 ${
                    versi.isActive ? "border-teal bg-teal/5" : "border-rule"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-meta font-semibold text-ink">v{versi.versi}</span>
                    {versi.isActive ? (
                      <span className="shrink-0 rounded-full bg-teal px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                        Aktif
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => aktifkan(versi.id)}
                        disabled={sedangAktifkan}
                        className="shrink-0 text-[11px] font-medium text-teal underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        Pakai versi ini
                      </button>
                    )}
                  </div>

                  <p className="mt-1 break-words text-[11px] leading-snug text-ink">
                    {versi.berkasNama}
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink-soft">
                    {labelJenis(versi.berkasMime)} · {ukuran(versi.berkasByte)}
                  </p>

                  {versi.catatan ? (
                    <p className="mt-1 text-[11px] leading-snug text-ink-soft">{versi.catatan}</p>
                  ) : null}

                  <p className="mt-1 text-[10px] text-ink-soft">
                    {new Date(versi.createdAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {versi.dibuatOleh ? ` · ${versi.dibuatOleh}` : ""}
                  </p>
                </li>
              ))}
            </ul>

            {daftarVersi.length === 0 ? (
              <p className="mt-3 text-micro text-ink-soft">Belum ada versi tersimpan.</p>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
