import { ExternalLink, TrendingUp, Loader2 } from "lucide-react";
import { usePolymarket, type PolymarketMarket } from "@/hooks/usePolymarket";

interface Props {
  politicianName: string;
}

export default function PolymarketWidget({ politicianName }: Props) {
  const { data: markets, isLoading, error } = usePolymarket(politicianName);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="font-body text-xs text-muted-foreground">Loading prediction markets…</span>
      </div>
    );
  }

  if (error || !markets || markets.length === 0) return null;

  const top = markets.slice(0, 1);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-bold text-headline">Prediction Markets</h3>
        <span className="ml-auto rounded-md bg-surface-elevated px-1.5 py-0.5 font-body text-[10px] text-muted-foreground">
          Polymarket
        </span>
      </div>

      <div className="space-y-2">
        {top.map((m) => (
          <MarketRow key={m.id} market={m} />
        ))}
      </div>

      {markets.length > 1 && (
        <p className="text-center font-body text-[11px] text-muted-foreground">
          +{markets.length - 1} more markets
        </p>
      )}
    </div>
  );
}

function MarketRow({ market }: { market: PolymarketMarket }) {
  const yesColor =
    market.yesPercent !== null && market.yesPercent >= 60
      ? "text-[hsl(142,71%,45%)]"
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
        <p className="font-body text-xs font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {market.question}
        </p>
        <div className="mt-1.5 flex items-center gap-3">
          {market.yesPercent !== null && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-[hsl(142,71%,45%)]" />
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
