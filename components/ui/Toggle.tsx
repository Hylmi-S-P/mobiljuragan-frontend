"use client";

type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelOn: string;
  labelOff: string;
  disabled?: boolean;
  disabledReason?: string;
  /* Sembunyikan label teks di samping sakelar. Dipakai kalau status sudah
     dijelaskan di tempat lain pada kartu yang sama, supaya tidak mengulang. */
  hideLabel?: boolean;
};

/* Sakelar status. Bentuk pil dipakai khusus untuk kontrol sakelar, bukan untuk
   kartu atau tombol, supaya bentuknya menandakan fungsi on/off. */
export function Toggle({
  checked,
  onChange,
  labelOn,
  labelOff,
  disabled = false,
  disabledReason,
  hideLabel = false,
}: ToggleProps) {
  return (
    /* inline-flex supaya sakelar ikut terpusat saat sel tabel menengahkan isinya. */
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        aria-label={`Status kesiapan: ${checked ? labelOn : labelOff}`}
        onClick={() => onChange(!checked)}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          aria-hidden="true"
          className={`flex h-6 w-11 items-center rounded-full border transition-colors ${
            checked ? "border-teal bg-teal" : "border-rule-strong bg-surface"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-surface shadow-card transition-transform ${
              checked ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </span>
      </button>
      {hideLabel ? null : (
        <span className="text-meta font-semibold text-ink">{checked ? labelOn : labelOff}</span>
      )}
      {disabled && disabledReason ? (
        <span className="text-micro text-ink-soft">{disabledReason}</span>
      ) : null}
    </div>
  );
}
