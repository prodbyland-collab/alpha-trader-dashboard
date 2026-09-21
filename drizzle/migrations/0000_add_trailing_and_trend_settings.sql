ALTER TABLE public.bot_settings
  ADD COLUMN IF NOT EXISTS trailing_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS trail_activate_pct numeric NOT NULL DEFAULT 1.2,
  ADD COLUMN IF NOT EXISTS trail_giveback_pct numeric NOT NULL DEFAULT 0.6,
  ADD COLUMN IF NOT EXISTS trend_filter_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.positions
  ADD COLUMN IF NOT EXISTS peak_price numeric,
  ADD COLUMN IF NOT EXISTS trailing_active boolean NOT NULL DEFAULT false;

UPDATE public.positions SET peak_price = entry_price WHERE peak_price IS NULL;

-- More active momentum profile (moderate risk)
UPDATE public.bot_settings
SET volume_spike_threshold = 1.8,
    breakout_lookback = 12,
    min_momentum_pct = 0.25,
    take_profit_pct = 2.5,
    stop_loss_pct = 1.0,
    max_positions = 5,
    trailing_enabled = true,
    trail_activate_pct = 1.2,
    trail_giveback_pct = 0.6,
    trend_filter_enabled = true,
    updated_at = now();
