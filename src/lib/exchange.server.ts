// Binance REST access. Server-only: API secrets never leave this boundary.

const BASE = "https://api.binance.com";

export type Ticker = {
  symbol: string;
  price: number;
  changePct: number;
  quoteVolume: number;
  high: number;
  low: number;
};

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Exchange request failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export async function fetchTickers(symbols: string[]): Promise<Ticker[]> {
  if (symbols.length === 0) return [];
  const query = encodeURIComponent(JSON.stringify(symbols));
  const raw = await publicGet<
    Array<{
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
      quoteVolume: string;
      highPrice: string;
      lowPrice: string;
    }>
  >(`/api/v3/ticker/24hr?symbols=${query}`);
  return raw.map((t) => ({
    symbol: t.symbol,
    price: Number(t.lastPrice),
    changePct: Number(t.priceChangePercent),
    quoteVolume: Number(t.quoteVolume),
    high: Number(t.highPrice),
    low: Number(t.lowPrice),
  }));
}

export async function fetchKlines(symbol: string, interval: string, limit: number): Promise<Candle[]> {
  const raw = await publicGet<unknown[][]>(
    `/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
  );
  return raw.map((k) => ({
    time: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

export async function fetchTopSymbols(limit: number): Promise<string[]> {
  const raw = await publicGet<Array<{ symbol: string; quoteVolume: string }>>(`/api/v3/ticker/24hr`);
  return raw
    .filter((t) => t.symbol.endsWith("USDT") && !/(UP|DOWN|BULL|BEAR)USDT$/.test(t.symbol))
    .sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume))
    .slice(0, limit)
    .map((t) => t.symbol);
}

async function sign(secret: string, query: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(query));
  return Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signedRequest<T>(
  apiKey: string,
  apiSecret: string,
  method: "GET" | "POST",
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const query = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    timestamp: String(Date.now()),
    recvWindow: "10000",
  }).toString();
  const signature = await sign(apiSecret, query);
  const url = `${BASE}${path}?${query}&signature=${signature}`;
  const res = await fetch(url, { method, headers: { "X-MBX-APIKEY": apiKey } });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Exchange rejected the request: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text) as T;
}

export async function verifyCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
  await signedRequest(apiKey, apiSecret, "GET", "/api/v3/account");
  return true;
}

export type MarketOrderResult = { executedQty: number; avgPrice: number };

export async function placeMarketOrder(
  apiKey: string,
  apiSecret: string,
  symbol: string,
  side: "BUY" | "SELL",
  opts: { quoteOrderQty?: number; quantity?: number },
): Promise<MarketOrderResult> {
  const params: Record<string, string | number> = { symbol, side, type: "MARKET" };
  if (opts.quoteOrderQty !== undefined) params["quoteOrderQty"] = opts.quoteOrderQty.toFixed(2);
  if (opts.quantity !== undefined) params["quantity"] = opts.quantity;

  const result = await signedRequest<{
    executedQty: string;
    cummulativeQuoteQty: string;
    fills?: Array<{ price: string; qty: string }>;
  }>(apiKey, apiSecret, "POST", "/api/v3/order", params);

  const executedQty = Number(result.executedQty);
  const quote = Number(result.cummulativeQuoteQty);
  const avgPrice = executedQty > 0 ? quote / executedQty : 0;
  return { executedQty, avgPrice };
}
