import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FileText, TrendingUp, Calendar, User, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SavedRep } from "@/hooks/useSavedReps";
import type { Bill } from "@/hooks/useBills";
import type { CongressTrade } from "@/hooks/useCongressTrades";
import type { TimelineEvent } from "@/hooks/useAccountabilityTimeline";

// ── Feed item types ──

interface FeedItem {
  id: string;
  type: "bill" | "trade" | "timeline";
  date: string;
  repName: string;
  title: string;
  subtitle?: string;
  link?: string;
}

// ── Props ──

interface ActivityFeedProps {
  savedReps: SavedRep[];
}

// ── Helpers ──

/** Cap reps to avoid blasting the API */
const MAX_REPS = 10;

function feedIcon(type: FeedItem["type"]) {
  switch (type) {
    case "bill":
      return <FileText className="h-4 w-4 text-blue-500" />;
    case "trade":
      return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    case "timeline":
      return <Calendar className="h-4 w-4 text-amber-500" />;
  }
}

function feedLabel(type: FeedItem["type"]) {
  switch (type) {
    case "bill":
      return "Bill";
    case "trade":
      return "Trade";
    case "timeline":
      return "Event";
  }
}

function feedLabelColor(type: FeedItem["type"]) {
  switch (type) {
    case "bill":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "trade":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "timeline":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
}

// ── Component ──

export function ActivityFeed({ savedReps }: ActivityFeedProps) {
  // Only process federal reps (they have bioguideId or can be looked up by name)
  const federalReps = useMemo(
    () => savedReps.filter((r) => r.level === "federal").slice(0, MAX_REPS),
    [savedReps],
  );

  const bioguideIds = useMemo(
    () => federalReps.map((r) => r.bioguideId).filter(Boolean) as string[],
    [federalReps],
  );

  const repNames = useMemo(() => federalReps.map((r) => r.name), [federalReps]);

  // ── Bills query: fetch sponsored bills for each bioguideId ──
  const billsQuery = useQuery({
    queryKey: ["feed-bills", ...bioguideIds.sort()],
    queryFn: async () => {
      const results = await Promise.all(
        bioguideIds.map(async (bioguideId) => {
          const rep = federalReps.find((r) => r.bioguideId === bioguideId);
          try {
            const { data, error } = await supabase.functions.invoke("fetch-bills", {
              body: { bioguideId, level: "federal" },
            });
            if (error || !data?.success) return [];
            return ((data.bills || []) as Bill[]).map((bill) => ({
              id: `bill-${bill.id}`,
              type: "bill" as const,
              date: bill.latestActionDate || bill.dateIntroduced || "",
              repName: rep?.name || "Unknown",
              title: `${bill.billNumber}: ${bill.title}`,
              subtitle: bill.status,
              link: `/bills/${encodeURIComponent(bill.id)}?jurisdiction=${encodeURIComponent(rep?.jurisdiction || "United States")}`,
            }));
          } catch {
            return [];
          }
        }),
      );
      return results.flat();
    },
    enabled: bioguideIds.length > 0,
    staleTime: 1000 * 60 * 10,
  });

  // ── Trades query: single fetch, then filter client-side ──
  const tradesQuery = useQuery({
    queryKey: ["feed-trades", ...repNames.sort()],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("fetch-congress-trades", {
          body: {},
        });
        if (error || !data?.success) return [];
        const trades = (data.trades || []) as CongressTrade[];
        // Filter to saved reps by fuzzy name match (last name)
        const lastNames = repNames.map((n) => {
          const parts = n.split(/\s+/);
          return parts[parts.length - 1].toLowerCase();
        });
        return trades
          .filter((t) => {
            const tradeLast = t.politician.split(/\s+/).pop()?.toLowerCase() || "";
            return lastNames.includes(tradeLast);
          })
          .map((t) => ({
            id: `trade-${t.politician}-${t.transactionDate}-${t.ticker}`,
            type: "trade" as const,
            date: t.disclosureDate || t.transactionDate || "",
            repName: t.politician,
            title: `${t.type} ${t.ticker || t.assetDescription}`,
            subtitle: `${t.amount} — ${t.assetDescription}`,
            link: "/congress-trades",
          }));
      } catch {
        return [];
      }
    },
    enabled: repNames.length > 0,
    staleTime: 1000 * 60 * 10,
  });

  // ── Timeline query: fetch for each federal rep ──
  const timelineQuery = useQuery({
    queryKey: ["feed-timeline", ...repNames.sort()],
    queryFn: async () => {
      const results = await Promise.all(
        federalReps.map(async (rep) => {
          try {
            const chamber = rep.office.toLowerCase().includes("senator")
              ? "Senate"
              : rep.office.toLowerCase().includes("representative")
                ? "Assembly"
                : undefined;
            const { data, error } = await supabase.functions.invoke("fetch-politician-timeline", {
              body: { legislatorName: rep.name, chamber, jurisdiction: rep.jurisdiction },
            });
            if (error || !data?.success) return [];
            return ((data.events || []) as TimelineEvent[]).map((evt) => ({
              id: `timeline-${rep.name}-${evt.id}`,
              type: "timeline" as const,
              date: evt.date,
              repName: rep.name,
              title: evt.title,
              subtitle: evt.description,
            }));
          } catch {
            return [];
          }
        }),
      );
      return results.flat();
    },
    enabled: federalReps.length > 0,
    staleTime: 1000 * 60 * 10,
  });

  // ── Merge and sort ──
  const isLoading = billsQuery.isLoading || tradesQuery.isLoading || timelineQuery.isLoading;

  const feedItems = useMemo(() => {
    const all: FeedItem[] = [
      ...(billsQuery.data || []),
      ...(tradesQuery.data || []),
      ...(timelineQuery.data || []),
    ];
    // Sort by date descending, take top 50
    return all
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50);
  }, [billsQuery.data, tradesQuery.data, timelineQuery.data]);

  // ── Empty state ──
  if (savedReps.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <User className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Save some representatives to see their recent activity here.
        </p>
        <Link
          to="/politicians"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Browse politicians
        </Link>
      </div>
    );
  }

  if (federalReps.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Inbox className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Activity feed is available for federal representatives. Save some federal reps to get started.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 py-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Inbox className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No recent activity found for your saved representatives.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Showing {feedItems.length} items from {federalReps.length} federal rep{federalReps.length !== 1 ? "s" : ""}
      </p>
      <div className="flex flex-col gap-2">
        {feedItems.map((item) => {
          const content = (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-surface-hover">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/50">
                {feedIcon(item.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    {item.repName}
                  </Badge>
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${feedLabelColor(item.type)}`}>
                    {feedLabel(item.type)}
                  </span>
                </div>
                <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    {item.subtitle}
                  </p>
                )}
                <time className="mt-1 block text-[11px] text-muted-foreground/70">
                  {new Date(item.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </div>
            </div>
          );

          return item.link ? (
            <Link key={item.id} to={item.link} className="block">
              {content}
            </Link>
          ) : (
            <div key={item.id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
