import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Vote,
  FileText,
  MessageSquare,
  DollarSign,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Heart,
  Repeat2,
  ExternalLink,
} from "lucide-react";
import { useAccountabilityTimeline, type TimelineEvent } from "@/hooks/useAccountabilityTimeline";
import { Skeleton } from "@/components/ui/skeleton";

interface AccountabilityTimelineProps {
  politicianName: string;
  chamber?: string;
  twitterHandle?: string;
  jurisdiction?: string;
}

const typeConfig: Record<
  TimelineEvent["type"],
  { icon: typeof Vote; label: string; color: string; bgColor: string }
> = {
  vote: {
    icon: Vote,
    label: "Vote",
    color: "text-[hsl(210,80%,55%)]",
    bgColor: "bg-[hsl(210,80%,55%)]/10",
  },
  bill: {
    icon: FileText,
    label: "Bill",
    color: "text-[hsl(142,71%,45%)]",
    bgColor: "bg-[hsl(142,71%,45%)]/10",
  },
  social: {
    icon: MessageSquare,
    label: "Social",
    color: "text-[hsl(280,60%,55%)]",
    bgColor: "bg-[hsl(280,60%,55%)]/10",
  },
  donation: {
    icon: DollarSign,
    label: "Finance",
    color: "text-[hsl(43,90%,55%)]",
    bgColor: "bg-[hsl(43,90%,55%)]/10",
  },
};

const AccountabilityTimeline = ({
  politicianName,
  chamber,
  twitterHandle,
  jurisdiction,
}: AccountabilityTimelineProps) => {
  const { data, isLoading, error } = useAccountabilityTimeline(
    politicianName,
    chamber,
    twitterHandle,
    jurisdiction
  );
  const [filter, setFilter] = useState<TimelineEvent["type"] | "all">("all");
  const [showAll, setShowAll] = useState(false);

  const allTypes: (TimelineEvent["type"] | "all")[] = ["all", "vote", "bill", "social", "donation"];

  const filteredEvents =
    data?.events.filter((e) => filter === "all" || e.type === filter) || [];
  const displayEvents = showAll ? filteredEvents : filteredEvents.slice(0, 15);

  return (
    <section>
      <h2 className="mb-4 font-display text-xl font-bold text-headline">
        Accountability Timeline
      </h2>
      <p className="font-body text-xs text-muted-foreground mb-4">
        Chronological view of votes, bill sponsorships, social media posts, and campaign activity.
      </p>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {allTypes.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-lg px-3 py-1.5 font-body text-xs font-medium transition-colors ${
              filter === t
                ? "bg-primary text-primary-foreground"
                : "bg-surface-elevated text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {t === "all" ? "All" : typeConfig[t].label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-body text-sm font-medium text-foreground">
              Couldn't load timeline
            </p>
            <p className="mt-1 font-body text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </div>
      )}

      {data && !isLoading && filteredEvents.length === 0 && (
        <p className="py-8 text-center font-body text-sm text-muted-foreground">
          No timeline events found for this filter.
        </p>
      )}

      {data && !isLoading && filteredEvents.length > 0 && (
        <>
          {/* Timeline */}
          <div className="relative ml-4 border-l-2 border-border pl-6 space-y-1">
            <AnimatePresence initial={false}>
              {displayEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                >
                  <TimelineItem event={event} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredEvents.length > 15 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-surface-elevated px-4 py-2 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover mx-auto"
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-4 w-4" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" /> Show all {filteredEvents.length} events
                </>
              )}
            </button>
          )}
        </>
      )}
    </section>
  );
};

function TimelineItem({ event }: { event: TimelineEvent }) {
  const config = typeConfig[event.type];
  const Icon = config.icon;

  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className="relative pb-4 group">
      {/* Dot on timeline */}
      <div
        className={`absolute -left-[33px] top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background ${config.bgColor}`}
      >
        <Icon className={`h-3 w-3 ${config.color}`} />
      </div>

      <div className="rounded-lg border border-border bg-card p-3 transition-colors group-hover:bg-surface-elevated">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className={`rounded px-1.5 py-0.5 font-body text-[10px] font-semibold uppercase ${config.color} ${config.bgColor}`}
              >
                {config.label}
              </span>
              {formattedDate && (
                <span className="font-body text-[10px] text-muted-foreground">
                  {formattedDate}
                </span>
              )}
            </div>
            <p className="font-body text-sm font-medium text-foreground leading-snug">
              {event.title}
            </p>
            <p className="mt-0.5 font-body text-xs text-muted-foreground line-clamp-2">
              {event.description}
            </p>

            {/* Type-specific meta */}
            {event.type === "vote" && event.meta && (
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 font-body text-[10px] font-semibold ${
                    event.meta.vote === "Yes"
                      ? "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]"
                      : event.meta.vote === "No"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {event.meta.vote}
                </span>
                {event.meta.result && (
                  <span className="font-body text-[10px] text-muted-foreground">
                    Result: {event.meta.result}
                  </span>
                )}
              </div>
            )}

            {event.type === "social" && event.meta && (
              <div className="mt-1.5 flex items-center gap-3">
                {(event.meta.likes as number) > 0 && (
                  <span className="flex items-center gap-1 font-body text-[10px] text-muted-foreground">
                    <Heart className="h-3 w-3" /> {event.meta.likes}
                  </span>
                )}
                {(event.meta.retweets as number) > 0 && (
                  <span className="flex items-center gap-1 font-body text-[10px] text-muted-foreground">
                    <Repeat2 className="h-3 w-3" /> {event.meta.retweets}
                  </span>
                )}
                {event.meta.tweetId && (
                  <a
                    href={`https://x.com/i/web/status/${event.meta.tweetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-body text-[10px] text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountabilityTimeline;
