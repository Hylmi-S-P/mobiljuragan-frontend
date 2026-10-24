"use client";

import React from "react";

export type CircularProgressRingProps = {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  showValue?: boolean;
  valueSuffix?: string;
  label?: string;
  className?: string;
};

/**
 * Circular progress ring SVG native bergaya Dribbble Clean Card untuk visualisasi rasio
 * ketersediaan unit armada dan pemenuhan kuota sewa.
 */
export function CircularProgressRing({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  color = "#0e7c7b",
  trackColor = "#e2e8f0",
  showValue = true,
  valueSuffix = "%",
  label,
  className = "",
}: CircularProgressRingProps) {
  const safeMax = max > 0 ? max : 100;
  const clampedValue = Math.min(Math.max(value, 0), safeMax);
  const percentage = Math.round((clampedValue / safeMax) * 100);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-label={label || `Progress: ${percentage}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg] transform"
      >
        {/* Track Lingkaran Latar */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress Lingkaran Aktif */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Nilai persentase di tengah cincin */}
      {showValue ? (
        <span
          className="absolute inset-0 flex items-center justify-center text-micro font-bold tabular-nums text-ink"
          style={{ fontSize: size <= 44 ? "0.625rem" : "0.75rem" }}
        >
          {percentage}
          <span className="text-[9px] font-normal text-ink-soft">{valueSuffix}</span>
        </span>
      ) : null}
    </div>
  );
}
