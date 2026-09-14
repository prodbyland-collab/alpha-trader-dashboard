import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Position } from "@/lib/trading.functions";

type Props = {
  positions: Position[];
  prices: Record<string, number>;
  onClose: (id: string) => void;
  closingId?: string | null;
};

export function PositionsTable({ positions, prices, onClose, closingId }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Open positions</h2>
        <p className="text-xs text-muted-foreground">
          Live profit and loss, with automatic take-profit and stop-loss exits armed.
        </p>
      </div>

      {positions.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          No open positions. The bot opens one when a pair passes all of your rules.
        </p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-medium">Pair</th>
                <th className="px-3 py-2 text-right font-medium">Entry</th>
                <th className="px-3 py-2 text-right font-medium">Now</th>
                <th className="px-3 py-2 text-right font-medium">Size</th>
                <th className="px-3 py-2 text-right font-medium">P&amp;L</th>
                <th className="px-3 py-2 text-right font-medium">TP / SL</th>
                <th className="px-3 py-2 text-right font-medium">Mode</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const current = prices[p.symbol] ?? p.entry_price;
                const pnl = (current - p.entry_price) * p.quantity;
                const pnlPct = ((current - p.entry_price) / p.entry_price) * 100;
                const toTp = ((p.take_profit_price - current) / current) * 100;
                const toSl = ((current - p.stop_loss_price) / current) * 100;
                return (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="px-4 py-3 font-medium">{p.symbol.replace("USDT", "/USDT")}</td>
                    <td className="tabular px-3 py-3 text-right">{p.entry_price.toFixed(6)}</td>
                    <td className="tabular px-3 py-3 text-right">{current.toFixed(6)}</td>
                    <td className="tabular px-3 py-3 text-right">{p.notional_usdt.toFixed(2)}</td>
                    <td
                      className={cn(
                        "tabular px-3 py-3 text-right font-semibold",
                        pnl >= 0 ? "text-profit" : "text-loss",
                      )}
                    >
                      {pnl >= 0 ? "+" : ""}
                      {pnl.toFixed(2)} <span className="text-xs font-normal">({pnlPct.toFixed(2)}%)</span>
                    </td>
                    <td className="tabular px-3 py-3 text-right text-xs text-muted-foreground">
                      +{toTp.toFixed(2)}% / −{toSl.toFixed(2)}%
                    </td>
                    <td className="px-3 py-3 text-right text-xs uppercase text-muted-foreground">
                      {p.mode}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={closingId === p.id}
                        onClick={() => onClose(p.id)}
                      >
                        {closingId === p.id ? "Closing…" : "Close"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
