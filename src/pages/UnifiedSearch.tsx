import { useState, useEffect, useRef } from "react";
import SiteNav from "@/components/SiteNav";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  ArrowLeft,
  FileText,
  Scale,
  Briefcase,
  Landmark,
  Newspaper,
  Loader2,
  ExternalLink,
  AlertCircle,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useUnifiedSearch,
  SOURCE_LABELS,
  type SearchSource,
  type SearchResult,
} from "@/hooks/useUnifiedSearch";

const sourceConfig: Record<SearchSource, { icon: typeof FileText; color: string }> = {
  bills: { icon: FileText, color: "bg-blue-500/20 text-blue-400" },
  court_cases: { icon: Scale, color: "bg-amber-500/20 text-amber-400" },
  lobbying: { icon: Briefcase, color: "bg-purple-500/20 text-purple-400" },
  federal_register: { icon: Landmark, color: "bg-emerald-500/20 text-emerald-400" },
  news: { icon: Newspaper, color: "bg-rose-500/20 text-rose-400" },
};

const ALL_SOURCES: SearchSource[] = ["bills", "court_cases", "lobbying", "federal_register", "news"];

const UnifiedSearch = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<SearchSource | "all">("all");
  const { data, isLoading, error, search, clear } = useUnifiedSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  // Run search on mount if query param exists
  useEffect(() => {
    if (initialQuery) {
      search(initialQuery);
    }
    // Focus input on mount
    inputRef.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    if (query.trim().length < 2) return;
    setSearchParams({ q: query.trim() });
    search(query.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClear = () => {
    setQuery("");
    setSearchParams({});
    clear();
    inputRef.current?.focus();
  };

  // Build flat results list, optionally filtered
  const allResults: { source: SearchSource; item: SearchResult }[] = [];
  if (data) {
    for (const src of ALL_SOURCES) {
      if (activeFilter !== "all" && activeFilter !== src) continue;
      for (const item of data.results[src] || []) {
        allResults.push({ source: src, item });
      }
    }
  }

  // Sort by date descending
  allResults.sort((a, b) => (b.item.date || "").localeCompare(a.item.date || ""));

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <header className="gradient-hero border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4">
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-1.5 font-body text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Search className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-headline">
                Search Everything
              </h1>
            </div>
            <p className="mt-2 max-w-xl font-body text-sm text-tertiary">
              Search across bills, court cases, lobbying filings, federal register documents, and news — all at once.
            </p>

            {/* Search bar */}
            <div className="mt-6 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search bills, cases, lobbying filings, regulations, news…"
                  className="pl-9 pr-9 py-3 text-base"
                />
                {query && (
                  <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button onClick={handleSearch} disabled={isLoading || query.trim().length < 2} size="lg">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Source filter chips */}
        {data && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => setActiveFilter("all")}
              className={`rounded-lg px-3 py-1.5 font-body text-xs font-medium transition-colors ${
                activeFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-elevated text-muted-foreground hover:bg-surface-hover"
              }`}
            >
              All ({data.totalResults})
            </button>
            {ALL_SOURCES.map((src) => {
              const count = data.counts[src] || 0;
              if (count === 0) return null;
              const config = sourceConfig[src];
              const Icon = config.icon;
              return (
                <button
                  key={src}
                  onClick={() => setActiveFilter(src)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-body text-xs font-medium transition-colors ${
                    activeFilter === src
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-elevated text-muted-foreground hover:bg-surface-hover"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {SOURCE_LABELS[src]} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 font-body text-sm text-muted-foreground">
              Searching across {ALL_SOURCES.length} data sources…
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <p className="font-body text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {/* No query yet */}
        {!data && !isLoading && !error && (
          <div className="flex flex-col items-center py-20">
            <Search className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 font-body text-sm text-muted-foreground">
              Enter a search term to search across all data sources
            </p>
          </div>
        )}

        {/* Results */}
        {data && !isLoading && (
          <>
            <p className="mb-4 font-body text-xs text-muted-foreground">
              {allResults.length} result{allResults.length !== 1 ? "s" : ""} for "{data.query}"
            </p>

            {allResults.length === 0 && (
              <div className="flex flex-col items-center py-16">
                <Search className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 font-body text-sm text-muted-foreground">
                  No results found. Try a different search term.
                </p>
              </div>
            )}

            <div className="grid gap-3">
              <AnimatePresence mode="popLayout">
                {allResults.map(({ source, item }, idx) => (
                  <ResultCard key={`${source}-${item.id}`} source={source} item={item} index={idx} />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

function ResultCard({ source, item, index }: { source: SearchSource; item: SearchResult; index: number }) {
  const config = sourceConfig[source];
  const Icon = config.icon;

  const formattedDate = item.date
    ? new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <motion.a
      href={item.url || "#"}
      target={item.url ? "_blank" : undefined}
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-surface-hover"
    >
      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
            {SOURCE_LABELS[source]}
          </Badge>
          {formattedDate && (
            <span className="font-body text-[10px] text-muted-foreground">{formattedDate}</span>
          )}
          {/* Source-specific meta badges */}
          {source === "bills" && item.meta?.chamber && (
            <Badge variant="secondary" className="text-[9px]">{item.meta.chamber}</Badge>
          )}
          {source === "federal_register" && item.meta?.type && (
            <Badge variant="secondary" className="text-[9px]">{item.meta.type}</Badge>
          )}
          {source === "lobbying" && item.meta?.amount && (
            <Badge variant="secondary" className="text-[9px]">
              ${Number(item.meta.amount).toLocaleString()}
            </Badge>
          )}
        </div>
        <p className="mt-1 font-display text-sm font-bold text-headline line-clamp-2">
          {item.title}
        </p>
        {item.description && (
          <p className="mt-1 font-body text-xs text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        )}
        {source === "news" && item.meta?.source && (
          <p className="mt-1 font-body text-[10px] text-muted-foreground/70">{item.meta.source}</p>
        )}
      </div>
      {item.url && (
        <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </motion.a>
  );
}

export default UnifiedSearch;
