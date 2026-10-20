import { useEffect, useState } from "react";

/**
 * Hook untuk men-debounce nilai state (seperti input teks pencarian).
 * Mencegah re-kalkulasi atau filter yang terlalu sering saat pengguna mengetik cepat.
 *
 * @param value Nilai input yang berubah-ubah
 * @param delayMs Jeda waktu debounce dalam milidetik (default 300ms)
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
