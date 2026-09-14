import { useMemo } from "react";
import type { Candle } from "@/lib/strategy";

type Marker = { time: number; price: number; kind: "entry" | "exit" };

type Props = {
  candles: Candle[];
  markers?: Marker[];
  breakoutLevel?: number;
  height?: number;
};

export function PriceChart({ candles, markers = [], breakoutLevel, height = 320 }: Props) {
  const view = useMemo(() => {
    if (candles.length === 0) return null;
    const width = 1000;
    const volumeHeight = 60;
    const priceHeight = height - volumeHeight - 24;
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const max = Math.max(...highs, breakoutLevel ?? -Infinity);
    const min = Math.min(...lows);
    const pad = (max - min) * 0.08 || max * 0.01;
    const top = max + pad;
    const bottom = min - pad;
    const maxVolume = Math.max(...candles.map((c) => c.volume), 1);
    const slot = width / candles.length;
    const bodyWidth = Math.max(slot * 0.6, 1.5);

    const y = (price: number) => ((top - price) / (top - bottom)) * priceHeight;

    return { width, priceHeight, volumeHeight, slot, bodyWidth, y, maxVolume, top, bottom };
  }, [candles, breakoutLevel, height]);

  if (!view) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-border bg-surface text-sm text-muted-foreground"
        style={{ height }}
      >
        Loading price data…
      </div>
    );
  }

  const { width, priceHeight, volumeHeight, slot, bodyWidth, y, maxVolume } = view;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full rounded-lg border border-border bg-surface"
      style={{ height }}
      role="img"
      aria-label="Candlestick price chart with volume"
    >
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={0}
          x2={width}
          y1={priceHeight * f}
          y2={priceHeight * f}
          stroke="currentColor"
          className="text-border"
          strokeWidth={0.5}
        />
      ))}

      {breakoutLevel ? (
        <line
          x1={0}
          x2={width}
          y1={y(breakoutLevel)}
          y2={y(breakoutLevel)}
          stroke="currentColor"
          className="text-primary"
          strokeDasharray="6 6"
          strokeWidth={1}
        />
      ) : null}

      {candles.map((c, i) => {
        const x = i * slot + slot / 2;
        const up = c.close >= c.open;
        const colorClass = up ? "text-profit" : "text-loss";
        const bodyTop = y(Math.max(c.open, c.close));
        const bodyBottom = y(Math.min(c.open, c.close));
        const volH = (c.volume / maxVolume) * volumeHeight;
        return (
          <g key={c.time} className={colorClass}>
            <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke="currentColor" strokeWidth={1} />
            <rect
              x={x - bodyWidth / 2}
              y={bodyTop}
              width={bodyWidth}
              height={Math.max(bodyBottom - bodyTop, 1)}
              fill="currentColor"
            />
            <rect
              x={x - bodyWidth / 2}
              y={height - volH}
              width={bodyWidth}
              height={volH}
              fill="currentColor"
              opacity={0.35}
            />
          </g>
        );
      })}

      {markers.map((m, i) => {
        const idx = candles.findIndex((c, j) => {
          const next = candles[j + 1];
          return m.time >= c.time && (!next || m.time < next.time);
        });
        if (idx < 0) return null;
        const x = idx * slot + slot / 2;
        return (
          <g key={`${m.time}-${i}`} className={m.kind === "entry" ? "text-primary" : "text-loss"}>
            <circle cx={x} cy={y(m.price)} r={4} fill="currentColor" />
          </g>
        );
      })}
    </svg>
  );
}
