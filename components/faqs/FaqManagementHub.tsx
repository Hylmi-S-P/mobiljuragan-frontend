"use client";

import { useState, useEffect, useOptimistic, startTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FaqFormModal } from "@/components/modals/FaqFormModal";
import { FaqDetailModal } from "@/components/faqs/FaqDetailModal";
import { FaqCardGrid } from "@/components/faqs/FaqCardGrid";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/PageLayout";
import { Toast } from "@/components/ui/Toast";
import {
  IconPlus,
  IconSearch,
} from "@/components/ui/icons";
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
  const [detailFaq, setDetailFaq] = useState<FaqItem | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "error" | "info">("success");

  const showToast = (msg: string, tone: "success" | "error" | "info" = "success") => {
    setToastMessage(msg);
    setToastTone(tone);
  };

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
      showToast("Gagal memperbarui status visibilitas FAQ.", "error");
    },
    onSuccess: (data) => {
      showToast(
        `FAQ berhasil diubah menjadi ${data.isActive ? "Tampil di Mobile" : "Disembunyikan"}.`,
        "success",
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
    if (selectedCategory !== "Semua" && faq.category !== selectedCategory) {
      return false;
    }
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
      // Juga update detailFaq jika sedang dibuka
      if (detailFaq && detailFaq.id === faq.id) {
        setDetailFaq({ ...detailFaq, isActive: nextActive });
      }
      try {
        await toggleVisibilityMutation.mutateAsync(faq.id);
      } catch {
        // Otomatis di-rollback oleh onError React Query
      }
    });
  };

  return (
    <>
      {toastMessage ? (
        <Toast
          message={toastMessage}
          tone={toastTone}
          durationMs={3000}
          onClose={() => setToastMessage(null)}
        />
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
                  placeholder="Cari pertanyaan, panduan..."
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
          <div className="mb-5 flex flex-wrap items-center gap-1.5 border-b border-rule pb-3.5">
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

          {/* Grid Kartu FAQ */}
          <FaqCardGrid
            faqs={optimisticFaqs}
            onSelectFaq={(faq) => setDetailFaq(faq)}
            onToggleActive={handleToggleVisibility}
            isPendingToggle={toggleVisibilityMutation.isPending}
          />
        </Panel>
      </div>

      {/* Modal Detail & Kelola FAQ (Termasuk Konfirmasi Hapus 2 Tahap) */}
      {detailFaq ? (
        <FaqDetailModal
          faq={detailFaq}
          isOpen={Boolean(detailFaq)}
          onClose={() => setDetailFaq(null)}
          onEdit={(faq) => {
            setDetailFaq(null);
            setEditingFaq(faq);
            setIsFormOpen(true);
          }}
          onToggleActive={handleToggleVisibility}
          onDeleted={(_id) => {
            queryClient.invalidateQueries({ queryKey: ["adminFaqs"] });
            showToast("FAQ berhasil dihapus permanen.", "info");
          }}
        />
      ) : null}

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
            showToast(
              editingFaq
                ? `FAQ "${saved.question.slice(0, 30)}..." berhasil diperbarui.`
                : "FAQ baru berhasil ditambahkan.",
              "success",
            );
          }}
        />
      ) : null}
    </>
  );
}
