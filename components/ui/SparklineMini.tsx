"use client";

import React, { useId } from "react";

export type SparklineMiniProps = {
  data: number[];
  width?: number;
  height?: number;
  strokeColor?: string;
  fillGradient?: boolean;
  className?: string;
  ariaLabel?: string;
};

/**
 * Micro sparkline SVG murni native React tanpa dependensi pustaka luar (0 KB bundle).
 * Mendukung kurva halus, gradien fill tembus pandang, dan titik indikator akhir.
 */
export function SparklineMini({
  data,
  width = 96,
  height = 32,
  strokeColor = "#0e7c7b",
  fillGradient = true,
  className = "",
  ariaLabel = "Grafik tren mini",
}: SparklineMiniProps) {
  const gradientId = useId();

  const validData = (data || []).filter((v) => Number.isFinite(v));

  if (validData.length === 0) {
    return (
      <div
        className={`h-8 w-24 rounded bg-canvas/60 ${className}`}
        aria-hidden="true"
      />
    );
  }

  const paddingY = 4;
  const paddingX = 2;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  const min = Math.min(...validData);
  const max = Math.max(...validData);
  const isFlat = max === min;
  const range = isFlat ? 1 : max - min;

  // Koordinat titik [x, y]
  const points: [number, number][] = validData.map((val, idx) => {
    const x = paddingX + (idx / Math.max(validData.length - 1, 1)) * usableWidth;
    const y = isFlat
      ? height / 2
      : height - paddingY - ((val - min) / range) * usableHeight;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });

  const linePath = points.reduce((acc, [x, y], idx) => {
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, "");

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];

  const areaPath = `${linePath} L ${lastPoint[0]} ${height} L ${firstPoint[0]} ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible shrink-0 ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        {fillGradient ? (
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.28} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </linearGradient>
        ) : null}
      </defs>

      {fillGradient && validData.length > 1 ? (
        <path d={areaPath} fill={`url(#${gradientId})`} />
      ) : null}

      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Titik pulsasi data terakhir */}
      {lastPoint ? (
        <circle
          cx={lastPoint[0]}
          cy={lastPoint[1]}
          r={2.5}
          fill={strokeColor}
          className="transition-transform duration-300"
        />
      ) : null}
    </svg>
  );
}
