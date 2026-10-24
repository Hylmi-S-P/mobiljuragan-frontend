"use client";

import { useState, useOptimistic, startTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminAccountModal } from "@/components/modals/AdminAccountModal";
import { AdminManageModal } from "@/components/admin/AdminManageModal";
import { AdminCardGrid } from "@/components/admin/AdminCardGrid";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/PageLayout";
import { Toast } from "@/components/ui/Toast";
import { IconPlus, IconSearch } from "@/components/ui/icons";
import { ADMIN_ROLE } from "@/lib/labels";
import { apiClient } from "@/lib/axios";
import { useDebounce } from "@/lib/useDebounce";
import type { AdminAccount, AdminRole } from "@/lib/types";

type Props = {
  initialAccounts?: AdminAccount[];
};

type StaffUserPayload = {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  isActive: boolean;
};

function mapApiUser(user: StaffUserPayload): AdminAccount {
  const role: AdminRole = user.role === "ADMIN" ? "super_admin" : "staf_operasional";
  return {
    id: user.id,
    name: user.fullName,
    username: user.phoneNumber,
    role,
    active: Boolean(user.isActive),
  };
}

export function AdminAccountsTable({ initialAccounts }: Props) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [managingAccount, setManagingAccount] = useState<AdminAccount | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "error" | "info">("success");

  const showToast = (msg: string, tone: "success" | "error" | "info" = "success") => {
    setToastMessage(msg);
    setToastTone(tone);
  };

  // Mengambil akun yang sedang login untuk proteksi sesi aktif
  const { data: currentUser } = useQuery<{ id: string; fullName: string; role: string }>({
    queryKey: ["currentAdminMe"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/admin/auth/me");
        return res.data?.data?.user;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: accounts = initialAccounts ?? [], isFetching } = useQuery<AdminAccount[]>({
    queryKey: ["adminAccounts"],
    queryFn: async (): Promise<AdminAccount[]> => {
      const res = await apiClient.get("/admin/users");
      if (Array.isArray(res.data?.data)) {
        return res.data.data.map(mapApiUser);
      }
      return initialAccounts ?? [];
    },
    initialData: initialAccounts,
    initialDataUpdatedAt: 0,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await apiClient.patch(`/admin/users/${id}`, { isActive: active });
      return res.data;
    },
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: ["adminAccounts"] });
      const previous = queryClient.getQueryData<AdminAccount[]>(["adminAccounts"]);

      queryClient.setQueryData<AdminAccount[]>(["adminAccounts"], (current) =>
        (current ?? []).map((account) => (account.id === id ? { ...account, active } : account)),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["adminAccounts"], context.previous);
      }
      showToast("Gagal memperbarui status akun staf.", "error");
    },
    onSuccess: (_data, variables) => {
      showToast(
        `Status akun berhasil diubah menjadi ${variables.active ? "Aktif" : "Nonaktif"}.`,
        "success",
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["adminAccounts"] });
    },
  });

  const filteredAccounts = accounts.filter((account) => {
    const q = debouncedSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      account.name.toLowerCase().includes(q) ||
      account.username.toLowerCase().includes(q) ||
      ADMIN_ROLE[account.role].toLowerCase().includes(q)
    );
  });

  const [optimisticAccounts, setOptimisticAccount] = useOptimistic(
    filteredAccounts,
    (current, update: { id: string; active: boolean }) =>
      current.map((acc) => (acc.id === update.id ? { ...acc, active: update.active } : acc)),
  );

  const handleToggleStatus = (account: AdminAccount) => {
    // Proteksi akun login sendiri
    if (currentUser && currentUser.id === account.id) {
      showToast("Anda tidak dapat menonaktifkan akun sendiri yang sedang aktif login.", "error");
      return;
    }

    startTransition(async () => {
      const nextActive = !account.active;
      setOptimisticAccount({ id: account.id, active: nextActive });
      try {
        await toggleStatusMutation.mutateAsync({
          id: account.id,
          active: nextActive,
        });
      } catch {
        // Rollback otomatis dari onError
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
          title="Manajemen Akun Pengelola & Staf Operasional"
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
                  placeholder="Cari nama atau telepon..."
                  aria-label="Cari admin atau staf"
                  className="h-11 w-56 rounded-sm border border-rule-strong bg-canvas pl-9 pr-3 text-meta text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy sm:w-64"
                />
              </div>
              <Button
                variant="confirm"
                size="md"
                onClick={() => setIsCreateOpen(true)}
              >
                <IconPlus className="h-4 w-4" />
                Buat Akun Staf Baru
              </Button>
            </div>
          }
        >
          {isFetching ? (
            <p className="mb-3 text-micro text-ink-soft">Menyinkronkan data staf terbaru...</p>
          ) : null}

          {/* Grid Kartu Akun Staf */}
          <AdminCardGrid
            accounts={optimisticAccounts}
            currentUserId={currentUser?.id}
            onManageAccount={(account) => setManagingAccount(account)}
            onToggleStatus={handleToggleStatus}
            isPendingToggle={toggleStatusMutation.isPending}
          />
        </Panel>
      </div>

      {/* Modal Tambah Akun Baru */}
      {isCreateOpen ? (
        <AdminAccountModal
          existingUsernames={accounts.map((account) => account.username)}
          onClose={() => setIsCreateOpen(false)}
          onSave={(saved) => {
            queryClient.invalidateQueries({ queryKey: ["adminAccounts"] });
            showToast(`Akun ${saved.username} berhasil didaftarkan.`, "success");
            setIsCreateOpen(false);
          }}
        />
      ) : null}

      {/* Modal Kelola & Reset Kata Sandi Akun */}
      {managingAccount ? (
        <AdminManageModal
          account={managingAccount}
          currentUserId={currentUser?.id}
          onClose={() => setManagingAccount(null)}
          onSave={(saved) => {
            queryClient.invalidateQueries({ queryKey: ["adminAccounts"] });
            showToast(`Profil akun ${saved.name} berhasil diperbarui.`, "success");
          }}
          onDeleted={(_id) => {
            queryClient.invalidateQueries({ queryKey: ["adminAccounts"] });
            showToast("Akun staf berhasil dihapus.", "info");
          }}
        />
      ) : null}
    </>
  );
}
