import type { ReactNode } from "react";

/**
 * Kalimat pembuka halaman.
 *
 * Judul halaman besar tidak lagi dipasang di sini. Topbar sudah menampilkan nama
 * halaman yang sedang dibuka dan sidebar memakai kata yang sama untuk menunya,
 * sehingga judul besar ketiga hanya mengulang kata yang sama tiga kali. Yang
 * tersisa adalah kalimat penjelas yang menambah keterangan, bukan mengulang nama.
 */
export function PageLead({ lead }: { lead: string }) {
  return <p className="mb-4 max-w-[68ch] text-body text-ink-soft">{lead}</p>;
}

export function Panel({
  title,
  icon,
  action,
  children,
  className = "",
  isiTinggi = false,
}: {
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /* Panel yang isinya perlu menggulir sendiri, misalnya daftar tiket di halaman
     Customer Care. Pembungkus isi di bawah harus ikut jadi flex, kalau tidak
     rantai `flex-1` terputus dan isinya melimpah keluar panel. */
  isiTinggi?: boolean;
}) {
  return (
    <section
      className={`rounded-lg border border-rule bg-surface shadow-card ${
        isiTinggi ? "flex min-h-0 flex-col" : ""
      } ${className}`}
    >
      {title || action ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {icon ? <span className="shrink-0 text-teal">{icon}</span> : null}
            {/* Judul panel memakai h2: topbar adalah h1 halaman, jadi panel adalah
                bagian tingkat pertama di bawahnya. Sebelumnya h3, dan setelah judul
                halaman dihapus tingkat itu melompati satu level. */}
            {title ? <h2 className="text-subtitle font-semibold text-ink">{title}</h2> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div
        className={isiTinggi ? "flex min-h-0 flex-1 flex-col px-4 py-3.5" : "px-4 py-3.5"}
      >
        {children}
      </div>
    </section>
  );
}

/* Label data kecil di kartu detail. Huruf kapital dipakai sebagai penanda kolom data,
   dengan jarak antarhuruf tipis supaya terbaca sebagai label, bukan sebagai teriakan. */
export function DataField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-micro font-semibold uppercase text-ink-soft">{label}</p>
      <p className="mt-1 truncate text-meta font-medium text-ink tabular-nums">{children}</p>
    </div>
  );
}
