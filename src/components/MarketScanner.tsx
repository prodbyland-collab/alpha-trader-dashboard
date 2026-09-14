import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import type { ScanRow } from "@/lib/strategy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatPrice(value: number) {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(3);
  return value.toFixed(6);
}

function formatVolume(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

type Props = {
  rows: ScanRow[];
  selected: string;
  onSelect: (symbol: string) => void;
  onAdd: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  busy?: boolean;
};

export function MarketScanner({ rows, selected, onSelect, onAdd, onRemove, busy }: Props) {
  const [draft, setDraft] = useState("");

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex-1">
          <h2 className="text-sm font-semibold">Market scanner</h2>
          <p className="text-xs text-muted-foreground">
            Volume spikes and breakouts across your watched pairs, refreshed continuously.
          </p>
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            onAdd(draft);
            setDraft("");
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add pair, e.g. ARBUSDT"
            className="h-8 w-44 text-xs uppercase"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={busy}>
            <Plus className="size-4" />
          </Button>
        </form>
      </div>

      <div className="max-h-[520px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left font-medium">Pair</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 text-right font-medium">24h</th>
              <th className="px-3 py-2 text-right font-medium">Vol ×avg</th>
              <th className="px-3 py-2 text-right font-medium">Momentum</th>
              <th className="px-3 py-2 text-left font-medium">Signals</th>
              <th className="px-3 py-2 text-right font-medium">Strength</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Scanning the market…
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.symbol}
                  onClick={() => onSelect(row.symbol)}
                  className={cn(
                    "cursor-pointer border-b border-border/60 transition-colors hover:bg-accent/50",
                    selected === row.symbol && "bg-accent/70",
                  )}
                >
                  <td className="px-4 py-2 font-medium">{row.symbol.replace("USDT", "/USDT")}</td>
                  <td className="tabular px-3 py-2 text-right">{formatPrice(row.price)}</td>
                  <td
                    className={cn(
                      "tabular px-3 py-2 text-right",
                      row.changePct >= 0 ? "text-profit" : "text-loss",
                    )}
                  >
                    {row.changePct.toFixed(2)}%
                  </td>
                  <td
                    className={cn(
                      "tabular px-3 py-2 text-right",
                      row.isVolumeSpike && "font-semibold text-primary",
                    )}
                  >
                    {row.volumeRatio.toFixed(2)}×
                  </td>
                  <td
                    className={cn(
                      "tabular px-3 py-2 text-right",
                      row.momentumPct >= 0 ? "text-profit" : "text-loss",
                    )}
                  >
                    {row.momentumPct.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {row.tags.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        row.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${row.strength}%` }}
                        />
                      </div>
                      <span className="tabular w-8 text-right text-xs">{row.strength}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      aria-label={`Remove ${row.symbol}`}
                      className="text-muted-foreground transition-colors hover:text-loss"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(row.symbol);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        Total 24h volume shown in USDT ·{" "}
        {rows.length > 0 ? `${formatVolume(rows.reduce((s, r) => s + r.quoteVolume, 0))} across ${rows.length} pairs` : "—"}
      </div>
    </div>
  );
}
