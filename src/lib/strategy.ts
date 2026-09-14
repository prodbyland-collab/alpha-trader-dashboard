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
  strength: number;
  tags: string[];
};

export type StrategyParams = {
  volumeSpikeThreshold: number;
  breakoutLookback: number;
  minMomentumPct: number;
};

export function analyseCandles(
  candles: Candle[],
  params: StrategyParams,
): {
  volumeRatio: number;
  momentumPct: number;
  breakoutLevel: number;
  isBreakout: boolean;
  isVolumeSpike: boolean;
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
      strength: 0,
      tags: [],
    };
  }

  const history = candles.slice(-(lookback + 1), -1);
  const avgVolume = history.reduce((sum, c) => sum + c.volume, 0) / history.length;
  const volumeRatio = avgVolume > 0 ? last.volume / avgVolume : 0;
  const breakoutLevel = Math.max(...history.map((c) => c.high));

  const ref = candles[candles.length - 4];
  const momentumPct = ref && ref.close > 0 ? ((last.close - ref.close) / ref.close) * 100 : 0;

  const isBreakout = last.close > breakoutLevel;
  const isVolumeSpike = volumeRatio >= params.volumeSpikeThreshold;
  const hasMomentum = momentumPct >= params.minMomentumPct;

  const tags: string[] = [];
  if (isVolumeSpike) tags.push("Volume spike");
  if (isBreakout) tags.push("Breakout up");
  if (hasMomentum) tags.push("Momentum");

  const volumeScore = Math.min(volumeRatio / Math.max(params.volumeSpikeThreshold, 0.1), 2) * 35;
  const momentumScore = Math.min(Math.max(momentumPct, 0) / 2, 1) * 35;
  const breakoutScore = isBreakout ? 30 : 0;
  const strength = Math.round(Math.min(volumeScore + momentumScore + breakoutScore, 100));

  return { volumeRatio, momentumPct, breakoutLevel, isBreakout, isVolumeSpike, strength, tags };
}

export function qualifiesForEntry(row: ScanRow, params: StrategyParams): boolean {
  return row.isVolumeSpike && row.isBreakout && row.momentumPct >= params.minMomentumPct;
}
