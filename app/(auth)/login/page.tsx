import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Masuk Portal | MobilJuragan",
  description:
    "Masuk ke portal operasional dan manajemen armada CV. Mobil Juragan Express Transport Merauke.",
};

/* Halaman ini sengaja tidak lagi mengambil data armada. Sebelumnya panel kiri
   menampilkan jumlah unit dan seluruh plat nomor, yang menduplikasi kartu Status
   Armada di dashboard. Karena tidak ada lagi data dinamis, halaman ini bisa
   dirender statis dan tidak perlu membuka koneksi basis data setiap kali dibuka. */
export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-inset px-4 py-6">
      <div className="w-full max-w-[420px] overflow-hidden rounded-lg border border-rule bg-surface lg:rounded-[18px]">
        <section className="px-6 py-8 lg:px-[54px] lg:py-[63px]">
          <div className="mb-7">
            <span className="inline-flex h-[31px] w-[126px] items-center justify-center rounded-md bg-teal text-[13.5px] font-bold text-white">
              MobilJuragan
            </span>
            <h1 className="mt-4 text-display font-bold leading-[1.18] text-ink">
              Portal Operasional &amp; Manajemen Armada
            </h1>
            <p className="mt-2 text-meta leading-[1.45] text-ink-soft">
              CV. Mobil Juragan Express Transport
            </p>
          </div>

          <LoginForm />
        </section>
      </div>
    </main>
  );
}
