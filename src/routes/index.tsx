import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Gauge, LineChart, ShieldCheck, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Momentum Desk — Crypto Volume Breakout Trading Bot" },
      {
        name: "description",
        content:
          "Automated momentum and volume-breakout trading for crypto: real-time scanner, 1–5% take-profit targets, stop-loss protection, live P&L and paper trading.",
      },
      { property: "og:title", content: "Momentum Desk — Crypto Volume Breakout Trading Bot" },
      {
        property: "og:description",
        content:
          "Scan for volume spikes, auto-trigger orders with 1–5% take-profit and stop-loss, and track live P&L in paper or live mode.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Zap,
    title: "Volume spike scanner",
    body: "Every watched pair is measured against its own recent volume and highs, so breakouts surface the moment they form.",
  },
  {
    icon: Gauge,
    title: "1–5% profit targets",
    body: "Set your take-profit and stop-loss once. Every entry arms both exits automatically.",
  },
  {
    icon: LineChart,
    title: "Live P&L and charts",
    body: "Candlestick charts with volume, open positions marked to market, and performance analytics per day.",
  },
  {
    icon: ShieldCheck,
    title: "Paper first, live when ready",
    body: "Trade simulated until you connect exchange keys. A daily loss limit stops the bot before a bad day compounds.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Activity className="size-4" />
          </span>
          <span className="text-sm font-semibold">Momentum Desk</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">
          Momentum · Volume breakout
        </p>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          An automated desk for catching crypto breakouts
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground">
          Scan the market for volume spikes, trigger orders with your own take-profit and stop-loss
          rules, and track every position's profit and loss as it moves — in paper mode or on your own
          exchange account.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Open the desk</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-card p-6">
            <f.icon className="size-5 text-primary" />
            <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Trading crypto carries risk. Targets are goals, not guarantees.
      </footer>
    </div>
  );
}
