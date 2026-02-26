import { useState, useMemo, useEffect } from "react";
import SiteNav from "@/components/SiteNav";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Gavel,
  Users,
  Vote,
  Landmark,
  Circle,
  AlertCircle,
} from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import { useLegislativeCalendar } from "@/hooks/useLegislativeCalendar";
import type { CalendarEvent } from "@/hooks/useLegislativeCalendar";
import { Skeleton } from "@/components/ui/skeleton";

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: typeof Gavel; colorClass: string }> = {
  hearing: { label: "Hearing", icon: Gavel, colorClass: "bg-[hsl(210,80%,55%)] text-white" },
  committee: { label: "Committee", icon: Users, colorClass: "bg-[hsl(142,71%,45%)] text-white" },
  vote: { label: "Vote", icon: Vote, colorClass: "bg-[hsl(0,72%,51%)] text-white" },
  session: { label: "Session", icon: Landmark, colorClass: "bg-[hsl(43,90%,55%)] text-white" },
  other: { label: "Other", icon: Circle, colorClass: "bg-muted-foreground text-white" },
};

type TypeFilter = "all" | "hearing" | "committee" | "vote" | "session";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const LegislativeCalendar = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useLegislativeCalendar();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hasAutoNavigated, setHasAutoNavigated] = useState(false);

  // Auto-navigate to the month with the most recent events
  useEffect(() => {
    if (data?.events && data.events.length > 0 && !hasAutoNavigated) {
      const mostRecent = data.events[0]?.startDate?.slice(0, 10);
      if (mostRecent) {
        const d = new Date(mostRecent + "T12:00:00");
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
        setHasAutoNavigated(true);
      }
    }
  }, [data, hasAutoNavigated]);

  const filteredEvents = useMemo(() => {
    if (!data?.events) return [];
    return data.events.filter((e) => typeFilter === "all" || e.type === typeFilter);
  }, [data, typeFilter]);

  // Group events by date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const evt of filteredEvents) {
      const dateKey = evt.startDate?.slice(0, 10);
      if (!dateKey) continue;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(evt);
    }
    return map;
  }, [filteredEvents]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <main className="container mx-auto max-w-5xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
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

          <div className="flex items-center gap-3 mb-2">
            <CalendarDays className="h-7 w-7 text-primary" />
            <h1 className="font-display text-3xl font-bold text-headline">
              Legislative Calendar
            </h1>
          </div>
          <p className="font-body text-sm text-tertiary mb-6">
            Upcoming hearings, committee meetings, votes, and session dates for the Nevada Legislature.
            {data?.session && (
              <span className="ml-1 text-muted-foreground">Session: {data.session}</span>
            )}
          </p>

          {/* Type filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(["all", "hearing", "committee", "vote", "session"] as TypeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-lg px-4 py-2 font-body text-sm font-medium transition-colors ${
                  typeFilter === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-elevated text-foreground hover:bg-surface-hover"
                }`}
              >
                {t === "all" ? "All" : EVENT_TYPE_CONFIG[t]?.label || t}
              </button>
            ))}
          </div>

          {isLoading && <CalendarSkeleton />}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-body text-sm font-medium text-foreground">
                  Couldn't load calendar data
                </p>
                <p className="mt-1 font-body text-xs text-muted-foreground">
                  {error instanceof Error ? error.message : "Unknown error"}
                </p>
              </div>
            </div>
          )}

          {data && !isLoading && (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              {/* Calendar grid */}
              <div className="rounded-xl border border-border bg-card p-4">
                {/* Month nav */}
                <div className="flex items-center justify-between mb-4">
                  <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-surface-hover transition-colors">
                    <ChevronLeft className="h-5 w-5 text-foreground" />
                  </button>
                  <h2 className="font-display text-lg font-bold text-headline">
                    {MONTHS[viewMonth]} {viewYear}
                  </h2>
                  <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-surface-hover transition-colors">
                    <ChevronRight className="h-5 w-5 text-foreground" />
                  </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="text-center font-body text-xs font-medium text-muted-foreground py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const dayEvents = eventsByDate[dateKey] || [];
                    const isToday = dateKey === todayKey;
                    const isSelected = dateKey === selectedDate;

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDate(dateKey === selectedDate ? null : dateKey)}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : isToday
                              ? "bg-primary/10 text-primary font-bold"
                              : "hover:bg-surface-hover text-foreground"
                        }`}
                      >
                        <span className="font-body text-sm">{day}</span>
                        {dayEvents.length > 0 && (
                          <div className="flex gap-0.5">
                            {dayEvents.slice(0, 3).map((evt, idx) => {
                              const config = EVENT_TYPE_CONFIG[evt.type] || EVENT_TYPE_CONFIG.other;
                              return (
                                <span
                                  key={idx}
                                  className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-primary-foreground" : ""}`}
                                  style={!isSelected ? { backgroundColor: getTypeColor(evt.type) } : undefined}
                                />
                              );
                            })}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border">
                  {Object.entries(EVENT_TYPE_CONFIG).filter(([k]) => k !== "other").map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: getTypeColor(key) }}
                      />
                      <span className="font-body text-xs text-muted-foreground">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event detail sidebar */}
              <div className="space-y-3">
                <h3 className="font-display text-sm font-bold text-headline">
                  {selectedDate
                    ? `Events on ${new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                    : "Select a date to view events"}
                </h3>

                {selectedDate && selectedEvents.length === 0 && (
                  <p className="font-body text-sm text-muted-foreground py-4">
                    No events on this date.
                  </p>
                )}

                {selectedEvents.map((evt) => (
                  <EventCard key={evt.id} event={evt} />
                ))}

                {!selectedDate && filteredEvents.length > 0 && (
                  <>
                    <h3 className="font-display text-sm font-bold text-headline mt-4">
                      Recent Activity ({filteredEvents.length})
                    </h3>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {filteredEvents.slice(0, 15).map((evt) => (
                        <EventCard key={evt.id} event={evt} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

function EventCard({ event }: { event: CalendarEvent }) {
  const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.other;
  const Icon = config.icon;
  const formattedDate = event.startDate
    ? new Date(event.startDate + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div className="rounded-xl border border-border bg-card p-3 transition-colors hover:bg-surface-elevated">
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: getTypeColor(event.type) }}
        >
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-body text-sm font-medium text-foreground leading-snug line-clamp-2">
            {event.name}
          </p>
          {event.description && event.description !== event.name && (
            <p className="mt-1 font-body text-xs text-muted-foreground line-clamp-2">
              {event.description}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {formattedDate && (
              <span className="font-body text-[10px] font-medium text-muted-foreground">
                {formattedDate}
              </span>
            )}
            <span
              className="rounded px-1.5 py-0.5 font-body text-[10px] font-medium text-white"
              style={{ backgroundColor: getTypeColor(event.type) }}
            >
              {config.label}
            </span>
            {event.chamber && event.chamber !== "Joint" && (
              <span className="rounded bg-surface-elevated px-1.5 py-0.5 font-body text-[10px] font-medium text-muted-foreground">
                {event.chamber}
              </span>
            )}
          </div>
          {event.relatedBills.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {event.relatedBills.slice(0, 3).map((bill, i) => (
                <span key={i} className="rounded bg-primary/10 px-1.5 py-0.5 font-body text-[10px] font-medium text-primary">
                  {bill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTypeColor(type: string): string {
  switch (type) {
    case "hearing": return "hsl(210,80%,55%)";
    case "committee": return "hsl(142,71%,45%)";
    case "vote": return "hsl(0,72%,51%)";
    case "session": return "hsl(43,90%,55%)";
    default: return "hsl(0,0%,50%)";
  }
}

function CalendarSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Skeleton className="h-96 rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default LegislativeCalendar;
