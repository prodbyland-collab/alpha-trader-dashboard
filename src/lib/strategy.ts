// Momentum + volume-breakout scoring. Pure functions, shared by server and UI.

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ScanRow = {
  symbol: string;
  price: number;
  changePct: number;
  quoteVolume: number;
  volumeRatio: number;
  momentumPct: number;
  breakoutLevel: number;
  isBreakout: boolean;
  isVolumeSpike: boolean;
  trendUp: boolean;
  strength: number;
  tags: string[];
};

export type StrategyParams = {
  volumeSpikeThreshold: number;
  breakoutLookback: number;
  minMomentumPct: number;
  trendFilterEnabled?: boolean;
};

function ema(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let out = values[0] as number;
  for (let i = 1; i < values.length; i++) out = (values[i] as number) * k + out * (1 - k);
  return out;
}

export function analyseCandles(
  candles: Candle[],
  params: StrategyParams,
): {
  volumeRatio: number;
  momentumPct: number;
  breakoutLevel: number;
  isBreakout: boolean;
  isVolumeSpike: boolean;
  trendUp: boolean;
  strength: number;
  tags: string[];
} {
  const lookback = Math.max(5, Math.min(params.breakoutLookback, candles.length - 2));
  const last = candles[candles.length - 1];
  if (!last || candles.length < lookback + 4) {
    return {
      volumeRatio: 0,
      momentumPct: 0,
      breakoutLevel: 0,
      isBreakout: false,
      isVolumeSpike: false,
      trendUp: false,
      strength: 0,
      tags: [],
    };
  }

  const history = candles.slice(-(lookback + 1), -1);
  const avgVolume = history.reduce((sum, c) => sum + c.volume, 0) / history.length;

  // The newest candle is usually still forming, so its volume is only a
  // fraction of a full period. Project it to a full-period pace before
  // comparing it with the closed candles behind it.
  const prev = candles[candles.length - 2];
  const periodMs = prev ? last.time - prev.time : 0;
  let projectedVolume = last.volume;
  if (periodMs > 0) {
    const elapsed = Date.now() - last.time;
    const fraction = Math.min(Math.max(elapsed / periodMs, 0.2), 1);
    projectedVolume = last.volume / fraction;
  }
  const volumeRatio = avgVolume > 0 ? projectedVolume / avgVolume : 0;
  const breakoutLevel = Math.max(...history.map((c) => c.high));

  const ref = candles[candles.length - 4];
  const momentumPct = ref && ref.close > 0 ? ((last.close - ref.close) / ref.close) * 100 : 0;

  // Trend filter: only buy strength while the short trend is above the long one
  // and price is above both. Keeps entries out of falling markets, where
  // breakouts fail most often.
  const closes = candles.map((c) => c.close);
  const emaFast = ema(closes, 9);
  const emaSlow = ema(closes, 21);
  const trendUp = emaFast > emaSlow && last.close >= emaFast;

  const isBreakout = last.close > breakoutLevel;
  const isVolumeSpike = volumeRatio >= params.volumeSpikeThreshold;
  const hasMomentum = momentumPct >= params.minMomentumPct;

  const tags: string[] = [];
  if (isVolumeSpike) tags.push("Volume spike");
  if (isBreakout) tags.push("Breakout up");
  if (hasMomentum) tags.push("Momentum");
  if (trendUp) tags.push("Uptrend");

  const volumeScore = Math.min(volumeRatio / Math.max(params.volumeSpikeThreshold, 0.1), 2) * 30;
  const momentumScore = Math.min(Math.max(momentumPct, 0) / 2, 1) * 30;
  const breakoutScore = isBreakout ? 25 : 0;
  const trendScore = trendUp ? 15 : 0;
  const raw = volumeScore + momentumScore + breakoutScore + trendScore;
  // A signal against the trend is worth far less.
  const strength = Math.round(Math.min(trendUp ? raw : raw * 0.6, 100));

  return {
    volumeRatio,
    momentumPct,
    breakoutLevel,
    isBreakout,
    isVolumeSpike,
    trendUp,
    strength,
    tags,
  };
}

export function qualifiesForEntry(row: ScanRow, params: StrategyParams): boolean {
  if (params.trendFilterEnabled !== false && !row.trendUp) return false;
  return row.isVolumeSpike && row.isBreakout && row.momentumPct >= params.minMomentumPct;
}

/**
 * Trailing exit. Once the trade is up by `activatePct`, the stop follows the
 * highest price seen, giving back at most `givebackPct`. Returns the new stop
 * price when it should be raised, otherwise null.
 */
export function trailingStopPrice(
  entryPrice: number,
  peakPrice: number,
  currentStop: number,
  activatePct: number,
  givebackPct: number,
): number | null {
  const gainPct = ((peakPrice - entryPrice) / entryPrice) * 100;
  if (gainPct < activatePct) return null;
  const candidate = peakPrice * (1 - givebackPct / 100);
  // Never trail below break-even once activated, and never lower an existing stop.
  const floor = Math.max(entryPrice, currentStop);
  const next = Math.max(candidate, floor);
  return next > currentStop ? next : null;
}
