"use client";

import { useState, useEffect, useOptimistic, startTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FaqFormModal } from "@/components/modals/FaqFormModal";
import { DeleteFaqModal } from "@/components/modals/DeleteFaqModal";
import { Button } from "@/components/ui/Button";
import { Panel, PageLead } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import { Toggle } from "@/components/ui/Toggle";
import {
  IconPlus,
  IconSearch,
  IconPencil,
  IconTrash,
} from "@/components/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { FAQ_CATEGORY_PRESETS } from "@/lib/labels";
import { apiClient } from "@/lib/axios";
import { useDebounce } from "@/lib/useDebounce";
import type { FaqItem } from "@/lib/types";

type Props = {
  initialFaqs?: FaqItem[];
};

export function FaqManagementHub({ initialFaqs = [] }: Props) {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [deletingFaq, setDeletingFaq] = useState<FaqItem | null>(null);

  // Notice notification (dengan auto-dismiss otomatis 2.5 detik)
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  // TanStack Query for caching and server state synchronization
  const { data: faqs = initialFaqs, isFetching } = useQuery<FaqItem[]>({
    queryKey: ["adminFaqs"],
    queryFn: async (): Promise<FaqItem[]> => {
      const res = await apiClient.get("/admin/faqs");
      if (Array.isArray(res.data?.data)) {
        return res.data.data;
      }
      return initialFaqs;
    },
    initialData: initialFaqs,
    initialDataUpdatedAt: 0,
  });

  // Mutation for instant mobile visibility toggle
  const toggleVisibilityMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch(`/admin/faqs/${encodeURIComponent(id)}/toggle`);
      return res.data?.data as FaqItem;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["adminFaqs"] });
      const previous = queryClient.getQueryData<FaqItem[]>(["adminFaqs"]);

      queryClient.setQueryData<FaqItem[]>(["adminFaqs"], (current) =>
        (current ?? []).map((item) =>
          item.id === id ? { ...item, isActive: !item.isActive } : item,
        ),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["adminFaqs"], context.previous);
      }
      setNotice("Gagal memperbarui status visibilitas FAQ.");
    },
    onSuccess: (data) => {
      setNotice(
        `Status FAQ berhasil diubah menjadi ${data.isActive ? "Tampil di Mobile" : "Disembunyikan"}.`,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["adminFaqs"] });
    },
  });

  // Categories list
  const existingCategories = Array.from(new Set(faqs.map((f) => f.category))).filter(Boolean);
  const filterCategories = [
    "Semua",
    ...Array.from(new Set([...FAQ_CATEGORY_PRESETS, ...existingCategories])),
  ];

  // Filtering
  const filteredFaqs = faqs.filter((faq) => {
    // Kategori
    if (selectedCategory !== "Semua" && faq.category !== selectedCategory) {
      return false;
    }
    // Search
    const q = debouncedSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      faq.question.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q) ||
      faq.category.toLowerCase().includes(q)
    );
  });

  // Optimistic UI updates for instant toggle feel
  const [optimisticFaqs, setOptimisticFaq] = useOptimistic(
    filteredFaqs,
    (current, update: { id: string; isActive: boolean }) =>
      current.map((item) => (item.id === update.id ? { ...item, isActive: update.isActive } : item)),
  );

  const handleToggleVisibility = (faq: FaqItem) => {
    startTransition(async () => {
      const nextActive = !faq.isActive;
      setOptimisticFaq({ id: faq.id, isActive: nextActive });
      try {
        await toggleVisibilityMutation.mutateAsync(faq.id);
      } catch {
        // Otomatis di-rollback oleh onError React Query
      }
    });
  };

  return (
    <>
      {notice ? (
        <div className="mb-3 flex items-center justify-between rounded-sm border border-teal/40 bg-teal/10 px-3.5 py-2 text-meta text-teal transition-all">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-micro font-semibold hover:underline"
          >
            Tutup
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <Panel
          title="Daftar FAQ &amp; Basis Pengetahuan Mobile"
          action={
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-64">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <input
                  type="text"
                  placeholder="Cari pertanyaan, jawaban..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-sm border border-rule bg-canvas pl-9 pr-3 text-meta text-ink placeholder:text-ink-soft focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>

              <Button
                variant="confirm"
                onClick={() => {
                  setEditingFaq(null);
                  setIsFormOpen(true);
                }}
              >
                <IconPlus className="h-4 w-4" />
                Tambah FAQ
              </Button>
            </div>
          }
        >
          {/* Category Filter Chips */}
          <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b border-rule pb-3">
            <span className="mr-2 text-micro font-semibold uppercase text-ink-soft">Kategori:</span>
            {filterCategories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-sm px-3 py-1 text-meta font-medium transition-colors ${
                    active
                      ? "bg-navy text-white shadow-xs font-semibold"
                      : "border border-rule bg-surface text-ink hover:bg-canvas"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <Table caption="Daftar FAQ resmi MobilJuragan dan pengaturan visibilitas">
            <TableHead>
              <TableRow>
                <TableHeaderCell className="w-[520px]">Pertanyaan &amp; Jawaban</TableHeaderCell>
                <TableHeaderCell className="w-[160px]">Kategori</TableHeaderCell>
                <TableHeaderCell className="w-[150px] text-center">Tampil Mobile</TableHeaderCell>
                <TableHeaderCell className="w-[100px] text-right">Aksi</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {optimisticFaqs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-meta text-ink-soft">
                    {faqs.length === 0
                      ? "Belum ada FAQ yang tersimpan."
                      : `Tidak ada FAQ yang cocok dengan kata kunci "${searchQuery}".`}
                  </TableCell>
                </TableRow>
              ) : (
                optimisticFaqs.map((faq) => {
                  const isExpanded = expandedId === faq.id;
                  return (
                    <TableRow key={faq.id} className="hover:bg-canvas/50">
                      {/* Pertanyaan & Jawaban (Bisa Diklik untuk Expand) */}
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                          className="w-full text-left focus:outline-none"
                        >
                          <p className="text-body font-semibold text-ink hover:text-navy">
                            {faq.question}
                          </p>
                          <p
                            className={`mt-1 text-meta text-ink-soft transition-all ${
                              isExpanded ? "whitespace-pre-line" : "line-clamp-1"
                            }`}
                          >
                            {faq.answer}
                          </p>
                          <span className="mt-0.5 inline-block text-micro font-medium text-navy hover:underline">
                            {isExpanded ? "Tutup ringkasan ▲" : "Lihat selengkapnya ▼"}
                          </span>
                        </button>
                      </TableCell>

                      {/* Kategori */}
                      <TableCell>
                        <StatusChip tone="neutral">{faq.category}</StatusChip>
                      </TableCell>

                      {/* Visibilitas Mobile Switch */}
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Toggle
                            checked={faq.isActive}
                            disabled={toggleVisibilityMutation.isPending}
                            onChange={() => handleToggleVisibility(faq)}
                            labelOn="Aktif"
                            labelOff="Sembunyi"
                          />
                        </div>
                      </TableCell>

                      {/* Aksi Edit & Hapus */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFaq(faq);
                              setIsFormOpen(true);
                            }}
                            className="rounded-xs border border-rule bg-canvas p-1.5 text-ink hover:border-navy hover:text-navy transition-colors"
                            title="Edit FAQ"
                          >
                            <IconPencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingFaq(faq)}
                            className="rounded-xs border border-rule bg-canvas p-1.5 text-danger/80 hover:border-danger hover:text-danger transition-colors"
                            title="Hapus FAQ"
                          >
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Panel>
      </div>

      {/* Modal Tambah / Edit FAQ */}
      {isFormOpen ? (
        <FaqFormModal
          faq={editingFaq ?? undefined}
          existingCategories={existingCategories}
          onClose={() => {
            setIsFormOpen(false);
            setEditingFaq(null);
          }}
          onSave={(saved) => {
            queryClient.invalidateQueries({ queryKey: ["adminFaqs"] });
            setNotice(
              editingFaq
                ? `FAQ "${saved.question.slice(0, 30)}..." berhasil diperbarui.`
                : "FAQ baru berhasil ditambahkan.",
            );
          }}
        />
      ) : null}

      {/* Modal Konfirmasi Hapus FAQ */}
      {deletingFaq ? (
        <DeleteFaqModal
          faq={deletingFaq}
          onClose={() => setDeletingFaq(null)}
          onDeleted={() => {
            queryClient.invalidateQueries({ queryKey: ["adminFaqs"] });
            setNotice("FAQ berhasil dihapus.");
          }}
        />
      ) : null}
    </>
  );
}
