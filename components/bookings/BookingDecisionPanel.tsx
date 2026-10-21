"use client";

import { BookingDetailClient } from "./BookingDetailClient";

/**
 * Komponen BookingDecisionPanel telah dipecah secara modular menjadi BookingDetailClient
 * beserta 5 kartu panel kolom kiri dan 1 sticky action sidebar di kolom kanan.
 * Ekspor ini dipertahankan sebagai kompatibilitas mundur.
 */
export const BookingDecisionPanel = BookingDetailClient;
