import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyseCandles, qualifiesForEntry, type ScanRow } from "@/lib/strategy";

export type BotSettings = {
  mode: "paper" | "live";
  bot_enabled: boolean;
  take_profit_pct: number;
  stop_loss_pct: number;
  volume_spike_threshold: number;
  breakout_lookback: number;
  min_momentum_pct: number;
  position_size_usdt: number;
  max_positions: number;
  daily_loss_limit_usdt: number;
  paper_balance: number;
  trailing_enabled: boolean;
  trail_activate_pct: number;
  trail_giveback_pct: number;
  trend_filter_enabled: boolean;
};

export type Position = {
  id: string;
  symbol: string;
  mode: string;
  status: string;
  entry_price: number;
  quantity: number;
  notional_usdt: number;
  take_profit_price: number;
  stop_loss_price: number;
  exit_price: number | null;
  pnl_usdt: number | null;
  pnl_pct: number | null;
  exit_reason: string | null;
  source: string;
  opened_at: string;
  closed_at: string | null;
};

const DEFAULT_SETTINGS: BotSettings = {
  mode: "paper",
  bot_enabled: false,
  take_profit_pct: 2,
  stop_loss_pct: 1,
  volume_spike_threshold: 2.5,
  breakout_lookback: 20,
  min_momentum_pct: 0.5,
  position_size_usdt: 250,
  max_positions: 3,
  daily_loss_limit_usdt: 150,
  paper_balance: 10000,
};

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normaliseSettings(raw: Record<string, unknown> | null): BotSettings {
  if (!raw) return DEFAULT_SETTINGS;
  return {
    mode: raw["mode"] === "live" ? "live" : "paper",
    bot_enabled: Boolean(raw["bot_enabled"]),
    take_profit_pct: num(raw["take_profit_pct"], 2),
    stop_loss_pct: num(raw["stop_loss_pct"], 1),
    volume_spike_threshold: num(raw["volume_spike_threshold"], 2.5),
    breakout_lookback: Math.round(num(raw["breakout_lookback"], 20)),
    min_momentum_pct: num(raw["min_momentum_pct"], 0.5),
    position_size_usdt: num(raw["position_size_usdt"], 250),
    max_positions: Math.round(num(raw["max_positions"], 3)),
    daily_loss_limit_usdt: num(raw["daily_loss_limit_usdt"], 150),
    paper_balance: num(raw["paper_balance"], 10000),
  };
}

function normalisePosition(raw: Record<string, unknown>): Position {
  return {
    id: String(raw["id"]),
    symbol: String(raw["symbol"]),
    mode: String(raw["mode"]),
    status: String(raw["status"]),
    entry_price: num(raw["entry_price"]),
    quantity: num(raw["quantity"]),
    notional_usdt: num(raw["notional_usdt"]),
    take_profit_price: num(raw["take_profit_price"]),
    stop_loss_price: num(raw["stop_loss_price"]),
    exit_price: raw["exit_price"] === null || raw["exit_price"] === undefined ? null : num(raw["exit_price"]),
    pnl_usdt: raw["pnl_usdt"] === null || raw["pnl_usdt"] === undefined ? null : num(raw["pnl_usdt"]),
    pnl_pct: raw["pnl_pct"] === null || raw["pnl_pct"] === undefined ? null : num(raw["pnl_pct"]),
    exit_reason: (raw["exit_reason"] as string | null) ?? null,
    source: String(raw["source"] ?? "bot"),
    opened_at: String(raw["opened_at"]),
    closed_at: (raw["closed_at"] as string | null) ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Account overview                                                            */
/* -------------------------------------------------------------------------- */

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [settingsRes, credRes, watchRes] = await Promise.all([
      supabase.from("bot_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("exchange_credentials")
        .select("exchange, key_hint, validated, last_validated_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("watchlist").select("symbol").eq("user_id", userId).order("symbol"),
    ]);

    let settings = normaliseSettings(settingsRes.data as Record<string, unknown> | null);
    if (!settingsRes.data) {
      await supabase.from("bot_settings").insert({ user_id: userId });
      settings = DEFAULT_SETTINGS;
    }

    return {
      settings,
      credentials: credRes.data
        ? {
            exchange: String((credRes.data as Record<string, unknown>)["exchange"]),
            keyHint: String((credRes.data as Record<string, unknown>)["key_hint"]),
            validated: Boolean((credRes.data as Record<string, unknown>)["validated"]),
            lastValidatedAt: ((credRes.data as Record<string, unknown>)["last_validated_at"] ??
              null) as string | null,
          }
        : null,
      watchlist: (watchRes.data ?? []).map((row) => String((row as Record<string, unknown>)["symbol"])),
    };
  });

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

type SettingsInput = Partial<Omit<BotSettings, "mode">> & { mode?: "paper" | "live" };

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SettingsInput) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.mode === "live") {
      const { data: cred } = await supabase
        .from("exchange_credentials")
        .select("validated")
        .eq("user_id", userId)
        .maybeSingle();
      if (!cred || !(cred as Record<string, unknown>)["validated"]) {
        throw new Error("Add and verify your exchange keys before switching to live trading.");
      }
    }

    const patch: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

    if (data.mode) patch["mode"] = data.mode;
    if (data.bot_enabled !== undefined) patch["bot_enabled"] = data.bot_enabled;
    if (data.take_profit_pct !== undefined) patch["take_profit_pct"] = clamp(data.take_profit_pct, 1, 5);
    if (data.stop_loss_pct !== undefined) patch["stop_loss_pct"] = clamp(data.stop_loss_pct, 0.2, 10);
    if (data.volume_spike_threshold !== undefined)
      patch["volume_spike_threshold"] = clamp(data.volume_spike_threshold, 1.1, 10);
    if (data.breakout_lookback !== undefined)
      patch["breakout_lookback"] = Math.round(clamp(data.breakout_lookback, 5, 60));
    if (data.min_momentum_pct !== undefined)
      patch["min_momentum_pct"] = clamp(data.min_momentum_pct, 0, 10);
    if (data.position_size_usdt !== undefined)
      patch["position_size_usdt"] = clamp(data.position_size_usdt, 10, 100000);
    if (data.max_positions !== undefined)
      patch["max_positions"] = Math.round(clamp(data.max_positions, 1, 20));
    if (data.daily_loss_limit_usdt !== undefined)
      patch["daily_loss_limit_usdt"] = clamp(data.daily_loss_limit_usdt, 1, 1000000);
    if (data.paper_balance !== undefined)
      patch["paper_balance"] = clamp(data.paper_balance, 100, 10000000);

    const { data: saved, error } = await supabase
      .from("bot_settings")
      .upsert(patch as never, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    return normaliseSettings(saved as Record<string, unknown>);
  });

/* -------------------------------------------------------------------------- */
/* Exchange credentials                                                        */
/* -------------------------------------------------------------------------- */

export const saveCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { apiKey: string; apiSecret: string }) => {
    if (!input.apiKey?.trim() || !input.apiSecret?.trim()) throw new Error("Both key and secret are required.");
    return { apiKey: input.apiKey.trim(), apiSecret: input.apiSecret.trim() };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { verifyCredentials } = await import("@/lib/exchange.server");
    const { encryptSecret } = await import("@/lib/crypto.server");

    await verifyCredentials(data.apiKey, data.apiSecret);

    const { error } = await supabase.from("exchange_credentials").upsert(
      {
        user_id: userId,
        exchange: "binance",
        api_key_cipher: await encryptSecret(data.apiKey),
        api_secret_cipher: await encryptSecret(data.apiSecret),
        key_hint: `${data.apiKey.slice(0, 4)}…${data.apiKey.slice(-4)}`,
        validated: true,
        last_validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const removeCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("exchange_credentials").delete().eq("user_id", userId);
    await supabase
      .from("bot_settings")
      .update({ mode: "paper", bot_enabled: false })
      .eq("user_id", userId);
    return { ok: true as const };
  });

/* -------------------------------------------------------------------------- */
/* Watchlist                                                                   */
/* -------------------------------------------------------------------------- */

export const addWatchSymbol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { symbol: string }) => ({
    symbol: input.symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""),
  }))
  .handler(async ({ data, context }) => {
    if (!data.symbol.endsWith("USDT")) throw new Error("Only USDT pairs are supported, e.g. SOLUSDT.");
    const { fetchTickers } = await import("@/lib/exchange.server");
    await fetchTickers([data.symbol]).catch(() => {
      throw new Error(`${data.symbol} is not a tradable pair on the exchange.`);
    });
    const { error } = await context.supabase
      .from("watchlist")
      .upsert({ user_id: context.userId, symbol: data.symbol }, { onConflict: "user_id,symbol" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const removeWatchSymbol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { symbol: string }) => input)
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("watchlist")
      .delete()
      .eq("user_id", context.userId)
      .eq("symbol", data.symbol);
    return { ok: true as const };
  });

/* -------------------------------------------------------------------------- */
/* Candles for the chart                                                       */
/* -------------------------------------------------------------------------- */

export const getCandles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { symbol: string; interval: string }) => input)
  .handler(async ({ data }) => {
    const { fetchKlines } = await import("@/lib/exchange.server");
    const allowed = ["1m", "5m", "15m", "1h", "4h"];
    const interval = allowed.includes(data.interval) ? data.interval : "5m";
    const candles = await fetchKlines(data.symbol, interval, 120);
    return { symbol: data.symbol, interval, candles };
  });

/* -------------------------------------------------------------------------- */
/* The engine: scan + manage positions + open new ones                         */
/* -------------------------------------------------------------------------- */

export type TickResult = {
  scan: ScanRow[];
  open: Position[];
  settings: BotSettings;
  dailyPnl: number;
  haltedByLossLimit: boolean;
  events: string[];
  scannedAt: string;
};

export const runTick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TickResult> => {
    const { supabase, userId } = context;
    const { fetchTickers, fetchKlines } = await import("@/lib/exchange.server");
    const events: string[] = [];

    const [settingsRes, watchRes, openRes] = await Promise.all([
      supabase.from("bot_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("watchlist").select("symbol").eq("user_id", userId).order("symbol"),
      supabase.from("positions").select("*").eq("user_id", userId).eq("status", "open"),
    ]);

    const settings = normaliseSettings(settingsRes.data as Record<string, unknown> | null);
    const symbols = (watchRes.data ?? [])
      .map((r) => String((r as Record<string, unknown>)["symbol"]))
      .slice(0, 14);
    let openPositions = (openRes.data ?? []).map((r) => normalisePosition(r as Record<string, unknown>));

    const params = {
      volumeSpikeThreshold: settings.volume_spike_threshold,
      breakoutLookback: settings.breakout_lookback,
      minMomentumPct: settings.min_momentum_pct,
    };

    // --- market data -------------------------------------------------------
    const tickers = await fetchTickers(symbols).catch(() => []);
    const tickerBySymbol = new Map(tickers.map((t) => [t.symbol, t]));

    const scan: ScanRow[] = [];
    await Promise.all(
      symbols.map(async (symbol) => {
        const ticker = tickerBySymbol.get(symbol);
        if (!ticker) return;
        try {
          const candles = await fetchKlines(symbol, "5m", Math.max(settings.breakout_lookback + 10, 40));
          const a = analyseCandles(candles, params);
          scan.push({
            symbol,
            price: ticker.price,
            changePct: ticker.changePct,
            quoteVolume: ticker.quoteVolume,
            ...a,
          });
        } catch {
          /* skip a symbol the exchange temporarily refuses */
        }
      }),
    );
    scan.sort((a, b) => b.strength - a.strength);

    const priceOf = (symbol: string) =>
      tickerBySymbol.get(symbol)?.price ?? scan.find((r) => r.symbol === symbol)?.price ?? 0;

    // --- daily P&L and loss limit -----------------------------------------
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { data: todayRows } = await supabase
      .from("positions")
      .select("pnl_usdt")
      .eq("user_id", userId)
      .eq("mode", settings.mode)
      .eq("status", "closed")
      .gte("closed_at", startOfDay.toISOString());
    const dailyPnl = (todayRows ?? []).reduce(
      (sum, r) => sum + num((r as Record<string, unknown>)["pnl_usdt"]),
      0,
    );
    const haltedByLossLimit = dailyPnl <= -Math.abs(settings.daily_loss_limit_usdt);

    // --- exits -------------------------------------------------------------
    const credentials = await loadCredentials(supabase, userId, settings.mode);

    for (const position of openPositions.filter((p) => p.mode === settings.mode)) {
      const price = priceOf(position.symbol);
      if (!price) continue;
      let reason: string | null = null;
      if (price >= position.take_profit_price) reason = "take_profit";
      else if (price <= position.stop_loss_price) reason = "stop_loss";
      if (!reason) continue;

      const closed = await closeOne(supabase, userId, position, price, reason, settings.mode, credentials);
      events.push(
        `${position.symbol} closed at ${reason === "take_profit" ? "take-profit" : "stop-loss"} (${closed.pnl_pct.toFixed(2)}%)`,
      );
    }

    const { data: refreshedOpen } = await supabase
      .from("positions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "open");
    openPositions = (refreshedOpen ?? []).map((r) => normalisePosition(r as Record<string, unknown>));

    // --- entries -----------------------------------------------------------
    const openInMode = openPositions.filter((p) => p.mode === settings.mode);
    const heldSymbols = new Set(openInMode.map((p) => p.symbol));

    if (settings.bot_enabled && !haltedByLossLimit) {
      for (const row of scan) {
        if (openInMode.length + events.filter((e) => e.includes("opened")).length >= settings.max_positions)
          break;
        if (heldSymbols.has(row.symbol)) continue;
        if (!qualifiesForEntry(row, params)) continue;

        try {
          const opened = await openOne(supabase, userId, row, settings, credentials);
          heldSymbols.add(row.symbol);
          events.push(`${row.symbol} opened at ${opened.entry_price}`);
          await supabase.from("signals").insert({
            user_id: userId,
            symbol: row.symbol,
            signal_type: "breakout_volume",
            strength: row.strength,
            price: row.price,
            volume_ratio: row.volumeRatio,
            momentum_pct: row.momentumPct,
          });
          await supabase.from("bot_logs").insert({
            user_id: userId,
            level: "trade",
            symbol: row.symbol,
            message: `Entry: volume ${row.volumeRatio.toFixed(2)}x average, broke ${row.breakoutLevel}, momentum ${row.momentumPct.toFixed(2)}% — ${settings.mode} mode`,
          });
        } catch (error) {
          await supabase.from("bot_logs").insert({
            user_id: userId,
            level: "error",
            symbol: row.symbol,
            message: `Entry failed: ${error instanceof Error ? error.message : "unknown error"}`,
          });
          events.push(`${row.symbol} entry failed`);
        }
        if (heldSymbols.size >= settings.max_positions) break;
      }
    } else if (settings.bot_enabled && haltedByLossLimit) {
      await supabase
        .from("bot_settings")
        .update({ bot_enabled: false })
        .eq("user_id", userId);
      await supabase.from("bot_logs").insert({
        user_id: userId,
        level: "warn",
        message: `Daily loss limit reached (${dailyPnl.toFixed(2)} USDT). Bot stopped.`,
      });
      settings.bot_enabled = false;
      events.push("Daily loss limit reached — bot stopped");
    }

    const { data: finalOpen } = await supabase
      .from("positions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "open")
      .order("opened_at", { ascending: false });

    return {
      scan,
      open: (finalOpen ?? []).map((r) => normalisePosition(r as Record<string, unknown>)),
      settings,
      dailyPnl,
      haltedByLossLimit,
      events,
      scannedAt: new Date().toISOString(),
    };
  });

type Credentials = { apiKey: string; apiSecret: string } | null;

async function loadCredentials(
  supabase: { from: (t: string) => any },
  userId: string,
  mode: string,
): Promise<Credentials> {
  if (mode !== "live") return null;
  const { data } = await supabase
    .from("exchange_credentials")
    .select("api_key_cipher, api_secret_cipher")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  const { decryptSecret } = await import("@/lib/crypto.server");
  return {
    apiKey: await decryptSecret(String(data.api_key_cipher)),
    apiSecret: await decryptSecret(String(data.api_secret_cipher)),
  };
}

async function openOne(
  supabase: { from: (t: string) => any },
  userId: string,
  row: ScanRow,
  settings: BotSettings,
  credentials: Credentials,
) {
  let entryPrice = row.price;
  let quantity = settings.position_size_usdt / row.price;

  if (settings.mode === "live") {
    if (!credentials) throw new Error("No verified exchange keys available for live trading.");
    const { placeMarketOrder } = await import("@/lib/exchange.server");
    const fill = await placeMarketOrder(credentials.apiKey, credentials.apiSecret, row.symbol, "BUY", {
      quoteOrderQty: settings.position_size_usdt,
    });
    entryPrice = fill.avgPrice || row.price;
    quantity = fill.executedQty || quantity;
  }

  const { data, error } = await supabase
    .from("positions")
    .insert({
      user_id: userId,
      symbol: row.symbol,
      mode: settings.mode,
      side: "long",
      status: "open",
      entry_price: entryPrice,
      quantity,
      notional_usdt: entryPrice * quantity,
      take_profit_price: entryPrice * (1 + settings.take_profit_pct / 100),
      stop_loss_price: entryPrice * (1 - settings.stop_loss_pct / 100),
      source: "bot",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalisePosition(data as Record<string, unknown>);
}

async function closeOne(
  supabase: { from: (t: string) => any },
  userId: string,
  position: Position,
  price: number,
  reason: string,
  mode: string,
  credentials: Credentials,
) {
  let exitPrice = price;

  if (mode === "live" && position.mode === "live") {
    if (!credentials) throw new Error("No verified exchange keys available to close the live position.");
    const { placeMarketOrder } = await import("@/lib/exchange.server");
    const fill = await placeMarketOrder(
      credentials.apiKey,
      credentials.apiSecret,
      position.symbol,
      "SELL",
      { quantity: position.quantity },
    );
    exitPrice = fill.avgPrice || price;
  }

  const pnlUsdt = (exitPrice - position.entry_price) * position.quantity;
  const pnlPct = ((exitPrice - position.entry_price) / position.entry_price) * 100;

  await supabase
    .from("positions")
    .update({
      status: "closed",
      exit_price: exitPrice,
      pnl_usdt: pnlUsdt,
      pnl_pct: pnlPct,
      exit_reason: reason,
      closed_at: new Date().toISOString(),
    })
    .eq("id", position.id)
    .eq("user_id", userId);

  await supabase.from("bot_logs").insert({
    user_id: userId,
    level: pnlUsdt >= 0 ? "trade" : "warn",
    symbol: position.symbol,
    message: `Exit (${reason}) at ${exitPrice.toFixed(6)} — P&L ${pnlUsdt.toFixed(2)} USDT (${pnlPct.toFixed(2)}%)`,
  });

  return { pnl_usdt: pnlUsdt, pnl_pct: pnlPct };
}

export const closePositionNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: raw, error } = await supabase
      .from("positions")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .eq("status", "open")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!raw) throw new Error("That position is no longer open.");

    const position = normalisePosition(raw as Record<string, unknown>);
    const { fetchTickers } = await import("@/lib/exchange.server");
    const [ticker] = await fetchTickers([position.symbol]);
    const price = ticker?.price ?? position.entry_price;
    const credentials = await loadCredentials(supabase, userId, position.mode);
    const result = await closeOne(supabase, userId, position, price, "manual", position.mode, credentials);
    return result;
  });

/* -------------------------------------------------------------------------- */
/* Analytics + activity                                                        */
/* -------------------------------------------------------------------------- */

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { mode: "paper" | "live" }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [closedRes, settingsRes, logsRes] = await Promise.all([
      supabase
        .from("positions")
        .select("*")
        .eq("user_id", userId)
        .eq("mode", data.mode)
        .eq("status", "closed")
        .order("closed_at", { ascending: true })
        .limit(500),
      supabase.from("bot_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("bot_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

    const settings = normaliseSettings(settingsRes.data as Record<string, unknown> | null);
    const trades = (closedRes.data ?? []).map((r) => normalisePosition(r as Record<string, unknown>));

    const wins = trades.filter((t) => (t.pnl_usdt ?? 0) > 0);
    const losses = trades.filter((t) => (t.pnl_usdt ?? 0) <= 0);
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl_usdt ?? 0), 0);

    let running = 0;
    const equityCurve = trades.map((t) => {
      running += t.pnl_usdt ?? 0;
      return { time: t.closed_at ?? t.opened_at, equity: settings.paper_balance + running };
    });

    const byDay = new Map<string, number>();
    for (const t of trades) {
      const day = (t.closed_at ?? t.opened_at).slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + (t.pnl_usdt ?? 0));
    }

    return {
      mode: data.mode,
      startingBalance: settings.paper_balance,
      totalPnl,
      totalTrades: trades.length,
      winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
      avgWin: wins.length ? wins.reduce((s, t) => s + (t.pnl_usdt ?? 0), 0) / wins.length : 0,
      avgLoss: losses.length ? losses.reduce((s, t) => s + (t.pnl_usdt ?? 0), 0) / losses.length : 0,
      best: trades.reduce<Position | null>(
        (b, t) => (!b || (t.pnl_usdt ?? 0) > (b.pnl_usdt ?? 0) ? t : b),
        null,
      ),
      worst: trades.reduce<Position | null>(
        (w, t) => (!w || (t.pnl_usdt ?? 0) < (w.pnl_usdt ?? 0) ? t : w),
        null,
      ),
      equityCurve,
      daily: Array.from(byDay.entries())
        .map(([day, pnl]) => ({ day, pnl }))
        .sort((a, b) => a.day.localeCompare(b.day))
        .slice(-14),
      trades: trades.slice().reverse().slice(0, 100),
      logs: (logsRes.data ?? []).map((r) => ({
        id: String((r as Record<string, unknown>)["id"]),
        level: String((r as Record<string, unknown>)["level"]),
        message: String((r as Record<string, unknown>)["message"]),
        symbol: ((r as Record<string, unknown>)["symbol"] ?? null) as string | null,
        created_at: String((r as Record<string, unknown>)["created_at"]),
      })),
    };
  });
