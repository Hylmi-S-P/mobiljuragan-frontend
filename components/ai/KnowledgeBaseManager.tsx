"use client";

import { useState, useTransition } from "react";
import {
  createKnowledgeDocumentAction,
  updateKnowledgeDocumentAction,
  deleteKnowledgeDocumentAction,
  parseKnowledgeFileAction,
  getKnowledgeCategoriesAction,
  createKnowledgeCategoryAction,
  updateKnowledgeCategoryAction,
  deleteKnowledgeCategoryAction,
} from "@/app/actions";
import { AutoGrowTextarea } from "@/components/ui/AutoGrowTextarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { IconPlus, IconPencil, IconTrash } from "@/components/ui/icons";
import type { KnowledgeDocument } from "@/lib/operations";

export type KnowledgeCategory = {
  id: string;
  slug: string;
  label: string;
  orderIndex: number;
  jumlahDokumen?: number;
};

type Props = {
  initialDocuments: KnowledgeDocument[];
  /* Kategori datang dari server, bukan dipatri di berkas ini. Sebelumnya daftar
     pilihan hanya bisa diubah dengan mengubah kode, sehingga admin tidak punya
     cara menambah kategori sendiri. */
  initialCategories?: KnowledgeCategory[];
};

/* Warna hanya untuk membedakan kategori di layar. Ditentukan dari urutan, supaya
   kategori baru otomatis mendapat warna tanpa perlu didaftarkan. */
const TONE_KATEGORI = [
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-violet-50 text-violet-700 border-violet-200",
  "bg-canvas text-ink-soft border-rule",
];

function toneKategori(index: number): string {
  return TONE_KATEGORI[index % TONE_KATEGORI.length];
}

export function KnowledgeBaseManager({ initialDocuments, initialCategories = [] }: Props) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(initialDocuments);
  const [categories, setCategories] = useState<KnowledgeCategory[]>(initialCategories);
  const [isPending, startTransition] = useTransition();

  /* Pengelola kategori, dibuka dari tombol di bawah pilihan kategori. */
  const [kategoriTerbuka, setKategoriTerbuka] = useState(false);
  const [kategoriBaru, setKategoriBaru] = useState("");
  const [kategoriSibuk, setKategoriSibuk] = useState(false);
  const [kategoriError, setKategoriError] = useState<string | null>(null);

  // State Modal Tambah / Edit
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingDoc, setEditingDoc] = useState<KnowledgeDocument | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("SOP");
  const [formContent, setFormContent] = useState("");
  const [formActive, setFormActive] = useState(true);

  // Modal Delete
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // File Upload & Text Extraction
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [uploadSuccessNote, setUploadSuccessNote] = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const openCreateModal = () => {
    setEditingDoc(null);
    setFormTitle("");
    setFormCategory("SOP");
    setFormContent("");
    setFormActive(true);
    setIsExtracting(false);
    setExtractError(null);
    setUploadSuccessNote(null);
    setModalMode("create");
    setMessage(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (ext !== ".md" && ext !== ".txt") {
      setExtractError("Hanya berkas berformat .md dan .txt yang diperbolehkan.");
      return;
    }

    setIsExtracting(true);
    setExtractError(null);
    setUploadSuccessNote(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await parseKnowledgeFileAction(file.name, base64);
        if (res.success && res.data) {
          setFormTitle(res.data.title);
          setFormContent(res.data.content);
          setUploadSuccessNote(`Teks dari berkas "${file.name}" berhasil diekstrak (${res.data.lineCount} baris).`);
        } else {
          setExtractError(res.message || "Gagal mengekstrak isi berkas.");
        }
        setIsExtracting(false);
      };
      reader.onerror = () => {
        setExtractError("Gagal membaca file di browser.");
        setIsExtracting(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setExtractError("Terjadi kesalahan saat memproses berkas.");
      setIsExtracting(false);
    }
  };

  const openEditModal = (doc: KnowledgeDocument) => {
    setEditingDoc(doc);
    setFormTitle(doc.title);
    setFormCategory(doc.category);
    setFormContent(doc.content);
    setFormActive(doc.isActive);
    setModalMode("edit");
    setMessage(null);
  };

  const handleToggleStatus = (doc: KnowledgeDocument) => {
    startTransition(async () => {
      const nextActive = !doc.isActive;
      const res = await updateKnowledgeDocumentAction(doc.id, { isActive: nextActive });
      if (res.success) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, isActive: nextActive } : d)),
        );
      }
    });
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    startTransition(async () => {
      if (modalMode === "create") {
        const formData = new FormData();
        formData.append("title", formTitle);
        formData.append("category", formCategory);
        formData.append("content", formContent);
        if (!formActive) formData.append("isActive", "off");

        const res = await createKnowledgeDocumentAction(null, formData);
        if (res.success) {
          setMessage({ type: "success", text: "Dokumen pengetahuan berhasil ditambahkan." });
          setModalMode(null);
          // Tambahkan optimis
          setDocuments((prev) => [
            {
              id: "temp-" + Date.now(),
              title: formTitle,
              category: formCategory,
              content: formContent,
              isActive: formActive,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            ...prev,
          ]);
        } else {
          setMessage({ type: "error", text: res.message || "Gagal menyimpan dokumen." });
        }
      } else if (modalMode === "edit" && editingDoc) {
        const res = await updateKnowledgeDocumentAction(editingDoc.id, {
          title: formTitle,
          category: formCategory,
          content: formContent,
          isActive: formActive,
        });
        if (res.success) {
          setMessage({ type: "success", text: "Dokumen pengetahuan berhasil diperbarui." });
          setModalMode(null);
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === editingDoc.id
                ? {
                    ...d,
                    title: formTitle,
                    category: formCategory,
                    content: formContent,
                    isActive: formActive,
                  }
                : d,
            ),
          );
        } else {
          setMessage({ type: "error", text: res.message || "Gagal memperbarui dokumen." });
        }
      }
    });
  };

  const handleDelete = () => {
    if (!deletingDocId) return;
    startTransition(async () => {
      const res = await deleteKnowledgeDocumentAction(deletingDocId);
      if (res.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== deletingDocId));
        setDeletingDocId(null);
        setMessage({ type: "success", text: "Dokumen pengetahuan berhasil dihapus." });
      } else {
        setMessage({ type: "error", text: res.message || "Gagal menghapus dokumen." });
      }
    });
  };

  const activeCount = documents.filter((d) => d.isActive).length;

  /* ---- Pengelola kategori ---- */

  const muatKategori = async () => {
    /* Daftar diambil ulang setelah perubahan supaya nomor urut dan jumlah
       dokumen ikut segar, bukan hanya label yang baru. */
    try {
      const segar = await getKnowledgeCategoriesAction();
      if (segar.success && segar.data) setCategories(segar.data);
    } catch {
      /* Diamkan: kegagalan muat ulang tidak boleh menghapus daftar yang ada. */
    }
  };

  const tambahKategori = async () => {
    if (!kategoriBaru.trim()) return;
    setKategoriSibuk(true);
    setKategoriError(null);
    const res = await createKnowledgeCategoryAction(kategoriBaru.trim());
    if (res.success) {
      setKategoriBaru("");
      await muatKategori();
    } else {
      setKategoriError(res.message ?? "Gagal menambah kategori.");
    }
    setKategoriSibuk(false);
  };

  const hapusKategori = async (kategori: KnowledgeCategory) => {
    setKategoriSibuk(true);
    setKategoriError(null);
    const res = await deleteKnowledgeCategoryAction(kategori.id);
    if (res.success) {
      await muatKategori();
    } else {
      /* Pesan dari server menyebut jumlah dokumen yang masih memakai, jadi
         admin tahu apa yang harus dibereskan lebih dulu. */
      setKategoriError(res.message ?? "Gagal menghapus kategori.");
    }
    setKategoriSibuk(false);
  };

  const geserKategori = async (kategori: KnowledgeCategory, arah: -1 | 1) => {
    const urut = [...categories].sort((a, b) => a.orderIndex - b.orderIndex);
    const posisi = urut.findIndex((c) => c.id === kategori.id);
    const target = posisi + arah;
    if (target < 0 || target >= urut.length) return;

    /* Tukar nilai orderIndex dengan tetangganya. Kalau hanya satu baris diubah,
       dua kategori bisa mendapat angka yang sama dan urutannya jadi tidak pasti. */
    setKategoriSibuk(true);
    await updateKnowledgeCategoryAction(kategori.id, { orderIndex: urut[target].orderIndex });
    await updateKnowledgeCategoryAction(urut[target].id, { orderIndex: kategori.orderIndex });
    await muatKategori();
    setKategoriSibuk(false);
  };

  return (
    <div className="rounded-card border border-rule bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-rule pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-badge bg-emerald-50 px-2 py-0.5 text-micro font-semibold text-emerald-700 border border-emerald-200">
            {activeCount} Dokumen Aktif
          </span>
          <p className="text-meta text-ink-soft">
            SOP, regulasi lepas kunci, rute Merauke, dan kontak darurat yang diinjeksikan ke AI.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-button bg-navy px-3.5 py-2 text-meta font-semibold text-white shadow-sm transition-colors hover:bg-navy-hover"
        >
          <IconPlus className="h-4 w-4" />
          <span>Tambah Dokumen</span>
        </button>
      </div>

      {message ? (
        <div
          className={`mt-4 rounded-md p-3 text-meta ${
            message.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="mt-4">
        {documents.length === 0 ? (
          <div className="rounded-md border border-dashed border-rule py-10 text-center">
            <p className="text-body font-medium text-ink">Belum ada dokumen basis pengetahuan.</p>
            <p className="mt-1 text-meta text-ink-soft">
              Klik &quot;Tambah Dokumen&quot; untuk memasukkan SOP atau panduan rental baru.
            </p>
          </div>
        ) : (
          <Table caption="Daftar dokumen pengetahuan RAG MobilJuragan">
            <TableHead>
              <TableRow>
                <TableHeaderCell className="w-[280px]">Judul Dokumen</TableHeaderCell>
                <TableHeaderCell className="w-[160px]">Kategori</TableHeaderCell>
                <TableHeaderCell className="w-[320px]">Ringkasan Konten</TableHeaderCell>
                <TableHeaderCell className="w-[120px] text-center">Status RAG</TableHeaderCell>
                <TableHeaderCell className="w-[140px] text-right">Aksi</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc) => {
                const indeksKategori = categories.findIndex((c) => c.slug === doc.category);
            const cat = {
              label:
                indeksKategori >= 0
                  ? categories[indeksKategori].label
                  : doc.category || "Tanpa kategori",
              tone: toneKategori(indeksKategori >= 0 ? indeksKategori : categories.length),
            };
                /* ---- Pengelola kategori ---- */
  return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <span className="block text-body font-semibold text-ink">{doc.title}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block rounded-badge px-2.5 py-0.5 text-micro font-semibold border ${cat.tone}`}
                      >
                        {cat.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="line-clamp-2 text-meta text-ink-soft whitespace-pre-line font-mono text-xs">
                        {doc.content}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(doc)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-micro font-medium transition-colors ${
                          doc.isActive
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-canvas text-ink-soft hover:bg-canvas-subtle"
                        }`}
                        title="Klik untuk menyalakan/mematikan dokumen dari prompt AI"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${doc.isActive ? "bg-emerald-500" : "bg-neutral-300"}`}
                        />
                        <span>{doc.isActive ? "Aktif" : "Nonaktif"}</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(doc)}
                          className="rounded p-1.5 text-ink-soft hover:bg-canvas hover:text-ink"
                          title="Edit Dokumen"
                        >
                          <IconPencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingDocId(doc.id)}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                          title="Hapus Dokumen"
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal Tambah / Edit Dokumen */}
      {modalMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-card border border-rule bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-bold text-ink">
              {modalMode === "create" ? "Tambah Dokumen Pengetahuan" : "Edit Dokumen Pengetahuan"}
            </h3>
            <p className="mt-1 text-meta text-ink-soft">
              Konten dokumen ini akan dirujuk oleh asisten AI saat melayani pertanyaan seputar rental mobil.
            </p>

            <form onSubmit={handleSaveDocument} className="mt-5 flex flex-col gap-4">
              {modalMode === "create" ? (
                <div className="rounded-lg border border-dashed border-rule bg-canvas/40 p-4 text-center">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <span className="text-meta font-semibold text-ink">
                      Unggah Berkas SOP / Regulasi (.md, .txt)
                    </span>
                    <p className="max-w-md text-micro text-ink-soft">
                      Ekstraksi teks instan dari berkas Markdown atau TXT. Judul dan konten akan terisi otomatis.
                    </p>

                    <label className="mt-2 inline-flex items-center gap-2 rounded-button bg-canvas-subtle px-3.5 py-1.5 text-meta font-medium text-ink border border-rule cursor-pointer hover:bg-canvas transition-colors">
                      <input
                        type="file"
                        accept=".md,.txt"
                        onChange={handleFileUpload}
                        disabled={isExtracting}
                        className="sr-only"
                      />
                      <span>
                        {isExtracting ? "Mengekstrak Teks Dokumen..." : "Pilih Berkas dari Komputer"}
                      </span>
                    </label>

                    {extractError ? (
                      <div className="mt-2 w-full rounded border border-red-200 bg-red-50 p-2 text-micro text-red-700 text-left">
                        {extractError}
                      </div>
                    ) : null}

                    {uploadSuccessNote ? (
                      <div className="mt-2 w-full rounded border border-emerald-200 bg-emerald-50 p-2 text-micro text-emerald-800 text-left">
                        {uploadSuccessNote}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <label className="text-meta font-semibold text-ink">Judul Dokumen</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Ketentuan Lepas Kunci Wilayah Sota"
                  required
                  className="rounded-button border border-rule px-3 py-2 text-body text-ink outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-meta font-semibold text-ink">Kategori Dokumen</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="rounded-button border border-rule bg-white px-3 py-2 text-body text-ink outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                >
                    {categories.length === 0 ? (
                      <option value="">Belum ada kategori</option>
                    ) : (
                      categories.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.label}
                        </option>
                      ))
                    )}
                </select>
              </div>
                <button
                  type="button"
                  onClick={() => setKategoriTerbuka(true)}
                  className="self-start text-micro font-semibold text-teal hover:underline"
                >
                  Kelola kategori
                </button>

              <div className="flex flex-col gap-1.5">
                <label className="text-meta font-semibold text-ink">Isi Dokumen Pengetahuan</label>
                <AutoGrowTextarea
                  rows={6}
                  maxHeight={420}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Tuliskan poin-poin persyaratan, aturan jalan, atau ketentuan operasional di sini..."
                  required
                  className="rounded-button border border-rule p-3 font-mono text-meta text-ink outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="docActiveCheck"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded accent-teal cursor-pointer"
                />
                <label htmlFor="docActiveCheck" className="text-meta font-medium text-ink cursor-pointer">
                  Aktifkan dokumen ini untuk prompt AI (RAG aktif)
                </label>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3 border-t border-rule pt-4">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="rounded-button border border-rule px-4 py-2 text-meta font-semibold text-ink hover:bg-canvas"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-button bg-navy px-5 py-2 text-meta font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
                >
                  {isPending ? "Menyimpan..." : "Simpan Dokumen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Modal Konfirmasi Hapus */}
      {deletingDocId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-card border border-rule bg-surface p-5 shadow-xl">
            <h3 className="text-body font-bold text-ink">Hapus Dokumen Pengetahuan?</h3>
            <p className="mt-2 text-meta text-ink-soft">
              Dokumen ini tidak akan lagi diinjeksikan ke dalam konteks asisten virtual AI. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingDocId(null)}
                className="rounded-button border border-rule px-3.5 py-1.5 text-meta font-semibold text-ink hover:bg-canvas"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-button bg-red-600 px-4 py-1.5 text-meta font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {/* Pengelola kategori. Kategori yang masih dipakai dokumen tidak bisa
          dihapus; server menolak dan pesannya ditampilkan di sini. */}
      {kategoriTerbuka ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-lg rounded-card border border-rule bg-surface p-5 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-subtitle font-bold text-ink">Kategori Dokumen</h3>
                <p className="mt-1 text-meta text-ink-soft">
                  Kategori dipakai untuk mengelompokkan dokumen pengetahuan RAG.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setKategoriTerbuka(false);
                  setKategoriError(null);
                  setKategoriBaru("");
                }}
                className="rounded p-1 text-ink-soft hover:bg-canvas hover:text-ink"
                aria-label="Tutup"
              >
                Tutup
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={kategoriBaru}
                onChange={(e) => setKategoriBaru(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void tambahKategori();
                  }
                }}
                placeholder="Nama kategori baru"
                maxLength={60}
                className="h-10 min-w-0 flex-1 rounded-sm border border-rule bg-canvas px-3 text-meta text-ink focus:border-navy focus:outline-none"
              />
              <button
                type="button"
                disabled={kategoriSibuk || !kategoriBaru.trim()}
                onClick={() => void tambahKategori()}
                className="rounded-sm bg-teal px-3 py-2 text-meta font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                Tambah
              </button>
            </div>

            {kategoriError ? (
              <p className="mt-2 text-meta text-danger">{kategoriError}</p>
            ) : null}

            <ul className="mt-4 max-h-72 space-y-1.5 overflow-y-auto">
              {[...categories]
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((c, idx, arr) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-sm border border-rule px-2.5 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-meta font-semibold text-ink">
                        {c.label}
                      </span>
                      <span className="block text-micro text-ink-soft">
                        {c.slug} · {c.jumlahDokumen ?? 0} dokumen
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={kategoriSibuk || idx === 0}
                        onClick={() => void geserKategori(c, -1)}
                        className="rounded-xs border border-rule px-1.5 py-0.5 text-micro hover:border-navy disabled:opacity-30"
                        aria-label={`Naikkan ${c.label}`}
                      >
                        Naik
                      </button>
                      <button
                        type="button"
                        disabled={kategoriSibuk || idx === arr.length - 1}
                        onClick={() => void geserKategori(c, 1)}
                        className="rounded-xs border border-rule px-1.5 py-0.5 text-micro hover:border-navy disabled:opacity-30"
                        aria-label={`Turunkan ${c.label}`}
                      >
                        Turun
                      </button>
                      <button
                        type="button"
                        disabled={kategoriSibuk}
                        onClick={() => void hapusKategori(c)}
                        className="rounded-xs border border-danger/40 px-1.5 py-0.5 text-micro text-danger hover:bg-danger/10 disabled:opacity-30"
                        aria-label={`Hapus ${c.label}`}
                      >
                        Hapus
                      </button>
                    </span>
                  </li>
                ))}
            </ul>

            {categories.length === 0 ? (
              <p className="mt-3 text-meta text-ink-soft">
                Belum ada kategori. Tambahkan satu untuk mulai mengelompokkan dokumen.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
