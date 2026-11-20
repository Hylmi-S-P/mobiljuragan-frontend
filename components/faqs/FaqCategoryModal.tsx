"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/useToast";
import { apiClient } from "@/lib/axios";

type KategoriFaq = {
  category: string;
  jumlah: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Kelola kategori FAQ.
 *
 * Kategori bukan tabel tersendiri — ia hanya kolom teks pada setiap FAQ. Karena
 * itu layar ini tidak "menambah kategori" (kategori lahir saat FAQ dibuat),
 * melainkan mengganti nama dan menghapus kategori dengan memindahkan FAQ-nya.
 */
export function FaqCategoryModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const { show } = useToast();

  const [mengganti, setMengganti] = useState<string | null>(null);
  const [namaBaru, setNamaBaru] = useState("");
  const [menghapus, setMenghapus] = useState<KategoriFaq | null>(null);
  const [tujuanPindah, setTujuanPindah] = useState("");

  const { data: kategori = [], isLoading } = useQuery<KategoriFaq[]>({
    queryKey: ["faqCategories"],
    enabled: isOpen,
    queryFn: async () => {
      const res = await apiClient.get("/admin/faqs/categories");
      return Array.isArray(res.data?.data) ? (res.data.data as KategoriFaq[]) : [];
    },
  });

  async function segarkan() {
    await queryClient.invalidateQueries({ queryKey: ["faqCategories"] });
    await queryClient.invalidateQueries({ queryKey: ["adminFaqs"] });
  }

  const gantiNama = useMutation({
    mutationFn: async (payload: { lama: string; baru: string }) => {
      const res = await apiClient.patch(
        `/admin/faqs/categories/${encodeURIComponent(payload.lama)}`,
        { namaBaru: payload.baru },
      );
      return res.data?.data as { jumlah: number };
    },
    onSuccess: async (hasil, payload) => {
      await segarkan();
      setMengganti(null);
      setNamaBaru("");
      show(
        `${hasil?.jumlah ?? 0} FAQ dipindahkan dari "${payload.lama}" ke "${payload.baru}".`,
        "success",
      );
    },
    onError: (err) => show(pesanGalat(err, "Kategori gagal diganti namanya."), "error"),
  });

  const hapusKategori = useMutation({
    mutationFn: async (payload: { nama: string; tujuan: string }) => {
      const res = await apiClient.delete(
        `/admin/faqs/categories/${encodeURIComponent(payload.nama)}`,
        { params: { pindahkanKe: payload.tujuan } },
      );
      return res.data?.data as { jumlah: number };
    },
    onSuccess: async (hasil) => {
      await segarkan();
      setMenghapus(null);
      setTujuanPindah("");
      show(
        `Kategori dihapus. ${hasil?.jumlah ?? 0} FAQ dipindahkan ke kategori tujuan.`,
        "success",
      );
    },
    onError: (err) => show(pesanGalat(err, "Kategori gagal dihapus."), "error"),
  });

  const sibuk = gantiNama.isPending || hapusKategori.isPending;

  return (
    <Modal
      open={isOpen}
      onClose={sibuk ? () => {} : onClose}
      title="Kelola Kategori FAQ"
      description="Kategori hanya ada selama dipakai FAQ. Mengganti nama memindahkan semua FAQ-nya; menghapus memerlukan kategori tujuan."
      footer={
        <Button variant="outline" onClick={onClose} disabled={sibuk}>
          Tutup
        </Button>
      }
    >
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-body text-ink-soft">Memuat kategori...</p>
        ) : kategori.length === 0 ? (
          <p className="text-body text-ink-soft">
            Belum ada kategori. Kategori muncul saat FAQ pertama dibuat.
          </p>
        ) : (
          <ul className="divide-y divide-rule rounded-sm border border-rule">
            {kategori.map((item) => {
              const sedangGanti = mengganti === item.category;
              const sedangHapus = menghapus?.category === item.category;
              return (
                <li key={item.category} className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-body font-medium text-ink">{item.category}</p>
                      <p className="text-micro text-ink-soft">{item.jumlah} FAQ</p>
                    </div>
                    {!sedangGanti && !sedangHapus ? (
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMengganti(item.category);
                            setNamaBaru(item.category);
                            setMenghapus(null);
                          }}
                        >
                          Ganti Nama
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMenghapus(item);
                            setTujuanPindah("");
                            setMengganti(null);
                          }}
                        >
                          Hapus
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {sedangGanti ? (
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <label className="min-w-0 flex-1">
                        <span className="block text-micro font-medium text-ink-soft">
                          Nama kategori baru
                        </span>
                        <input
                          type="text"
                          value={namaBaru}
                          onChange={(e) => setNamaBaru(e.target.value)}
                          maxLength={40}
                          className="mt-1 h-10 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                        />
                      </label>
                      <Button
                        variant="confirm"
                        size="sm"
                        disabled={sibuk || namaBaru.trim().length < 2}
                        onClick={() =>
                          gantiNama.mutate({ lama: item.category, baru: namaBaru.trim() })
                        }
                      >
                        Simpan
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={sibuk}
                        onClick={() => {
                          setMengganti(null);
                          setNamaBaru("");
                        }}
                      >
                        Batal
                      </Button>
                    </div>
                  ) : null}

                  {sedangHapus ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-meta text-ink-soft">
                        {item.jumlah} FAQ memakai kategori ini. Pilih kategori tujuan sebelum
                        menghapusnya — FAQ tidak ikut terhapus.
                      </p>
                      <div className="flex flex-wrap items-end gap-2">
                        <label className="min-w-0 flex-1">
                          <span className="block text-micro font-medium text-ink-soft">
                            Pindahkan FAQ ke
                          </span>
                          <select
                            value={tujuanPindah}
                            onChange={(e) => setTujuanPindah(e.target.value)}
                            className="mt-1 h-10 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                          >
                            <option value="">— Pilih kategori tujuan —</option>
                            {kategori
                              .filter((k) => k.category !== item.category)
                              .map((k) => (
                                <option key={k.category} value={k.category}>
                                  {k.category}
                                </option>
                              ))}
                          </select>
                        </label>
                        <Button
                          variant="confirm"
                          size="sm"
                          disabled={sibuk || tujuanPindah.length === 0}
                          onClick={() =>
                            hapusKategori.mutate({ nama: item.category, tujuan: tujuanPindah })
                          }
                        >
                          Hapus Kategori
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={sibuk}
                          onClick={() => {
                            setMenghapus(null);
                            setTujuanPindah("");
                          }}
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function pesanGalat(err: unknown, bawaan: string): string {
  const pesan = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
    ?.error?.message;
  return pesan ?? bawaan;
}
