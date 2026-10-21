"use client";

import type { CanonicalBookingStatus } from "@/lib/types";

type Props = {
  rawStatus: CanonicalBookingStatus;
  rejectionReason?: string | null;
};

type Stage = {
  id: number;
  label: string;
  description: string;
  canonical: CanonicalBookingStatus;
};

const STAGES: Stage[] = [
  {
    id: 1,
    label: "Permintaan Masuk",
    description: "Pesanan baru dibuat",
    canonical: "CREATED",
  },
  {
    id: 2,
    label: "Konfirmasi Tarif & Supir",
    description: "Verifikasi staf & supir",
    canonical: "PENDING_CONFIRMATION",
  },
  {
    id: 3,
    label: "Menunggu Pembayaran",
    description: "Tarif resmi disahkan",
    canonical: "CONFIRMED",
  },
  {
    id: 4,
    label: "Sewa Berjalan",
    description: "Armada beroperasi",
    canonical: "IN_PROGRESS",
  },
  {
    id: 5,
    label: "Selesai",
    description: "Armada kembali di pool",
    canonical: "COMPLETED",
  },
];

function getStageIndex(rawStatus: CanonicalBookingStatus): number {
  switch (rawStatus) {
    case "CREATED":
      return 1;
    case "PENDING_CONFIRMATION":
      return 2;
    case "CONFIRMED":
      return 3;
    case "IN_PROGRESS":
      return 4;
    case "COMPLETED":
      return 5;
    default:
      return 1;
  }
}

export function BookingTimelineBar({ rawStatus, rejectionReason }: Props) {
  const isRejected = rawStatus === "REJECTED";
  const isCancelled = rawStatus === "CANCELLED";
  const isTerminated = isRejected || isCancelled;

  const currentStep = getStageIndex(rawStatus);

  return (
    <div className="rounded-lg border border-rule bg-surface p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between border-b border-rule/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-teal" />
          <h2 className="text-body font-semibold text-ink">Timeline Alur Pemesanan</h2>
        </div>
        <span className="text-micro font-medium text-ink-soft">
          {isTerminated
            ? isRejected
              ? "Status: Ditolak"
              : "Status: Dibatalkan"
            : `Tahap ${currentStep} dari 5`}
        </span>
      </div>

      {isTerminated ? (
        <div
          className={`rounded-md border p-3 text-meta ${
            isRejected
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-rule bg-canvas text-ink-soft"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 font-bold">!</span>
            <div>
              <p className="font-semibold">
                {isRejected
                  ? "Permintaan sewa ini telah ditolak oleh tim operasional."
                  : "Pemesanan sewa ini telah dibatalkan oleh pelanggan."}
              </p>
              {rejectionReason ? (
                <p className="mt-1 text-micro text-ink">
                  Catatan penolakan: &quot;{rejectionReason}&quot;
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative pt-1 pb-2">
          <div className="grid grid-cols-5 gap-2">
            {STAGES.map((stage) => {
              const isPast = stage.id < currentStep;
              const isCurrent = stage.id === currentStep;
              const isFuture = stage.id > currentStep;

              return (
                <div key={stage.id} className="flex flex-col items-center text-center">
                  <div className="relative mb-2 flex w-full items-center justify-center">
                    {/* Connecting line on left */}
                    {stage.id > 1 ? (
                      <div
                        className={`absolute top-1/2 right-1/2 left-0 h-0.5 -translate-y-1/2 ${
                          isPast || isCurrent ? "bg-teal" : "bg-rule"
                        }`}
                      />
                    ) : null}

                    {/* Connecting line on right */}
                    {stage.id < 5 ? (
                      <div
                        className={`absolute top-1/2 right-0 left-1/2 h-0.5 -translate-y-1/2 ${
                          isPast ? "bg-teal" : "bg-rule"
                        }`}
                      />
                    ) : null}

                    {/* Circle badge */}
                    <div
                      className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-micro font-bold transition-all ${
                        isPast
                          ? "border border-teal bg-teal text-white shadow-xs"
                          : isCurrent
                            ? "border-2 border-teal bg-surface text-teal ring-4 ring-teal/20"
                            : "border border-rule bg-canvas text-ink-soft"
                      }`}
                    >
                      {isPast ? (
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        stage.id
                      )}
                    </div>
                  </div>

                  {/* Stage label & description */}
                  <span
                    className={`block text-meta leading-tight ${
                      isCurrent
                        ? "font-bold text-ink"
                        : isPast
                          ? "font-medium text-ink"
                          : "text-ink-soft"
                    }`}
                  >
                    {stage.label}
                  </span>
                  <span className="mt-0.5 hidden text-micro text-ink-soft sm:block">
                    {stage.description}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
