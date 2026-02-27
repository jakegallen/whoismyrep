import { useState, useMemo } from "react";
import { ExternalLink, TrendingUp, TrendingDown, Filter, ArrowUpDown, Loader2, Search } from "lucide-react";
import { usePolymarket, type PolymarketMarket } from "@/hooks/usePolymarket";
import { useKalshi, type KalshiMarket } from "@/hooks/useKalshi";
import { Input } from "@/components/ui/input";

interface UnifiedMarket {
  id: string;
  question: string;
  eventTitle: string | null;
  yesPercent: number | null;
  noPercent: number | null;
  volume: number;
  volumeFormatted: string;
  url: string | null;
  endDate: string | null;
  source: "polymarket" | "kalshi";
}

type SortField = "volume" | "yesPercent" | "endDate";
type SourceFilter = "all" | "polymarket" | "kalshi";

interface Props {
  politicianName: string;
  state?: string;
}

export default function PredictionMarketsTab({ politicianName, state }: Props) {
  const poly = usePolymarket(politicianName, state);
  const kalshi = useKalshi(politicianName, state);

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("volume");
  const [sortAsc, setSortAsc] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const isLoading = poly.isLoading || kalshi.isLoading;

  const allMarkets = useMemo(() => {
    const polyMarkets: UnifiedMarket[] = (poly.data || []).map((m) => ({
      id: m.id,
      question: m.question,
      eventTitle: m.eventTitle,
      yesPercent: m.yesPercent,
      noPercent: m.noPercent,
      volume: m.volume,
      volumeFormatted: m.volumeFormatted,
      url: m.url,
      endDate: m.endDate,
      source: "polymarket" as const,
    }));
    const kalshiMarkets: UnifiedMarket[] = (kalshi.data || []).map((m) => ({
      id: m.id,
      question: m.question,
      eventTitle: m.eventTitle,
      yesPercent: m.yesPercent,
      noPercent: m.noPercent,
      volume: m.volume,
      volumeFormatted: m.volumeFormatted,
      url: m.url,
      endDate: m.endDate,
      source: "kalshi" as const,
    }));
    return [...polyMarkets, ...kalshiMarkets];
  }, [poly.data, kalshi.data]);

  const filtered = useMemo(() => {
    let list = allMarkets;

    // Source filter
    if (sourceFilter !== "all") {
      list = list.filter((m) => m.source === sourceFilter);
    }

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.question.toLowerCase().includes(q) ||
          (m.eventTitle || "").toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "volume") {
        cmp = a.volume - b.volume;
      } else if (sortField === "yesPercent") {
        cmp = (a.yesPercent ?? -1) - (b.yesPercent ?? -1);
      } else if (sortField === "endDate") {
        const da = a.endDate ? new Date(a.endDate).getTime() : 0;
        const db = b.endDate ? new Date(b.endDate).getTime() : 0;
        cmp = da - db;
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [allMarkets, sourceFilter, search, sortField, sortAsc]);

  const polyCount = allMarkets.filter((m) => m.source === "polymarket").length;
  const kalshiCount = allMarkets.filter((m) => m.source === "kalshi").length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="font-body text-sm text-muted-foreground">Loading prediction markets…</p>
      </div>
    );
  }

  if (allMarkets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
        <p className="font-body text-sm text-muted-foreground">
          No active prediction markets found for {politicianName}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <StatCard label="Total Markets" value={allMarkets.length.toString()} />
        <StatCard label="Polymarket" value={polyCount.toString()} accent="text-[hsl(280,60%,55%)]" />
        <StatCard label="Kalshi" value={kalshiCount.toString()} accent="text-[hsl(210,80%,55%)]" />
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search markets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-body text-sm"
          />
        </div>

        <div className="flex gap-2">
          {/* Source filter pills */}
          {(["all", "polymarket", "kalshi"] as SourceFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`rounded-lg px-3 py-1.5 font-body text-xs font-medium transition-colors ${
                sourceFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-elevated text-muted-foreground hover:bg-surface-hover"
              }`}
            >
              {s === "all" ? "All" : s === "polymarket" ? "Polymarket" : "Kalshi"}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-1.5">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 font-body text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="volume">Volume</option>
            <option value="yesPercent">Yes %</option>
            <option value="endDate">End Date</option>
          </select>
          <button
            onClick={() => setSortAsc((v) => !v)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            aria-label={sortAsc ? "Sort descending" : "Sort ascending"}
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Markets list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="py-8 text-center font-body text-sm text-muted-foreground">
            No markets match your filters.
          </p>
        ) : (
          filtered.map((m) => <MarketCard key={`${m.source}-${m.id}`} market={m} />)
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex-1 min-w-[120px] rounded-xl border border-border bg-card p-4">
      <p className="font-body text-xs text-muted-foreground">{label}</p>
      <p className={`font-display text-2xl font-bold ${accent || "text-headline"}`}>{value}</p>
    </div>
  );
}

function MarketCard({ market }: { market: UnifiedMarket }) {
  const yesPercent = market.yesPercent;
  const isHigh = yesPercent !== null && yesPercent >= 60;
  const isLow = yesPercent !== null && yesPercent <= 30;

  return (
    <a
      href={market.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-surface-hover"
    >
      <div className="flex items-start gap-4">
        {/* Probability ring */}
        <div className="flex flex-col items-center gap-1">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] ${
              isHigh
                ? "border-[hsl(217,72%,48%)]"
                : isLow
                  ? "border-destructive"
                  : "border-muted-foreground/30"
            }`}
          >
            <span
              className={`font-mono text-lg font-bold ${
                isHigh
                  ? "text-[hsl(217,72%,48%)]"
                  : isLow
                    ? "text-destructive"
                    : "text-foreground"
              }`}
            >
              {yesPercent !== null ? `${yesPercent}` : "–"}
            </span>
          </div>
          <span className="font-body text-[10px] text-muted-foreground">
            {yesPercent !== null ? "Yes %" : "N/A"}
          </span>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-body text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {market.question}
            </p>
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>

          {market.eventTitle && (
            <p className="mt-0.5 font-body text-xs text-muted-foreground line-clamp-1">
              {market.eventTitle}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            {/* Yes/No bars */}
            {yesPercent !== null && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[hsl(217,72%,48%)]"
                    style={{ width: `${yesPercent}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {market.noPercent !== null ? `${market.noPercent}% No` : ""}
                </span>
              </div>
            )}

            <span className="font-body text-[11px] text-muted-foreground">
              Vol: {market.volumeFormatted}
            </span>

            {market.endDate && (
              <span className="font-body text-[11px] text-muted-foreground">
                Ends: {new Date(market.endDate).toLocaleDateString()}
              </span>
            )}

            <span
              className={`ml-auto rounded-md px-2 py-0.5 font-body text-[10px] font-medium ${
                market.source === "polymarket"
                  ? "bg-[hsl(280,60%,55%)]/10 text-[hsl(280,60%,55%)]"
                  : "bg-[hsl(210,80%,55%)]/10 text-[hsl(210,80%,55%)]"
              }`}
            >
              {market.source === "polymarket" ? "Polymarket" : "Kalshi"}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
