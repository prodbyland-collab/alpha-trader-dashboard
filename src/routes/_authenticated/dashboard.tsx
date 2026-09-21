import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Pause, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { MarketScanner } from "@/components/MarketScanner";
import { PositionsTable } from "@/components/PositionsTable";
import { PriceChart } from "@/components/PriceChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  addWatchSymbol,
  closePositionNow,
  getCandles,
  removeWatchSymbol,
  runTick,
  saveSettings,
} from "@/lib/trading.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Trading desk — Momentum Desk" },
      {
        name: "description",
        content:
          "Live volume-breakout scanner, open positions with real-time profit and loss, and bot controls.",
      },
      { property: "og:title", content: "Trading desk — Momentum Desk" },
      {
        property: "og:description",
        content: "Live volume-breakout scanner, open positions and bot controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const INTERVALS = ["1m", "5m", "15m", "1h", "4h"] as const;

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss";
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular mt-1 text-xl font-semibold",
          tone === "profit" && "text-profit",
          tone === "loss" && "text-loss",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Dashboard() {
  const queryClient = useQueryClient();
  const tick = useServerFn(runTick);
  const candlesFn = useServerFn(getCandles);
  const saveSettingsFn = useServerFn(saveSettings);
  const closeFn = useServerFn(closePositionNow);
  const addFn = useServerFn(addWatchSymbol);
  const removeFn = useServerFn(removeWatchSymbol);

  const [selected, setSelected] = useState("BTCUSDT");
  const [interval, setInterval] = useState<(typeof INTERVALS)[number]>("5m");
  const [closingId, setClosingId] = useState<string | null>(null);

  const tickQuery = useQuery({
    queryKey: ["tick"],
    queryFn: () => tick(),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const candleQuery = useQuery({
    queryKey: ["candles", selected, interval],
    queryFn: () => candlesFn({ data: { symbol: selected, interval } }),
    refetchInterval: 30000,
  });

  const data = tickQuery.data;
  const scan = data?.scan ?? [];
  const settings = data?.settings;

  const prices = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of scan) map[row.symbol] = row.price;
    return map;
  }, [scan]);

  const openPnl = (data?.open ?? [])
    .filter((p) => p.mode === settings?.mode)
    .reduce((sum, p) => sum + ((prices[p.symbol] ?? p.entry_price) - p.entry_price) * p.quantity, 0);

  const selectedRow = scan.find((r) => r.symbol === selected);
  const markers = (data?.open ?? [])
    .filter((p) => p.symbol === selected)
    .map((p) => ({ time: new Date(p.opened_at).getTime(), price: p.entry_price, kind: "entry" as const }));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["tick"] });

  const toggleBot = useMutation({
    mutationFn: (enabled: boolean) => saveSettingsFn({ data: { bot_enabled: enabled } }),
    onSuccess: (s) => {
      toast.success(s.bot_enabled ? "Bot started" : "Bot paused");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const watchAdd = useMutation({
    mutationFn: (symbol: string) => addFn({ data: { symbol } }),
    onSuccess: () => {
      toast.success("Pair added to the scanner");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const watchRemove = useMutation({
    mutationFn: (symbol: string) => removeFn({ data: { symbol } }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleClose(id: string) {
    setClosingId(id);
    try {
      const result = await closeFn({ data: { id } });
      toast.success(`Position closed — ${result.pnl_usdt >= 0 ? "+" : ""}${result.pnl_usdt.toFixed(2)} USDT`);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not close that position.");
    } finally {
      setClosingId(null);
    }
  }

  const dailyTargetPct = settings
    ? (data!.dailyPnl / Math.max(settings.paper_balance, 1)) * 100
    : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Trading desk</h1>
            <p className="text-xs text-muted-foreground">
              {data?.scannedAt
                ? `Last scan ${new Date(data.scannedAt).toLocaleTimeString()} · refreshes every 15s`
                : "Scanning the market…"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={settings?.mode === "live" ? "destructive" : "secondary"}>
              {settings?.mode === "live" ? "Live trading" : "Paper trading"}
            </Badge>
            <Button variant="outline" size="sm" onClick={refresh} disabled={tickQuery.isFetching}>
              <RefreshCw className={cn("size-4", tickQuery.isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button
              size="sm"
              variant={settings?.bot_enabled ? "destructive" : "default"}
              disabled={!settings || toggleBot.isPending}
              onClick={() => toggleBot.mutate(!settings?.bot_enabled)}
            >
              {settings?.bot_enabled ? <Pause className="size-4" /> : <Play className="size-4" />}
              {settings?.bot_enabled ? "Pause bot" : "Start bot"}
            </Button>
          </div>
        </div>

        {data?.haltedByLossLimit ? (
          <div className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">
            Daily loss limit reached. The bot is stopped for today — you can still close positions by hand.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Today's P&L"
            value={`${(data?.dailyPnl ?? 0) >= 0 ? "+" : ""}${(data?.dailyPnl ?? 0).toFixed(2)} USDT`}
            tone={(data?.dailyPnl ?? 0) >= 0 ? "profit" : "loss"}
            hint={`${dailyTargetPct.toFixed(2)}% of balance · target 1–5%`}
          />
          <Stat
            label="Open P&L"
            value={`${openPnl >= 0 ? "+" : ""}${openPnl.toFixed(2)} USDT`}
            tone={openPnl >= 0 ? "profit" : "loss"}
            hint={`${(data?.open ?? []).filter((p) => p.mode === settings?.mode).length} open of ${settings?.max_positions ?? 0}`}
          />
          <Stat
            label="Exit rules"
            value={
              settings?.trailing_enabled
                ? `Trail −${settings.trail_giveback_pct}% / −${settings.stop_loss_pct}%`
                : `+${settings?.take_profit_pct ?? 0}% / −${settings?.stop_loss_pct ?? 0}%`
            }
            hint={
              settings?.trailing_enabled
                ? `Profit runs after +${settings.trail_activate_pct}% · ${settings.position_size_usdt} USDT per trade`
                : `${settings?.position_size_usdt ?? 0} USDT per trade`
            }
          />
          <Stat
            label="Signals now"
            value={String(scan.filter((r) => r.isBreakout && r.isVolumeSpike).length)}
            hint={`${scan.length} pairs scanned`}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <MarketScanner
            rows={scan}
            selected={selected}
            onSelect={setSelected}
            onAdd={(s) => watchAdd.mutate(s)}
            onRemove={(s) => watchRemove.mutate(s)}
            busy={watchAdd.isPending}
          />

          <div className="rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">{selected.replace("USDT", "/USDT")}</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedRow
                    ? `${selectedRow.price} · ${selectedRow.changePct.toFixed(2)}% 24h · vol ${selectedRow.volumeRatio.toFixed(2)}× average`
                    : "Pick a pair in the scanner"}
                </p>
              </div>
              <div className="flex gap-1">
                {INTERVALS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInterval(i)}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent",
                      interval === i && "bg-accent text-foreground",
                    )}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4">
              <PriceChart
                candles={candleQuery.data?.candles ?? []}
                markers={markers}
                breakoutLevel={selectedRow?.breakoutLevel}
              />
            </div>
          </div>
        </div>

        <PositionsTable
          positions={(data?.open ?? []).filter((p) => p.mode === settings?.mode)}
          prices={prices}
          onClose={handleClose}
          closingId={closingId}
        />

        {data?.events?.length ? (
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <h2 className="text-sm font-semibold">This scan</h2>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {data.events.map((e, i) => (
                <li key={`${e}-${i}`}>{e}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
