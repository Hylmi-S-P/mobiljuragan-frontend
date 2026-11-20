"use client";

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /* Batas tinggi dalam piksel. Setelah batas ini, kotak berhenti memanjang dan
     isinya bisa digulir, supaya formulir tidak terdorong keluar layar. */
  maxHeight?: number;
};

/**
 * Textarea yang tingginya mengikuti isi.
 *
 * Textarea bawaan hanya menampilkan beberapa baris lalu menggulir, sehingga teks
 * panjang seperti jawaban FAQ atau isi dokumen pengetahuan tersembunyi di dalam
 * kotak kecil. Komponen ini menyesuaikan tinggi setiap kali nilainya berubah.
 *
 * Tinggi diatur dengan mengosongkan `height` lebih dulu, karena tanpa itu
 * `scrollHeight` tidak pernah menyusut saat teks dihapus.
 */
export function AutoGrowTextarea({ maxHeight = 420, style, ...props }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const syncHeight = () => {
      el.style.height = "auto";
      if (el.scrollHeight <= 0) {
        el.style.overflowY = "hidden";
        return;
      }
      const tinggi = Math.min(el.scrollHeight, maxHeight);
      el.style.height = `${tinggi}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    };

    syncHeight();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      syncHeight();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [props.value, maxHeight]);

  return <textarea ref={ref} {...props} style={{ resize: "vertical", ...style }} />;
}
