"use client";

import { useState, useOptimistic, startTransition } from "react";
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
  IconChevronUp,
  IconChevronDown,
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

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [deletingFaq, setDeletingFaq] = useState<FaqItem | null>(null);

  // Notice notification
  const [notice, setNotice] = useState<string | null>(null);

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

  // Mutation for priority reordering
  const priorityMutation = useMutation({
    mutationFn: async ({ id, orderIndex }: { id: string; orderIndex: number }) => {
      const res = await apiClient.patch(`/admin/faqs/${encodeURIComponent(id)}`, { orderIndex });
      return res.data?.data as FaqItem;
    },
    onMutate: async ({ id, orderIndex }) => {
      await queryClient.cancelQueries({ queryKey: ["adminFaqs"] });
      const previous = queryClient.getQueryData<FaqItem[]>(["adminFaqs"]);

      queryClient.setQueryData<FaqItem[]>(["adminFaqs"], (current) =>
        (current ?? [])
          .map((item) => (item.id === id ? { ...item, orderIndex } : item))
          .sort((a, b) => a.orderIndex - b.orderIndex),
      );

      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["adminFaqs"], context.previous);
      }
      setNotice("Gagal mengubah urutan prioritas FAQ.");
    },
    onSuccess: (_data, vars) => {
      setNotice(`Urutan prioritas diperbarui ke ${vars.orderIndex}.`);
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

  // Sort by orderIndex ASC
  const sortedFaqs = [...filteredFaqs].sort((a, b) => a.orderIndex - b.orderIndex);

  // Optimistic UI updates for instant toggle feel
  const [optimisticFaqs, setOptimisticFaq] = useOptimistic(
    sortedFaqs,
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

  const handleAdjustPriority = (faq: FaqItem, delta: number) => {
    const newOrder = Math.max(0, faq.orderIndex + delta);
    if (newOrder === faq.orderIndex) return;
    priorityMutation.mutate({ id: faq.id, orderIndex: newOrder });
  };

  return (
    <>
      <PageLead lead="Kelola daftar tanya jawab pelanggan, atur kategori, tentukan prioritas urutan tampilan, dan kendalikan visibilitas langsung ke aplikasi mobile serta basis pengetahuan RAG AI Gateway." />

      {notice ? (
        <div className="mt-3 flex items-center justify-between rounded-sm border border-teal/40 bg-teal/10 px-3.5 py-2 text-meta text-teal">
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

      <div className="mt-4">
        <Panel
          action={
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-soft">
                  <IconSearch className="h-4 w-4" />
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari pertanyaan, jawaban, atau kategori..."
                  aria-label="Cari FAQ"
                  className="h-11 w-64 rounded-sm border border-rule-strong bg-canvas pl-9 pr-3 text-meta text-ink placeholder:text-ink-soft focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy sm:w-80"
                />
              </div>
              <Button
                variant="confirm"
                size="md"
                onClick={() => {
                  setEditingFaq(null);
                  setIsFormOpen(true);
                }}
              >
                <IconPlus className="h-4 w-4" />
                Tambah FAQ Baru
              </Button>
            </div>
          }
        >
          {/* Category Filter Chips */}
          <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b border-rule pb-3.5">
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
                      ? "bg-navy text-white shadow-xs"
                      : "border border-rule bg-surface text-ink hover:bg-canvas"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {isFetching ? (
            <p className="mb-2 text-micro text-ink-soft">Menyinkronkan data terbaru dari server...</p>
          ) : null}

          <Table caption="Daftar FAQ resmi MobilJuragan dan pengaturan visibilitas">
            <TableHead>
              <TableRow>
                <TableHeaderCell className="w-[110px] text-center">Prioritas</TableHeaderCell>
                <TableHeaderCell className="w-[440px]">Pertanyaan & Jawaban</TableHeaderCell>
                <TableHeaderCell className="w-[160px]">Kategori</TableHeaderCell>
                <TableHeaderCell className="w-[170px] text-center">Visibilitas Mobile</TableHeaderCell>
                <TableHeaderCell className="w-[160px] text-right">Aksi</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {optimisticFaqs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-meta text-ink-soft">
                    {faqs.length === 0
                      ? "Belum ada FAQ yang tersimpan. Klik tombol 'Tambah FAQ Baru' untuk mulai menambahkan."
                      : `Tidak ada FAQ yang cocok dengan filter atau pencarian "${searchQuery}".`}
                  </TableCell>
                </TableRow>
              ) : (
                optimisticFaqs.map((faq) => (
                  <TableRow key={faq.id}>
                    {/* Prioritas & Tombol Geser */}
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-navy/10 text-body font-semibold text-navy">
                          {faq.orderIndex}
                        </span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleAdjustPriority(faq, -1)}
                            disabled={faq.orderIndex <= 0}
                            title="Naikkan prioritas (tampil lebih awal)"
                            className="flex h-4 w-5 items-center justify-center rounded-xs text-ink-soft hover:bg-rule hover:text-ink disabled:opacity-30"
                          >
                            <IconChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustPriority(faq, 1)}
                            title="Turunkan prioritas (tampil lebih akhir)"
                            className="flex h-4 w-5 items-center justify-center rounded-xs text-ink-soft hover:bg-rule hover:text-ink"
                          >
                            <IconChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </TableCell>

                    {/* Pertanyaan & Jawaban */}
                    <TableCell>
                      <p className="text-body font-semibold text-ink">{faq.question}</p>
                      <p className="mt-1 line-clamp-2 text-meta text-ink-soft">{faq.answer}</p>
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
                          labelOn="Tampil"
                          labelOff="Sembunyi"
                        />
                      </div>
                    </TableCell>

                    {/* Aksi Edit & Hapus */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingFaq(faq);
                            setIsFormOpen(true);
                          }}
                          aria-label={`Edit FAQ: ${faq.question}`}
                        >
                          <IconPencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingFaq(faq)}
                          aria-label={`Hapus FAQ: ${faq.question}`}
                          className="text-danger hover:bg-danger/10"
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                          Hapus
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Panel>
      </div>

      {/* Form Modal (Add / Edit) */}
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
                : `FAQ baru berhasil ditambahkan ke kategori ${saved.category}.`,
            );
          }}
        />
      ) : null}

      {/* Delete Confirmation Modal */}
      {deletingFaq ? (
        <DeleteFaqModal
          faq={deletingFaq}
          onClose={() => setDeletingFaq(null)}
          onDeleted={() => {
            queryClient.invalidateQueries({ queryKey: ["adminFaqs"] });
            setNotice(`FAQ "${deletingFaq.question.slice(0, 30)}..." berhasil dihapus.`);
            setDeletingFaq(null);
          }}
        />
      ) : null}
    </>
  );
}
