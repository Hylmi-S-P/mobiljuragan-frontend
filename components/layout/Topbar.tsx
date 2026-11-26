"use client";

import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { IconLogout } from "@/components/ui/icons";
import { WORKSPACE_NAME, pageTitleFor } from "@/lib/navigation";

export function Topbar({
  onOpenNav,
  onRequestLogout,
}: {
  onOpenNav: () => void;
  onRequestLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-rule bg-surface px-5 lg:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <Button variant="outline" onClick={onOpenNav} className="lg:hidden">
          Menu
        </Button>
        <h1 className="truncate text-display font-bold text-ink">{pageTitleFor(pathname)}</h1>
        <p className="hidden text-meta text-ink-soft sm:block">{WORKSPACE_NAME}</p>
      </div>

      <button
        type="button"
        onClick={onRequestLogout}
        aria-label="Keluar dari portal admin"
        className="group inline-flex h-9 items-center justify-center gap-1.5 rounded-sm px-3 text-body font-medium text-ink-soft transition-all duration-150 hover:bg-danger/10 hover:text-danger hover:ring-1 hover:ring-danger/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger cursor-pointer"
      >
        <IconLogout className="h-4 w-4 text-ink-soft/70 transition-colors group-hover:text-danger" />
        <span>Keluar</span>
      </button>
    </header>
  );
}
