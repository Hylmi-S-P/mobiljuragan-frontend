import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

/* Tabel lebar minimal 720px dan bergulir di dalam kontainernya sendiri,
   supaya halaman tidak pernah meluber horizontal di layar sempit. */
export function Table({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-md border border-rule bg-surface">
      <table className="w-full min-w-[680px] border-collapse text-body tabular-nums">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-canvas text-center text-meta font-medium text-ink-soft">{children}</thead>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-rule">{children}</tbody>;
}

export function TableRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <tr className={`align-middle ${className}`}>{children}</tr>;
}

export function TableHeaderCell({
  children,
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { children: ReactNode }) {
  return (
    /* Pita header lebih tinggi dari sel isi supaya judul kolom nyaman dibaca,
       teksnya ditengahkan secara vertikal. Ukuran huruf tidak diubah.
       Class dari halaman digabung, bukan menimpa class dasar komponen. */
    /* Label header sedikit lebih besar (token text-body) dan di tengah, sejajar
       dengan isian sel yang juga di tengah. Ukuran huruf tetap dari token. */
    <th
      scope="col"
      className={`border-b border-rule px-3.5 py-3.5 align-middle text-center text-body font-medium ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { children: ReactNode }) {
  return (
    /* Sama seperti header: class dari halaman digabung dengan class dasar. */
    /* Isian sel ikut di tengah mengikuti headernya. Kolom pertama (nama) diberi
       text-left dari halaman masing-masing supaya tetap rata kiri. */
    <td className={`px-3.5 py-2.5 text-center text-ink ${className}`} {...props}>
      {children}
    </td>
  );
}
