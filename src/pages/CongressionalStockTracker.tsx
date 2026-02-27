import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Search,
  Loader2,
  DollarSign,
  BarChart3,
  Users,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { Input } from "@/components/ui/input";
import { useCongressTrades, type CongressTrade } from "@/hooks/useCongressTrades";

type Chamber = "" | "house" | "senate";
type TradeType = "" | "purchase" | "sale";

const PAGE_SIZE = 50;

export default function CongressionalStockTracker() {
  const [chamber, setChamber] = useState<Chamber>("");
  const [tradeType, setTradeType] = useState<TradeType>("");
  const [searchPolitician, setSearchPolitician] = useState("");
  const [searchTicker, setSearchTicker] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useCongressTrades({
    chamber: chamber || undefined,
    politician: searchPolitician || undefined,
    ticker: searchTicker || undefined,
    type: tradeType || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-headline sm:text-4xl">
              Congressional Stock Tracker
            </h1>
            <p className="mt-2 font-body text-sm text-muted-foreground max-w-2xl">
              Track stock trades disclosed by members of Congress under the STOCK Act.
              Data sourced from official House and Senate financial disclosure filings.
            </p>
          </div>

          {/* Summary stats */}
          {data && !isLoading && (
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={BarChart3} label="Total Trades" value={data.total.toLocaleString()} />
              <StatCard
                icon={TrendingUp}
                label="Purchases"
                value={data.purchaseCount.toLocaleString()}
                accent="text-[hsl(142,71%,45%)]"
              />
              <StatCard
                icon={TrendingDown}
                label="Sales"
                value={data.saleCount.toLocaleString()}
                accent="text-destructive"
              />
              <StatCard
                icon={Users}
                label="Top Traders"
                value={data.topTraders.length.toString()}
              />
            </div>
          )}

          {/* Top traders & tickers */}
          {data && !isLoading && (
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              {/* Top traders */}
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 font-display text-sm font-bold text-headline flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Most Active Traders
                </h3>
                <div className="space-y-2">
                  {data.topTraders.slice(0, 5).map((t, i) => (
                    <div key={t.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-elevated font-mono text-[10px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <button
                          onClick={() => { setSearchPolitician(t.name); setPage(0); }}
                          className="font-body text-xs font-medium text-foreground hover:text-primary transition-colors text-left"
                        >
                          {t.name}
                        </button>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{t.tradeCount} trades</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top tickers */}
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 font-display text-sm font-bold text-headline flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Most Traded Tickers
                </h3>
                <div className="space-y-2">
                  {data.topTickers.slice(0, 5).map((t, i) => (
                    <div key={t.symbol} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-elevated font-mono text-[10px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <button
                          onClick={() => { setSearchTicker(t.symbol); setPage(0); }}
                          className="font-mono text-xs font-bold text-foreground hover:text-primary transition-colors"
                        >
                          {t.symbol}
                        </button>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{t.tradeCount} trades</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search politician…"
                value={searchPolitician}
                onChange={(e) => { setSearchPolitician(e.target.value); setPage(0); }}
                className="pl-9 font-body text-sm"
              />
            </div>
            <div className="relative w-full sm:w-40">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ticker (e.g. AAPL)"
                value={searchTicker}
                onChange={(e) => { setSearchTicker(e.target.value.toUpperCase()); setPage(0); }}
                className="pl-9 font-mono text-sm uppercase"
              />
            </div>

            {/* Chamber pills */}
            <div className="flex gap-1.5">
              {([["", "All"], ["house", "House"], ["senate", "Senate"]] as [Chamber, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { setChamber(val); setPage(0); }}
                  className={`rounded-lg px-3 py-1.5 font-body text-xs font-medium transition-colors ${
                    chamber === val
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-elevated text-muted-foreground hover:bg-surface-hover"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Trade type pills */}
            <div className="flex gap-1.5">
              {([["", "All"], ["purchase", "Buy"], ["sale", "Sell"]] as [TradeType, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { setTradeType(val); setPage(0); }}
                  className={`rounded-lg px-3 py-1.5 font-body text-xs font-medium transition-colors ${
                    tradeType === val
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-elevated text-muted-foreground hover:bg-surface-hover"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="font-body text-sm text-muted-foreground">Loading congressional trades…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
              <p className="font-body text-sm text-destructive">
                {error instanceof Error ? error.message : "Failed to load trades"}
              </p>
            </div>
          )}

          {/* Trade cards */}
          {data && !isLoading && (
            <>
              <div className="space-y-3">
                {data.trades.length === 0 ? (
                  <p className="py-12 text-center font-body text-sm text-muted-foreground">
                    No trades match your filters.
                  </p>
                ) : (
                  data.trades.map((trade, i) => (
                    <TradeCard key={`${trade.politician}-${trade.transactionDate}-${trade.ticker}-${i}`} trade={trade} />
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 font-body text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-hover disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <span className="font-mono text-xs text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 font-body text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-hover disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${accent || "text-primary"}`} />
        <p className="font-body text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={`mt-1 font-display text-2xl font-bold ${accent || "text-headline"}`}>{value}</p>
    </div>
  );
}

function TradeCard({ trade }: { trade: CongressTrade }) {
  const isPurchase = trade.type?.toLowerCase().includes("purchase");
  const isSale = trade.type?.toLowerCase().includes("sale");

  const partyColor =
    trade.party === "Democrat" || trade.party === "D"
      ? "text-[hsl(210,80%,55%)]"
      : trade.party === "Republican" || trade.party === "R"
        ? "text-primary"
        : "text-muted-foreground";

  return (
    <div className="group rounded-xl border border-border bg-card p-4 transition-colors hover:bg-surface-hover">
      <div className="flex items-start gap-4">
        {/* Trade type indicator */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            isPurchase
              ? "bg-[hsl(142,71%,45%)]/10"
              : isSale
                ? "bg-destructive/10"
                : "bg-surface-elevated"
          }`}
        >
          {isPurchase ? (
            <TrendingUp className="h-5 w-5 text-[hsl(142,71%,45%)]" />
          ) : isSale ? (
            <TrendingDown className="h-5 w-5 text-destructive" />
          ) : (
            <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-body text-sm font-medium text-foreground">{trade.politician}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`font-body text-xs font-semibold ${partyColor}`}>
                  {trade.party === "D" ? "Democrat" : trade.party === "R" ? "Republican" : trade.party || "Unknown"}
                </span>
                {trade.state && (
                  <span className="font-body text-xs text-muted-foreground">
                    {trade.state}{trade.district ? `-${trade.district}` : ""}
                  </span>
                )}
                <span className="rounded-md bg-surface-elevated px-1.5 py-0.5 font-body text-[10px] text-muted-foreground">
                  {trade.chamber}
                </span>
              </div>
            </div>

            {/* Ticker badge */}
            {trade.ticker && trade.ticker !== "--" && (
              <span className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-sm font-bold text-primary">
                ${trade.ticker}
              </span>
            )}
          </div>

          <p className="mt-1.5 font-body text-xs text-muted-foreground line-clamp-1">
            {trade.assetDescription}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-md px-2 py-0.5 font-body text-[11px] font-medium ${
                isPurchase
                  ? "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]"
                  : isSale
                    ? "bg-destructive/10 text-destructive"
                    : "bg-surface-elevated text-muted-foreground"
              }`}
            >
              {trade.type}
            </span>

            <span className="font-body text-[11px] text-muted-foreground">
              Amount: {trade.amount}
            </span>

            {trade.transactionDate && (
              <span className="font-body text-[11px] text-muted-foreground">
                Traded: {new Date(trade.transactionDate).toLocaleDateString()}
              </span>
            )}

            {trade.disclosureDate && (
              <span className="font-body text-[11px] text-muted-foreground">
                Disclosed: {new Date(trade.disclosureDate).toLocaleDateString()}
              </span>
            )}

            {trade.owner && trade.owner !== "--" && (
              <span className="font-body text-[11px] text-muted-foreground">
                Owner: {trade.owner}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
