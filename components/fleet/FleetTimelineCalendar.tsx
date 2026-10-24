"use client";

import { useMemo, useState } from "react";
import { PlateBadge } from "@/components/ui/PlateBadge";
import { StatusChip } from "@/components/ui/StatusChip";
import { IconCalendar } from "@/components/ui/icons";
import { VEHICLE_STATUS } from "@/lib/labels";
import { formatDateSingle } from "@/lib/format";
import type { FleetCalendar, FleetEntry } from "@/lib/operations";

type Props = {
  calendar: FleetCalendar;
};

/* Rentang durasi yang bisa dipilih. Nilai 0 berarti tanpa batas durasi.
   Ini menjawab pertanyaan "mobil mana yang kosong untuk sekian hari ke depan",
   bukan sekadar menyaring jadwal yang sedang berjalan. */
const DURASI_OPTIONS: Array<{ label: string; hari: number }> = [
  { label: "Semua durasi", hari: 0 },
  { label: "2–3 hari", hari: 3 },
  { label: "Sebulan", hari: 30 },
  { label: "Setahun", hari: 365 },
];

type RingkasanKunci = "semua" | "tersedia" | "disewa" | "servis";

function awalHariIni(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/* Status yang ditampilkan diturunkan dari jadwal, bukan dari kolom status operasional.
   Kolom itu menyimpan keadaan unit di gudang (servis, tidak tersedia) dan tidak
   diperbarui saat ada sewa berjalan. Tanpa penurunan ini, unit yang sedang disewa
   tetap tampil "Tersedia" di kalender. */
function statusTampil(entry: FleetEntry, hariIni: Date): "tersedia" | "disewa" | "servis" | "tidak_tersedia" {
  if (entry.status === "servis" || entry.status === "tidak_tersedia") {
    return entry.status;
  }

  const sedangDisewa = (entry.schedules ?? []).some((jadwal) => {
    const mulai = new Date(jadwal.startDateTime);
    mulai.setHours(0, 0, 0, 0);
    const selesai = new Date(jadwal.endDateTime);
    selesai.setHours(23, 59, 59, 999);
    return hariIni >= mulai && hariIni <= selesai;
  });

  return sedangDisewa ? "disewa" : "tersedia";
}

/* Keterangan singkat di bawah plat: jadwal terdekat kalau sedang disewa,
   atau penanda kesiapan kalau kosong. */
function keterangan(entry: FleetEntry, status: string, hariIni: Date): string {
  if (status === "servis") return "Sedang perawatan";
  if (status === "tidak_tersedia") return "Tidak dioperasikan";

  const jadwal = (entry.schedules ?? [])
    .slice()
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());

  const berjalan = jadwal.find((j) => {
    const mulai = new Date(j.startDateTime);
    mulai.setHours(0, 0, 0, 0);
    const selesai = new Date(j.endDateTime);
    selesai.setHours(23, 59, 59, 999);
    return hariIni >= mulai && hariIni <= selesai;
  });

  if (berjalan) {
    return `Sewa ${formatDateSingle(berjalan.startDateTime)} – ${formatDateSingle(berjalan.endDateTime)}`;
  }

  const berikutnya = jadwal.find((j) => new Date(j.startDateTime) > hariIni);
  if (berikutnya) {
    return `Kosong sampai ${formatDateSingle(berikutnya.startDateTime)}`;
  }

  return "Siap disewa";
}

/* Sebuah unit dianggap tersedia untuk seluruh rentang bila tidak ada satu pun
   jadwal yang beririsan dengan rentang itu. */
function tersediaUntukRentang(entry: FleetEntry, hariIni: Date, jumlahHari: number): boolean {
  if (jumlahHari <= 0) return true;

  const batas = new Date(hariIni);
  batas.setDate(batas.getDate() + jumlahHari);
  batas.setHours(23, 59, 59, 999);

  return !(entry.schedules ?? []).some((jadwal) => {
    const mulai = new Date(jadwal.startDateTime);
    mulai.setHours(0, 0, 0, 0);
    const selesai = new Date(jadwal.endDateTime);
    selesai.setHours(23, 59, 59, 999);
    return mulai <= batas && selesai >= hariIni;
  });
}

export function FleetTimelineCalendar({ calendar }: Props) {
  const hariIni = useMemo(() => awalHariIni(), []);

  /* Default "tersedia": saat halaman dibuka, yang tampil hanya unit yang benar-benar
     bisa disewa. Unit lain tetap terjangkau lewat kartu ringkasan di atas. */
  const [saringan, setSaringan] = useState<RingkasanKunci>("tersedia");
  const [durasiHari, setDurasiHari] = useState<number>(0);
  const [tampilan, setTampilan] = useState<"kartu" | "jadwal">("kartu");

  const denganStatus = useMemo(
    () =>
      calendar.fleet.map((entry) => {
        const status = statusTampil(entry, hariIni);
        return {
          entry,
          status,
          keterangan: keterangan(entry, status, hariIni),
          tersediaRentang: tersediaUntukRentang(entry, hariIni, durasiHari),
        };
      }),
    [calendar.fleet, hariIni, durasiHari],
  );

  const jumlah = useMemo(
    () => ({
      semua: denganStatus.length,
      tersedia: denganStatus.filter((v) => v.status === "tersedia").length,
      disewa: denganStatus.filter((v) => v.status === "disewa").length,
      servis: denganStatus.filter((v) => v.status === "servis" || v.status === "tidak_tersedia").length,
    }),
    [denganStatus],
  );

  const ditampilkan = useMemo(() => {
    const cocokStatus = denganStatus.filter((v) => {
      if (saringan === "semua") return true;
      if (saringan === "servis") return v.status === "servis" || v.status === "tidak_tersedia";
      return v.status === saringan;
    });

    if (durasiHari <= 0) return cocokStatus;
    return cocokStatus.filter((v) => v.tersediaRentang);
  }, [denganStatus, saringan, durasiHari]);

  const kartuRingkasan: Array<{ kunci: RingkasanKunci; label: string; nilai: number; ket: string; warna: string }> = [
    { kunci: "semua", label: "Total armada", nilai: jumlah.semua, ket: "kendaraan terdaftar", warna: "bg-navy" },
    { kunci: "tersedia", label: "Tersedia", nilai: jumlah.tersedia, ket: "siap disewa", warna: "bg-teal" },
    { kunci: "disewa", label: "Disewa", nilai: jumlah.disewa, ket: "punya jadwal bulan ini", warna: "bg-navy" },
    { kunci: "servis", label: "Servis", nilai: jumlah.servis, ket: "sedang perawatan", warna: "bg-gold" },
  ];

  return (
    <div className="space-y-4">
      {/* Ringkasan sekaligus saringan. Kartu ini bukan sekadar angka: mengkliknya
          menyaring daftar di bawah, sehingga unit yang tidak sedang tersedia tetap
          terjangkau tanpa memenuhi halaman sejak awal. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kartuRingkasan.map((kartu) => {
          const aktif = saringan === kartu.kunci;
          return (
            <button
              key={kartu.kunci}
              type="button"
              onClick={() => setSaringan(kartu.kunci)}
              aria-pressed={aktif}
              className={`rounded-card border bg-surface p-4 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy ${
                aktif ? "border-navy ring-1 ring-navy/20" : "border-rule hover:border-navy/40"
              }`}
            >
              <span className="flex items-center gap-1.5 text-meta text-ink-soft">
                <span className={`h-2 w-2 rounded-full ${kartu.warna}`} />
                {kartu.label}
              </span>
              <span className="mt-1 block text-2xl font-bold tabular-nums text-ink">{kartu.nilai}</span>
              <span className="mt-0.5 block text-micro text-ink-soft">{kartu.ket}</span>
            </button>
          );
        })}
      </div>

      {/* Kendali tambahan: durasi sewa dan pilihan tampilan jadwal */}
      <div className="flex flex-col gap-3 rounded-md border border-rule bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="durasi-sewa" className="text-meta font-medium text-ink">
            Butuh berapa lama
          </label>
          <select
            id="durasi-sewa"
            value={durasiHari}
            onChange={(event) => setDurasiHari(Number(event.target.value))}
            className="h-9 rounded-sm border border-rule-strong bg-canvas px-2 text-meta text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
          >
            {DURASI_OPTIONS.map((opsi) => (
              <option key={opsi.hari} value={opsi.hari}>
                {opsi.label}
              </option>
            ))}
          </select>
          <span className="text-micro text-ink-soft">
            {ditampilkan.length} unit cocok
          </span>
        </div>

        <div className="flex items-center rounded-sm border border-rule bg-canvas p-0.5">
          <button
            type="button"
            onClick={() => setTampilan("kartu")}
            className={`rounded-xs px-2.5 py-1 text-meta font-medium ${
              tampilan === "kartu" ? "bg-surface font-semibold text-ink shadow-xs" : "text-ink-soft"
            }`}
          >
            Kartu
          </button>
          <button
            type="button"
            onClick={() => setTampilan("jadwal")}
            className={`rounded-xs px-2.5 py-1 text-meta font-medium ${
              tampilan === "jadwal" ? "bg-surface font-semibold text-ink shadow-xs" : "text-ink-soft"
            }`}
          >
            Jadwal
          </button>
        </div>
      </div>

      {ditampilkan.length === 0 ? (
        <div className="rounded-md border border-rule bg-canvas px-4 py-6 text-center">
          <p className="text-body font-semibold text-ink">Tidak ada unit yang cocok</p>
          <p className="mt-1 text-meta text-ink-soft">
            Coba pilih kartu ringkasan lain, atau longgarkan pilihan durasi sewa.
          </p>
        </div>
      ) : tampilan === "kartu" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ditampilkan.map(({ entry, status, keterangan: ket }) => (
            <div
              key={entry.id}
              className="rounded-lg border border-rule bg-surface p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <StatusChip tone={VEHICLE_STATUS[status].tone}>
                  {VEHICLE_STATUS[status].label}
                </StatusChip>
                <IconCalendar className="h-4 w-4 text-ink-soft" />
              </div>

              <div className="mt-3 flex justify-center py-2">
                <div className="flex h-12 w-20 items-center justify-center rounded-md bg-canvas text-ink-soft">
                  <svg viewBox="0 0 48 28" className="h-7 w-12" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M3 20h42M7 20v-4l4-6h14l5 6h8l3 4v4M13 20a3 3 0 1 0 6 0 3 3 0 1 0-6 0M30 20a3 3 0 1 0 6 0 3 3 0 1 0-6 0" />
                  </svg>
                </div>
              </div>

              {/* Nama dan plat ditumpuk atas-bawah, bukan sejajar. Sejajar membuat
                  nama panjang dan plat berebut lebar yang sama. */}
              <div className="mt-2 space-y-1.5">
                <p className="text-body font-semibold uppercase leading-tight text-ink">
                  {entry.name}
                </p>
                <PlateBadge plate={entry.plate} />
              </div>

              <p className="mt-2.5 text-meta text-ink-soft">{ket}</p>
            </div>
          ))}
        </div>
      ) : (
        /* Tampilan jadwal: satu baris per unit, tanggal dipisah dari rentangnya
           supaya kolom tanggal tidak memanjang. */
        <div className="overflow-x-auto rounded-lg border border-rule bg-surface shadow-card">
          <table className="w-full text-left">
            <thead className="border-b border-rule bg-canvas text-meta font-semibold text-ink">
              <tr>
                <th className="px-4 py-3">Kendaraan &amp; Plat</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Lama</th>
                <th className="px-4 py-3">Pelanggan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule text-body">
              {ditampilkan.map(({ entry, status }) => {
                const jadwal = (entry.schedules ?? [])
                  .slice()
                  .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())[0];

                const jumlahHari = jadwal
                  ? Math.max(
                      1,
                      Math.ceil(
                        (new Date(jadwal.endDateTime).getTime() - new Date(jadwal.startDateTime).getTime()) /
                          (1000 * 60 * 60 * 24),
                      ),
                    )
                  : 0;

                return (
                  <tr key={entry.id} className="hover:bg-canvas/50">
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-ink">{entry.name}</span>
                      <PlateBadge plate={entry.plate} className="mt-1" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip tone={VEHICLE_STATUS[status].tone}>
                        {VEHICLE_STATUS[status].label}
                      </StatusChip>
                    </td>
                    <td className="px-4 py-3 text-meta text-ink">
                      {jadwal ? formatDateSingle(jadwal.startDateTime) : "—"}
                    </td>
                    <td className="px-4 py-3 text-meta tabular-nums text-ink-soft">
                      {jadwal ? `${jumlahHari} hari` : "—"}
                    </td>
                    <td className="px-4 py-3 text-meta text-ink">{jadwal?.customerName ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
