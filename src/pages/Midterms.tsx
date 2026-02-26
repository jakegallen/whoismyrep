import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Flag,
  Users,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Star,
  BarChart3,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { US_STATES } from "@/lib/usStates";
import { useLegislators, type Legislator } from "@/hooks/useLegislators";

/* ──────────────────────────────────────────────────────────── */
/*  Types                                                       */
/* ──────────────────────────────────────────────────────────── */

interface MidtermRace {
  id: string;
  office: string;
  level: "Federal" | "State";
  type: "Senate" | "House" | "Governor" | "State Legislature";
  district?: string;
  description: string;
  status: "Open Seat" | "Incumbent Running" | "Contested Primary";
  incumbent?: string;
  incumbentParty?: string;
  candidates: { name: string; party: string; isIncumbent?: boolean; bio: string }[];
}

interface ElectionDate {
  date: string;
  label: string;
  description: string;
  type: "deadline" | "primary" | "general" | "milestone";
}

/* ──────────────────────────────────────────────────────────── */
/*  General election calendar (nationwide, not state-specific)  */
/* ──────────────────────────────────────────────────────────── */

const electionCalendar: ElectionDate[] = [
  { date: "2026-01-15", label: "Voter Registration Drives Begin", description: "Statewide voter registration pushes begin across multiple states.", type: "milestone" },
  { date: "2026-03-01", label: "Early Filing Deadlines", description: "Candidate filing deadlines begin in early primary states.", type: "deadline" },
  { date: "2026-05-01", label: "Primary Season Begins", description: "State primaries begin across the country (dates vary by state).", type: "primary" },
  { date: "2026-08-15", label: "Primary Season Ends", description: "Final state primaries conclude, nominees confirmed.", type: "primary" },
  { date: "2026-10-01", label: "Voter Registration Deadlines", description: "Voter registration deadlines begin in most states (varies).", type: "deadline" },
  { date: "2026-10-15", label: "Early Voting Begins", description: "Early in-person voting starts in states that offer it.", type: "general" },
  { date: "2026-11-03", label: "General Election Day", description: "2026 midterm general election across the United States.", type: "general" },
];

/* ──────────────────────────────────────────────────────────── */
/*  Helpers                                                     */
/* ──────────────────────────────────────────────────────────── */

const partyColor = (p: string) =>
  p === "Democrat" || p === "Democratic"
    ? "hsl(210,80%,55%)"
    : p === "Republican"
      ? "hsl(var(--primary))"
      : "hsl(var(--gold))";

const partyBg = (p: string) =>
  p === "Democrat" || p === "Democratic"
    ? "bg-[hsl(210,80%,55%)]/15 text-[hsl(210,80%,55%)]"
    : p === "Republican"
      ? "bg-primary/15 text-primary"
      : "bg-[hsl(43,90%,55%)]/15 text-[hsl(43,90%,55%)]";

const dateTypeColor = (t: ElectionDate["type"]) => {
  switch (t) {
    case "deadline": return "border-primary bg-primary/10 text-primary";
    case "primary": return "border-[hsl(43,90%,55%)] bg-[hsl(43,90%,55%)]/10 text-[hsl(43,90%,55%)]";
    case "general": return "border-[hsl(142,71%,45%)] bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]";
    default: return "border-[hsl(210,80%,55%)] bg-[hsl(210,80%,55%)]/10 text-[hsl(210,80%,55%)]";
  }
};

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const isPast = (iso: string) => new Date(iso) < new Date();

/* ──────────────────────────────────────────────────────────── */
/*  Sub-components                                              */
/* ──────────────────────────────────────────────────────────── */

function CalendarTimeline() {
  return (
    <div className="relative space-y-0">
      <div className="absolute left-[18px] top-3 bottom-3 w-px bg-border" />
      {electionCalendar.map((evt, i) => {
        const past = isPast(evt.date);
        return (
          <motion.div
            key={evt.date}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            className={`relative flex gap-4 py-3 ${past ? "opacity-50" : ""}`}
          >
            <div className={`z-10 mt-1 flex h-[10px] w-[10px] shrink-0 items-center justify-center rounded-full border-2 ${dateTypeColor(evt.type)} ml-[13px]`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-body text-sm font-semibold text-foreground">{evt.label}</span>
                <span className={`rounded-full border px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wider ${dateTypeColor(evt.type)}`}>
                  {evt.type}
                </span>
                {past && <span className="rounded-full bg-muted px-2 py-0.5 font-body text-[10px] text-muted-foreground">Past</span>}
              </div>
              <p className="mt-0.5 font-body text-xs text-secondary-custom">{fmtDate(evt.date)}</p>
              <p className="mt-1 font-body text-xs text-tertiary leading-relaxed">{evt.description}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function LegislatorCard({ legislator, index }: { legislator: Legislator; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
    >
      {legislator.imageUrl ? (
        <img src={legislator.imageUrl} alt={legislator.name} className="h-10 w-10 rounded-full object-cover bg-surface-elevated" loading="lazy" />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated font-display text-sm font-bold text-muted-foreground">
          {legislator.name.split(" ").map((n) => n[0]).join("")}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-body text-sm font-semibold text-foreground truncate">{legislator.name}</span>
          <span className={`rounded-full px-2 py-0.5 font-body text-[10px] font-bold ${partyBg(legislator.party)}`}>
            {legislator.party.charAt(0)}
          </span>
        </div>
        <p className="font-body text-xs text-muted-foreground truncate">{legislator.title}</p>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Page                                                        */
/* ──────────────────────────────────────────────────────────── */

const Midterms = () => {
  const [selectedState, setSelectedState] = useState("California");
  const { legislators, isLoading, error } = useLegislators(undefined, selectedState);

  const senateLegislators = legislators.filter((l) => l.chamber === "Senate");
  const assemblyLegislators = legislators.filter((l) => l.chamber === "Assembly");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero border-b border-border">
        <div className="container mx-auto px-4 py-8 md:py-10">
          <div className="flex items-center gap-3 mb-4">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-2 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
                <Flag className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-headline md:text-4xl">
                  2026 Midterm Elections
                </h1>
                <p className="font-body text-sm text-secondary-custom">
                  Nationwide races, key dates & state legislators up for re-election
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-4xl px-4 py-8">
        {/* State Selector */}
        <div className="mb-6">
          <label className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
            Browse legislators by state
          </label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-border bg-card px-3 py-2 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {US_STATES.filter(s => s.abbr !== "US").map((s) => (
              <option key={s.abbr} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        <Tabs defaultValue="legislators" className="w-full">
          <TabsList className="mb-6 w-full justify-start gap-1 bg-surface-elevated">
            <TabsTrigger value="legislators" className="gap-1.5 font-body text-sm">
              <Users className="h-4 w-4" /> State Legislators
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5 font-body text-sm">
              <Calendar className="h-4 w-4" /> Calendar
            </TabsTrigger>
          </TabsList>

          {/* ── Legislators ── */}
          <TabsContent value="legislators" className="space-y-6">
            {isLoading && (
              <div className="flex items-center gap-2 py-12 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="font-body text-sm text-muted-foreground">Loading legislators…</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-body text-sm font-medium text-foreground">Couldn't load legislators</p>
                  <p className="mt-1 font-body text-xs text-muted-foreground">{error}</p>
                </div>
              </div>
            )}

            {!isLoading && !error && (
              <>
                {senateLegislators.length > 0 && (
                  <section>
                    <h2 className="mb-3 font-display text-lg font-bold text-headline">
                      {selectedState} Senate ({senateLegislators.length})
                    </h2>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {senateLegislators.map((l, i) => <LegislatorCard key={l.id} legislator={l} index={i} />)}
                    </div>
                  </section>
                )}
                {assemblyLegislators.length > 0 && (
                  <section>
                    <h2 className="mb-3 font-display text-lg font-bold text-headline">
                      {selectedState} Assembly ({assemblyLegislators.length})
                    </h2>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {assemblyLegislators.map((l, i) => <LegislatorCard key={l.id} legislator={l} index={i} />)}
                    </div>
                  </section>
                )}
                {legislators.length === 0 && (
                  <p className="py-12 text-center font-body text-sm text-muted-foreground">
                    No legislators found for {selectedState}. Try a different state.
                  </p>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Calendar ── */}
          <TabsContent value="calendar">
            <h2 className="mb-4 font-display text-xl font-bold text-headline">2026 Election Calendar</h2>
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <CalendarTimeline />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Midterms;
