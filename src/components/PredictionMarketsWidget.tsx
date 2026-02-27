import { ExternalLink, TrendingUp, Loader2 } from "lucide-react";
import { usePolymarket, type PolymarketMarket } from "@/hooks/usePolymarket";
import { useKalshi, type KalshiMarket } from "@/hooks/useKalshi";

interface UnifiedMarket {
  id: string;
  question: string;
  yesPercent: number | null;
  noPercent: number | null;
  volumeFormatted: string;
  volume: number;
  url: string | null;
  source: "polymarket" | "kalshi";
}

interface Props {
  politicianName: string;
  state?: string;
}

export default function PredictionMarketsWidget({ politicianName, state }: Props) {
  const poly = usePolymarket(politicianName, state);
  const kalshi = useKalshi(politicianName, state);

  const isLoading = poly.isLoading || kalshi.isLoading;
  const polyMarkets: UnifiedMarket[] = (poly.data || []).map((m) => ({
    id: m.id,
    question: m.question,
    yesPercent: m.yesPercent,
    noPercent: m.noPercent,
    volumeFormatted: m.volumeFormatted,
    volume: m.volume,
    url: m.url,
    source: "polymarket" as const,
  }));
  const kalshiMarkets: UnifiedMarket[] = (kalshi.data || []).map((m) => ({
    id: m.id,
    question: m.question,
    yesPercent: m.yesPercent,
    noPercent: m.noPercent,
    volumeFormatted: m.volumeFormatted,
    volume: m.volume,
    url: m.url,
    source: "kalshi" as const,
  }));

  const allMarkets = [...polyMarkets, ...kalshiMarkets].sort((a, b) => b.volume - a.volume);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="font-body text-xs text-muted-foreground">Loading prediction markets…</span>
      </div>
    );
  }

  if (allMarkets.length === 0) return null;

  const top = allMarkets.slice(0, 3);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-bold text-headline">Prediction Markets</h3>
      </div>

      <div className="space-y-2">
        {top.map((m) => (
          <MarketRow key={`${m.source}-${m.id}`} market={m} />
        ))}
      </div>

      {allMarkets.length > 3 && (
        <p className="text-center font-body text-[11px] text-muted-foreground">
          +{allMarkets.length - 3} more markets
        </p>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: "polymarket" | "kalshi" }) {
  return (
    <span className="shrink-0 rounded-md bg-surface-elevated px-1.5 py-0.5 font-body text-[10px] text-muted-foreground capitalize">
      {source === "polymarket" ? "Polymarket" : "Kalshi"}
    </span>
  );
}

function MarketRow({ market }: { market: UnifiedMarket }) {
  const yesColor =
    market.yesPercent !== null && market.yesPercent >= 60
      ? "text-[hsl(217,72%,48%)]"
      : market.yesPercent !== null && market.yesPercent <= 30
        ? "text-destructive"
        : "text-foreground";

  return (
    <a
      href={market.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-surface-hover"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="font-body text-xs font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors flex-1">
            {market.question}
          </p>
          <SourceBadge source={market.source} />
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          {market.yesPercent !== null && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-[hsl(217,72%,48%)]" />
              <span className={`font-mono text-xs font-bold ${yesColor}`}>
                {market.yesPercent}%
              </span>
              <span className="font-body text-[10px] text-muted-foreground">Yes</span>
            </div>
          )}
          {market.noPercent !== null && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <span className="font-mono text-xs font-bold text-muted-foreground">
                {market.noPercent}%
              </span>
              <span className="font-body text-[10px] text-muted-foreground">No</span>
            </div>
          )}
          <span className="ml-auto font-body text-[10px] text-muted-foreground">
            Vol: {market.volumeFormatted}
          </span>
        </div>
      </div>
      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}
