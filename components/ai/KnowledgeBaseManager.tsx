"use client";

import { useState, useTransition } from "react";
import {
  createKnowledgeDocumentAction,
  updateKnowledgeDocumentAction,
  deleteKnowledgeDocumentAction,
  parseKnowledgeFileAction,
} from "@/app/actions";
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

type Props = {
  initialDocuments: KnowledgeDocument[];
};

const CATEGORY_LABELS: Record<string, { label: string; tone: string }> = {
  SOP: { label: "SOP & Regulasi", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  ROUTE: { label: "Rute & Wilayah", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  TARIFF: { label: "Tarif Sewa", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  EMERGENCY: { label: "Darurat & Handoff", tone: "bg-rose-50 text-rose-700 border-rose-200" },
  GENERAL: { label: "Umum", tone: "bg-canvas text-ink-soft border-rule" },
};

export function KnowledgeBaseManager({ initialDocuments }: Props) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(initialDocuments);
  const [isPending, startTransition] = useTransition();

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
                const cat = CATEGORY_LABELS[doc.category] || CATEGORY_LABELS.GENERAL;
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
                      Unggah Berkas SOP / Regulasi (.pdf, .docx, .md, .txt)
                    </span>
                    <p className="max-w-md text-micro text-ink-soft">
                      Ekstraksi teks instan via parser workstation. Judul dan konten akan terisi otomatis.
                    </p>

                    <label className="mt-2 inline-flex items-center gap-2 rounded-button bg-canvas-subtle px-3.5 py-1.5 text-meta font-medium text-ink border border-rule cursor-pointer hover:bg-canvas transition-colors">
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.md,.txt"
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
                  <option value="SOP">SOP & Regulasi Rental</option>
                  <option value="ROUTE">Rute & Wilayah Operasional</option>
                  <option value="TARIFF">Tarif Sewa & Penyesuaian Biaya</option>
                  <option value="EMERGENCY">Darurat & Handoff Staf</option>
                  <option value="GENERAL">Umum / FAQ</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-meta font-semibold text-ink">Isi Dokumen Pengetahuan</label>
                <textarea
                  rows={6}
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
    </div>
  );
}
