import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getAnalytics } from "@/lib/trading.functions";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Performance — Momentum Desk" },
      {
        name: "description",
        content:
          "Daily profit and loss against your 1–5% target, equity curve, win rate and full trade history.",
      },
      { property: "og:title", content: "Performance — Momentum Desk" },
      {
        property: "og:description",
        content: "Daily P&L versus target, equity curve, win rate and trade history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

function Stat({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" }) {
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
    </div>
  );
}

function EquityCurve({ points }: { points: { time: string; equity: number }[] }) {
  const path = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map((p) => p.equity);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const span = max - min || max * 0.01 || 1;
    return points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * 1000;
        const y = 200 - ((p.equity - min) / span) * 180 - 10;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points]);

  if (!path) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-lg border border-border bg-surface text-sm text-muted-foreground">
        Close a few trades and your equity curve appears here.
      </div>
    );
  }

  return (
    <svg
      viewBox="0 0 1000 200"
      preserveAspectRatio="none"
      className="h-[200px] w-full rounded-lg border border-border bg-surface"
      role="img"
      aria-label="Equity curve"
    >
      <path d={path} fill="none" stroke="currentColor" className="text-primary" strokeWidth={2} />
    </svg>
  );
}

function AnalyticsPage() {
  const analyticsFn = useServerFn(getAnalytics);
  const [mode, setMode] = useState<"paper" | "live">("paper");

  const query = useQuery({
    queryKey: ["analytics", mode],
    queryFn: () => analyticsFn({ data: { mode } }),
    refetchInterval: 60000,
  });

  const d = query.data;
  const targetLow = (d?.startingBalance ?? 0) * 0.01;
  const targetHigh = (d?.startingBalance ?? 0) * 0.05;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Performance</h1>
            <p className="text-xs text-muted-foreground">
              Daily target band: {targetLow.toFixed(2)} – {targetHigh.toFixed(2)} USDT (1–5% of your balance).
            </p>
          </div>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "paper" | "live")}>
            <TabsList>
              <TabsTrigger value="paper">Paper</TabsTrigger>
              <TabsTrigger value="live">Live</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Total P&L"
            value={`${(d?.totalPnl ?? 0) >= 0 ? "+" : ""}${(d?.totalPnl ?? 0).toFixed(2)} USDT`}
            tone={(d?.totalPnl ?? 0) >= 0 ? "profit" : "loss"}
          />
          <Stat label="Win rate" value={`${(d?.winRate ?? 0).toFixed(1)}%`} />
          <Stat label="Trades closed" value={String(d?.totalTrades ?? 0)} />
          <Stat
            label="Average win / loss"
            value={`${(d?.avgWin ?? 0).toFixed(2)} / ${(d?.avgLoss ?? 0).toFixed(2)}`}
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Equity curve</h2>
          <EquityCurve points={d?.equityCurve ?? []} />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Daily result vs target</h2>
          <p className="text-xs text-muted-foreground">Last 14 trading days.</p>
          <div className="mt-4 space-y-2">
            {(d?.daily ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No closed trades yet.</p>
            ) : (
              (d?.daily ?? []).map((row) => {
                const pct = d?.startingBalance ? (row.pnl / d.startingBalance) * 100 : 0;
                const width = Math.min(Math.abs(pct) / 5, 1) * 100;
                return (
                  <div key={row.day} className="flex items-center gap-3 text-xs">
                    <span className="tabular w-24 text-muted-foreground">{row.day}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", row.pnl >= 0 ? "bg-profit" : "bg-loss")}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span
                      className={cn("tabular w-32 text-right", row.pnl >= 0 ? "text-profit" : "text-loss")}
                    >
                      {row.pnl >= 0 ? "+" : ""}
                      {row.pnl.toFixed(2)} ({pct.toFixed(2)}%)
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Best trade</h2>
            {d?.best ? (
              <p
                className={`tabular mt-2 text-sm ${
                  (d.best.pnl_usdt ?? 0) >= 0 ? "text-profit" : "text-loss"
                }`}
              >
                {d.best.symbol} {(d.best.pnl_usdt ?? 0) >= 0 ? "+" : ""}
                {(d.best.pnl_usdt ?? 0).toFixed(2)} USDT (
                {(d.best.pnl_pct ?? 0).toFixed(2)}%)
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">—</p>
            )}
            <h2 className="mt-4 text-sm font-semibold">Worst trade</h2>
            {d?.worst ? (
              <p className="tabular mt-2 text-sm text-loss">
                {d.worst.symbol} {(d.worst.pnl_usdt ?? 0).toFixed(2)} USDT (
                {(d.worst.pnl_pct ?? 0).toFixed(2)}%)
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">—</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Bot activity</h2>
            <ul className="mt-3 max-h-56 space-y-2 overflow-auto text-xs">
              {(d?.logs ?? []).length === 0 ? (
                <li className="text-muted-foreground">Nothing logged yet.</li>
              ) : (
                (d?.logs ?? []).map((log) => (
                  <li key={log.id} className="flex gap-2">
                    <span className="tabular shrink-0 text-muted-foreground">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                    <span
                      className={cn(
                        log.level === "error" && "text-loss",
                        log.level === "warn" && "text-amber-400",
                      )}
                    >
                      {log.message}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Trade history</h2>
          </div>
          {(d?.trades ?? []).length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No closed trades in {mode} mode yet.
            </p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left font-medium">Pair</th>
                    <th className="px-3 py-2 text-right font-medium">Entry</th>
                    <th className="px-3 py-2 text-right font-medium">Exit</th>
                    <th className="px-3 py-2 text-right font-medium">P&amp;L</th>
                    <th className="px-3 py-2 text-left font-medium">Reason</th>
                    <th className="px-3 py-2 text-right font-medium">Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {(d?.trades ?? []).map((t) => (
                    <tr key={t.id} className="border-b border-border/60">
                      <td className="px-4 py-2 font-medium">{t.symbol.replace("USDT", "/USDT")}</td>
                      <td className="tabular px-3 py-2 text-right">{t.entry_price.toFixed(6)}</td>
                      <td className="tabular px-3 py-2 text-right">{(t.exit_price ?? 0).toFixed(6)}</td>
                      <td
                        className={cn(
                          "tabular px-3 py-2 text-right font-semibold",
                          (t.pnl_usdt ?? 0) >= 0 ? "text-profit" : "text-loss",
                        )}
                      >
                        {(t.pnl_usdt ?? 0) >= 0 ? "+" : ""}
                        {(t.pnl_usdt ?? 0).toFixed(2)}{" "}
                        <span className="text-xs font-normal">({(t.pnl_pct ?? 0).toFixed(2)}%)</span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {(t.exit_reason ?? "—").replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                        {t.closed_at ? new Date(t.closed_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
