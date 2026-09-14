# AI Crypto Trading Bot Dashboard

A private, login-protected dashboard for momentum and volume-breakout trading with a 1–5% daily profit target. Paper trading works from day one; live execution is built but stays off until you add exchange keys and flip the toggle.

## What you get

**Login**
Email/password sign-up and sign-in. Everything — keys, settings, trades, history — is private to your account.

**Exchange connection**
Add your exchange API key and secret in a secure settings page (stored encrypted, never shown back in full). A clear mode switch: Paper or Live. Live only becomes selectable once a key is saved and validated, and switching to Live asks for confirmation.

**Market scanner (real-time)**
A live table of your watched pairs showing price, 24h change, volume vs. its recent average (volume-spike ratio), and breakout status against recent highs/lows. Rows flag "Volume spike", "Breakout up", "Momentum" and sort by signal strength. Auto-refreshes every few seconds.
Default watchlist: the top USDT pairs by volume from your exchange, editable — you can pin or remove pairs any time.

**Bot rules and order triggers**
Per-strategy settings you control: volume-spike threshold, breakout lookback window, minimum momentum, position size, max concurrent positions, daily loss limit, take-profit (1–5%, slider) and stop-loss. A master Bot On/Off switch. When a signal passes your rules, the bot opens a position — simulated in Paper, a real exchange order in Live — and automatically arms take-profit and stop-loss exits.

**Active positions**
Cards/table of open positions with entry price, current price, size, live P&L in currency and %, distance to take-profit and stop-loss, and a manual Close button.

**Charts**
Interactive candlestick chart per pair with volume bars, timeframe switcher, and markers for entries, exits and detected breakout signals.

**Performance analytics**
Daily P&L vs. your 1–5% target, equity curve, win rate, average win/loss, best and worst trades, and a filterable trade history. Paper and Live results tracked separately so you can compare.

**Safety**
Daily loss limit that halts the bot, a global kill switch, and confirmation before any live order. Every bot decision is logged so you can see why a trade happened.

## Technical outline

- Lovable Cloud for auth, database and scheduled work.
- Tables: `profiles`, `exchange_credentials` (encrypted secret, per user), `bot_settings`, `watchlist`, `signals`, `positions`, `trades`, `bot_logs` — all row-level-secured to the owning user.
- Exchange access via server functions only; API keys never reach the browser. Market data and order placement both go through your exchange keys (read-only endpoints for scanning, signed endpoints for live orders).
- Scanner loop: a server function computes volume-spike ratio (current volume / rolling average), breakout vs. N-period high, and momentum from recent candles; the client polls it on an interval and persists fresh signals.
- Execution engine: paper engine fills at current mark price and tracks P&L internally; live engine places market entry plus TP/SL orders through the exchange. Both share one interface, selected by the account's mode.
- Charts with a lightweight candlestick library; analytics computed from the trades table.

## Build order

1. Enable Cloud, auth, and the database schema.
2. Exchange key settings + paper/live toggle.
3. Scanner and watchlist.
4. Charts.
5. Bot rules, triggers, paper execution, positions.
6. Live execution path behind confirmation.
7. Analytics and trade history.

## Note

This automates real money decisions when Live is on. The bot follows your thresholds, but market gaps, exchange outages and slippage can cause losses beyond the stop-loss; the 1–5% daily target is a goal, not a guarantee.
