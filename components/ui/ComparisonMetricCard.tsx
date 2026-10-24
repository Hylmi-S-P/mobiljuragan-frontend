"use client";

import React from "react";
import { SparklineMini } from "./SparklineMini";
import { CircularProgressRing } from "./CircularProgressRing";

export type TrendDirection = "up" | "down" | "neutral";

export type MetricTrend = {
  direction: TrendDirection;
  percentage: number;
  label?: string;
  isPositiveGood?: boolean; // Default true: naik = hijau. false: naik = merah (misal komplain/biaya)
};

export type ComparisonMetricCardProps = {
  title: string;
  value: React.ReactNode;
  unitLabel?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  trend?: MetricTrend;
  baselineLabel?: string;
  subtitle?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  circularProgress?: {
    value: number;
    max?: number;
    color?: string;
    label?: string;
    valueSuffix?: string;
  };
  badge?: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

/**
 * ComparisonMetricCard: Kartu Metrik Komparasi bergaya Zoho IoT & Dribbble Clean Card.
 * Menampilkan hero value dengan kontras tinggi, pill tren komparasi delta,
 * baseline periode sebelumnya, serta slot visual sparkline SVG atau circular progress ring.
 */
export function ComparisonMetricCard({
  title,
  value,
  unitLabel,
  icon,
  iconBgColor = "bg-navy/10 text-navy",
  trend,
  baselineLabel,
  subtitle,
  sparklineData,
  sparklineColor,
  circularProgress,
  badge,
  className = "",
  onClick,
}: ComparisonMetricCardProps) {
  // Tentukan warna pill tren berdasarkan arah dan semantik (naik baik atau buruk)
  const isPositiveGood = trend?.isPositiveGood ?? true;
  const isUp = trend?.direction === "up";
  const isDown = trend?.direction === "down";

  let trendColorClasses = "bg-slate-100 text-slate-600 border-slate-200";
  let arrowSymbol = "—";

  if (isUp) {
    arrowSymbol = "▲";
    trendColorClasses = isPositiveGood
      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
      : "bg-red-50 text-red-700 border-red-200/80";
  } else if (isDown) {
    arrowSymbol = "▼";
    trendColorClasses = isPositiveGood
      ? "bg-red-50 text-red-700 border-red-200/80"
      : "bg-emerald-50 text-emerald-700 border-emerald-200/80";
  }

  // Warna default untuk sparkline mengikuti trend bila tidak ditentukan spesifik
  const defaultSparkColor = isUp
    ? isPositiveGood
      ? "#059669"
      : "#dc2626"
    : isDown
      ? isPositiveGood
        ? "#dc2626"
        : "#059669"
      : "#0e7c7b";

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between rounded-card border border-rule bg-surface p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-navy/30 hover:shadow-sm ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {/* Baris Atas: Judul Metrik & Icon / Badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-body font-semibold text-ink line-clamp-1">{title}</span>

        <div className="flex items-center gap-2 shrink-0">
          {badge ? <div>{badge}</div> : null}
          {icon ? (
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105 ${iconBgColor}`}
            >
              {icon}
            </div>
          ) : null}
        </div>
      </div>

      {/* Baris Tengah: Hero Metric Value & Visual Slot (Sparkline / Circular Progress) */}
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-ink tabular-nums">
              {value}
            </span>
            {unitLabel ? (
              <span className="text-body font-normal text-ink-soft">{unitLabel}</span>
            ) : null}
          </div>

          {/* Tren Delta Komparasi */}
          {trend ? (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-micro font-semibold tabular-nums ${trendColorClasses}`}
              >
                <span>{arrowSymbol}</span>
                <span>
                  {trend.percentage > 0 ? `+${trend.percentage}%` : `${trend.percentage}%`}
                </span>
              </span>
              {trend.label ? (
                <span className="text-micro font-medium text-ink-soft">{trend.label}</span>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Slot Visual Kanan: Sparkline Mini atau Circular Progress */}
        {sparklineData && sparklineData.length > 0 ? (
          <div className="shrink-0 pb-1">
            <SparklineMini
              data={sparklineData}
              strokeColor={sparklineColor || defaultSparkColor}
              width={88}
              height={34}
            />
          </div>
        ) : circularProgress ? (
          <div className="shrink-0 pb-0.5">
            <CircularProgressRing
              value={circularProgress.value}
              max={circularProgress.max ?? 100}
              color={circularProgress.color || "#0e7c7b"}
              label={circularProgress.label}
              valueSuffix={circularProgress.valueSuffix}
              size={48}
              strokeWidth={4.5}
            />
          </div>
        ) : null}
      </div>

      {/* Baris Bawah: Baseline Komparasi & Keterangan Kontekstual */}
      {(baselineLabel || subtitle) ? (
        <div className="mt-3.5 border-t border-rule/60 pt-2.5 flex items-center justify-between text-micro text-ink-soft">
          {baselineLabel ? (
            <span className="truncate font-medium">{baselineLabel}</span>
          ) : <span />}
          {subtitle ? (
            <span className="shrink-0 tabular-nums font-normal text-ink-soft/80">{subtitle}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
