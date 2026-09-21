import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  getOverview,
  removeCredentials,
  saveCredentials,
  saveSettings,
  type BotSettings,
} from "@/lib/trading.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Strategy & keys — Momentum Desk" },
      {
        name: "description",
        content:
          "Tune take-profit, stop-loss and breakout rules, and manage your encrypted exchange keys.",
      },
      { property: "og:title", content: "Strategy & keys — Momentum Desk" },
      {
        property: "og:description",
        content: "Tune your trading rules and manage encrypted exchange keys.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 border-b border-border/60 py-4 last:border-0">
      <div>
        <Label className="text-sm">{label}</Label>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function SliderRow({
  label,
  hint,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  hint?: string | undefined;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <Row label={label} hint={hint}>
      <div className="flex items-center gap-4">
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]) => onChange(v ?? value)}
          className="flex-1"
        />
        <span className="tabular w-24 text-right text-sm">
          {value}
          {suffix}
        </span>
      </div>
    </Row>
  );
}

function SettingsPage() {
  const queryClient = useQueryClient();
  const overviewFn = useServerFn(getOverview);
  const saveSettingsFn = useServerFn(saveSettings);
  const saveCredsFn = useServerFn(saveCredentials);
  const removeCredsFn = useServerFn(removeCredentials);

  const overview = useQuery({ queryKey: ["overview"], queryFn: () => overviewFn() });

  const [draft, setDraft] = useState<BotSettings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");

  useEffect(() => {
    if (overview.data?.settings && !draft) setDraft(overview.data.settings);
  }, [overview.data, draft]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["overview"] });
    queryClient.invalidateQueries({ queryKey: ["tick"] });
  };

  const save = useMutation({
    mutationFn: (patch: Partial<BotSettings>) => saveSettingsFn({ data: patch }),
    onSuccess: (s) => {
      setDraft(s);
      toast.success("Settings saved");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const storeKeys = useMutation({
    mutationFn: () => saveCredsFn({ data: { apiKey, apiSecret } }),
    onSuccess: () => {
      setApiKey("");
      setApiSecret("");
      toast.success("Exchange keys verified and stored securely");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dropKeys = useMutation({
    mutationFn: () => removeCredsFn(),
    onSuccess: () => {
      toast.success("Keys removed — back to paper trading");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const creds = overview.data?.credentials ?? null;

  if (!draft) {
    return (
      <AppShell>
        <p className="py-20 text-center text-sm text-muted-foreground">Loading your strategy…</p>
      </AppShell>
    );
  }

  const set = (patch: Partial<BotSettings>) => setDraft({ ...draft, ...patch });

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Strategy &amp; keys</h1>
          <p className="text-xs text-muted-foreground">
            Your rules drive every automatic entry and exit. Changes apply on the next scan.
          </p>
        </div>

        <section className="rounded-xl border border-border bg-card px-5 py-3">
          <h2 className="pt-2 text-sm font-semibold">Exchange connection</h2>
          {creds ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-profit" />
                <div>
                  <p className="text-sm font-medium capitalize">{creds.exchange} key {creds.keyHint}</p>
                  <p className="text-xs text-muted-foreground">
                    {creds.validated ? "Verified" : "Not verified"}
                    {creds.lastValidatedAt
                      ? ` · ${new Date(creds.lastValidatedAt).toLocaleString()}`
                      : ""}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => dropKeys.mutate()}
                disabled={dropKeys.isPending}
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            </div>
          ) : (
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                storeKeys.mutate();
              }}
            >
              <p className="text-xs text-muted-foreground">
                Keys are encrypted before storage and never shown back in full. Use a trade-only key with
                withdrawals disabled.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="api-key">API key</Label>
                  <Input
                    id="api-key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-secret">API secret</Label>
                  <Input
                    id="api-secret"
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>
              <Button type="submit" disabled={storeKeys.isPending || !apiKey || !apiSecret}>
                {storeKeys.isPending ? "Verifying…" : "Verify and save"}
              </Button>
            </form>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card px-5 py-3">
          <h2 className="pt-2 text-sm font-semibold">Trading mode</h2>
          <Row
            label="Live trading"
            hint={
              creds?.validated
                ? "Off means simulated fills at the market price. On sends real orders to your exchange account."
                : "Add verified exchange keys above to unlock live trading."
            }
          >
            <div className="flex items-center gap-3">
              <Switch
                checked={draft.mode === "live"}
                disabled={!creds?.validated}
                onCheckedChange={(checked) => {
                  const mode = checked ? "live" : "paper";
                  set({ mode });
                  save.mutate({ mode });
                }}
              />
              <Badge variant={draft.mode === "live" ? "destructive" : "secondary"}>
                {draft.mode === "live" ? "Live" : "Paper"}
              </Badge>
            </div>
          </Row>
          <Row label="Bot running" hint="Pause at any time; open positions keep their exits armed.">
            <Switch
              checked={draft.bot_enabled}
              onCheckedChange={(checked) => {
                set({ bot_enabled: checked });
                save.mutate({ bot_enabled: checked });
              }}
            />
          </Row>
        </section>

        <section className="rounded-xl border border-border bg-card px-5 py-3">
          <h2 className="pt-2 text-sm font-semibold">Exits</h2>
          <Row
            label="Let winners run (trailing profit)"
            hint="Instead of selling at a fixed target, the exit follows the price up and only sells when it gives back the amount below."
          >
            <div className="flex items-center gap-3">
              <Switch
                checked={draft.trailing_enabled}
                onCheckedChange={(checked) => {
                  set({ trailing_enabled: checked });
                  save.mutate({ trailing_enabled: checked });
                }}
              />
              <Badge variant={draft.trailing_enabled ? "default" : "secondary"}>
                {draft.trailing_enabled ? "Trailing" : "Fixed target"}
              </Badge>
            </div>
          </Row>
          {draft.trailing_enabled ? (
            <>
              <SliderRow
                label="Start trailing after"
                hint="Profit needed before the exit starts following the price up."
                value={draft.trail_activate_pct}
                min={0.2}
                max={5}
                step={0.1}
                suffix="%"
                onChange={(v) => set({ trail_activate_pct: Number(v.toFixed(1)) })}
              />
              <SliderRow
                label="Give back at most"
                hint="How far the price may fall from its best level before the trade is closed in profit."
                value={draft.trail_giveback_pct}
                min={0.1}
                max={5}
                step={0.1}
                suffix="%"
                onChange={(v) => set({ trail_giveback_pct: Number(v.toFixed(1)) })}
              />
            </>
          ) : (
            <SliderRow
              label="Take profit"
              hint="Target per trade. 1–5% keeps the daily goal realistic."
              value={draft.take_profit_pct}
              min={1}
              max={5}
              step={0.1}
              suffix="%"
              onChange={(v) => set({ take_profit_pct: Number(v.toFixed(1)) })}
            />
          )}
          <SliderRow
            label="Stop loss"
            hint="Maximum loss before the position is closed automatically."
            value={draft.stop_loss_pct}
            min={0.2}
            max={10}
            step={0.1}
            suffix="%"
            onChange={(v) => set({ stop_loss_pct: Number(v.toFixed(1)) })}
          />
        </section>

        <section className="rounded-xl border border-border bg-card px-5 py-3">
          <h2 className="pt-2 text-sm font-semibold">Entry rules</h2>
          <SliderRow
            label="Volume spike threshold"
            hint="How much bigger than its recent average a candle's volume must be."
            value={draft.volume_spike_threshold}
            min={1.1}
            max={10}
            step={0.1}
            suffix="×"
            onChange={(v) => set({ volume_spike_threshold: Number(v.toFixed(1)) })}
          />
          <SliderRow
            label="Breakout lookback"
            hint="Number of recent candles whose high price must be broken."
            value={draft.breakout_lookback}
            min={5}
            max={60}
            step={1}
            suffix=" candles"
            onChange={(v) => set({ breakout_lookback: Math.round(v) })}
          />
          <SliderRow
            label="Minimum momentum"
            hint="Required price move over the last few candles before entering."
            value={draft.min_momentum_pct}
            min={0}
            max={5}
            step={0.1}
            suffix="%"
            onChange={(v) => set({ min_momentum_pct: Number(v.toFixed(1)) })}
          />
          <Row
            label="Only buy in an uptrend"
            hint="Skips signals while the short-term trend is falling, where breakouts fail most often."
          >
            <Switch
              checked={draft.trend_filter_enabled}
              onCheckedChange={(checked) => {
                set({ trend_filter_enabled: checked });
                save.mutate({ trend_filter_enabled: checked });
              }}
            />
          </Row>
        </section>

        <section className="rounded-xl border border-border bg-card px-5 py-3">
          <h2 className="pt-2 text-sm font-semibold">Risk</h2>
          <Row label="Position size (USDT)" hint="Amount committed to each new trade.">
            <Input
              type="number"
              min={10}
              value={draft.position_size_usdt}
              onChange={(e) => set({ position_size_usdt: Number(e.target.value) })}
            />
          </Row>
          <Row label="Maximum open positions" hint="How many trades may run at the same time.">
            <Input
              type="number"
              min={1}
              max={20}
              value={draft.max_positions}
              onChange={(e) => set({ max_positions: Number(e.target.value) })}
            />
          </Row>
          <Row label="Daily loss limit (USDT)" hint="The bot stops itself once the day's loss reaches this.">
            <Input
              type="number"
              min={1}
              value={draft.daily_loss_limit_usdt}
              onChange={(e) => set({ daily_loss_limit_usdt: Number(e.target.value) })}
            />
          </Row>
          <Row label="Paper balance (USDT)" hint="Starting balance used for simulated trading and analytics.">
            <Input
              type="number"
              min={100}
              value={draft.paper_balance}
              onChange={(e) => set({ paper_balance: Number(e.target.value) })}
            />
          </Row>
        </section>

        <div className="flex justify-end gap-2 pb-10">
          <Button
            variant="outline"
            onClick={() => setDraft(overview.data?.settings ?? draft)}
            disabled={save.isPending}
          >
            Reset
          </Button>
          <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save strategy"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
