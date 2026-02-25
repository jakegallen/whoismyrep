import { useState } from "react";
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
} from "lucide-react";
import {
  midtermRaces,
  electionCalendar,
  candidateMatchups,
  type MidtermRace,
  type MidtermCandidate,
  type ElectionDate,
  type CandidateMatchup,
} from "@/lib/midterms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

/* ──────────────────────────────────────────────────────────── */
/*  Helpers                                                     */
/* ──────────────────────────────────────────────────────────── */

const partyColor = (p: string) =>
  p === "Democrat"
    ? "hsl(210,80%,55%)"
    : p === "Republican"
      ? "hsl(var(--primary))"
      : "hsl(var(--gold))";

const partyBg = (p: string) =>
  p === "Democrat"
    ? "bg-[hsl(210,80%,55%)]/15 text-[hsl(210,80%,55%)]"
    : p === "Republican"
      ? "bg-primary/15 text-primary"
      : "bg-[hsl(43,90%,55%)]/15 text-[hsl(43,90%,55%)]";

const statusColor = (s: string) =>
  s === "Open Seat"
    ? "bg-[hsl(43,90%,55%)]/15 text-[hsl(43,90%,55%)]"
    : s === "Incumbent Running"
      ? "bg-[hsl(142,71%,45%)]/15 text-[hsl(142,71%,45%)]"
      : "bg-primary/15 text-primary";

const dateTypeColor = (t: ElectionDate["type"]) => {
  switch (t) {
    case "deadline": return "border-primary bg-primary/10 text-primary";
    case "primary": return "border-[hsl(43,90%,55%)] bg-[hsl(43,90%,55%)]/10 text-[hsl(43,90%,55%)]";
    case "general": return "border-[hsl(142,71%,45%)] bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]";
    default: return "border-[hsl(210,80%,55%)] bg-[hsl(210,80%,55%)]/10 text-[hsl(210,80%,55%)]";
  }
};

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1_000).toFixed(0)}K`;

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const isPast = (iso: string) => new Date(iso) < new Date();

/* ──────────────────────────────────────────────────────────── */
/*  Sub-components                                              */
/* ──────────────────────────────────────────────────────────── */

function RaceCard({ race, index }: { race: MidtermRace; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-card"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-surface-elevated"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-elevated">
            {race.type === "Senate" ? <Award className="h-4 w-4 text-[hsl(43,90%,55%)]" /> :
             race.type === "Governor" ? <Star className="h-4 w-4 text-primary" /> :
             <Flag className="h-4 w-4 text-[hsl(210,80%,55%)]" />}
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-headline">{race.office}</h3>
            <span className="font-body text-xs text-tertiary">{race.level}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 font-body text-[11px] font-semibold ${statusColor(race.status)}`}>
            {race.status}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          <p className="font-body text-sm text-secondary-custom leading-relaxed">{race.description}</p>

          {race.incumbent && (
            <div className="flex items-center gap-2">
              <span className="font-body text-xs text-muted-foreground">Incumbent:</span>
              <span className="font-body text-sm font-semibold text-foreground">{race.incumbent}</span>
              <span className={`rounded-full px-2 py-0.5 font-body text-[10px] font-bold ${partyBg(race.incumbentParty || "")}`}>
                {race.incumbentParty}
              </span>
            </div>
          )}

          {race.candidates.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">Candidates</h4>
              {race.candidates.map((c) => (
                <CandidateRow key={c.name} candidate={c} />
              ))}
            </div>
          )}

          {race.candidates.length === 0 && (
            <p className="font-body text-xs text-tertiary italic">No declared candidates yet.</p>
          )}
        </div>
      )}
    </motion.div>
  );
}

function CandidateRow({ candidate: c }: { candidate: MidtermCandidate }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-surface-elevated p-3">
      <div
        className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: partyColor(c.party) }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-body text-sm font-semibold text-foreground">{c.name}</span>
          <span className={`rounded-full px-2 py-0.5 font-body text-[10px] font-bold ${partyBg(c.party)}`}>
            {c.party}
          </span>
          {c.isIncumbent && (
            <span className="rounded-full bg-[hsl(43,90%,55%)]/15 px-2 py-0.5 font-body text-[10px] font-bold text-[hsl(43,90%,55%)]">
              Incumbent
            </span>
          )}
        </div>
        <p className="mt-1 font-body text-xs text-secondary-custom leading-relaxed">{c.bio}</p>
        <div className="mt-2 flex items-center gap-4">
          {c.polling !== undefined && (
            <span className="flex items-center gap-1 font-body text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" /> {c.polling}%
            </span>
          )}
          {c.raised !== undefined && (
            <span className="flex items-center gap-1 font-body text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" /> {fmt(c.raised)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CalendarTimeline() {
  return (
    <div className="relative space-y-0">
      {/* vertical line */}
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

function MatchupCard({ matchup, index }: { matchup: CandidateMatchup; index: number }) {
  const [a, b] = matchup.candidates;
  const total = (a.polling || 0) + (b.polling || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-card"
    >
      <div className="px-5 py-4">
        <h3 className="font-display text-base font-bold text-headline">{matchup.raceLabel}</h3>
        {matchup.latestPoll && (
          <p className="mt-0.5 font-body text-[11px] text-tertiary">
            Poll: {matchup.latestPoll.source} · {fmtDate(matchup.latestPoll.date)}
          </p>
        )}
      </div>

      <div className="border-t border-border px-5 py-4 space-y-4">
        {/* Polling bar */}
        <div className="space-y-2">
          <div className="flex justify-between font-body text-xs font-semibold">
            <span style={{ color: partyColor(a.party) }}>{a.name} — {a.polling}%</span>
            <span style={{ color: partyColor(b.party) }}>{b.polling}% — {b.name}</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-l-full transition-all"
              style={{ width: `${total ? ((a.polling || 0) / total) * 100 : 50}%`, backgroundColor: partyColor(a.party) }}
            />
            <div
              className="h-full rounded-r-full transition-all"
              style={{ width: `${total ? ((b.polling || 0) / total) * 100 : 50}%`, backgroundColor: partyColor(b.party) }}
            />
          </div>
        </div>

        {/* Funds comparison */}
        {a.raised !== undefined && b.raised !== undefined && (
          <div className="space-y-1">
            <span className="font-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Funds Raised</span>
            <div className="flex justify-between font-body text-sm font-semibold text-foreground">
              <span>{fmt(a.raised)}</span>
              <span>{fmt(b.raised)}</span>
            </div>
          </div>
        )}

        {/* Bios side by side */}
        <div className="grid grid-cols-2 gap-3">
          {[a, b].map((c) => (
            <div key={c.name} className="rounded-lg bg-surface-elevated p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: partyColor(c.party) }} />
                <span className="font-body text-xs font-semibold text-foreground">{c.name}</span>
              </div>
              {c.isIncumbent && (
                <span className="inline-block mb-1 rounded-full bg-[hsl(43,90%,55%)]/15 px-2 py-0.5 font-body text-[10px] font-bold text-[hsl(43,90%,55%)]">
                  Incumbent
                </span>
              )}
              <p className="font-body text-[11px] text-tertiary leading-relaxed">{c.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Page                                                        */
/* ──────────────────────────────────────────────────────────── */

const Midterms = () => {
  const federalRaces = midtermRaces.filter((r) => r.level === "Federal");
  const stateRaces = midtermRaces.filter((r) => r.level === "State");

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
                  Nevada races, key dates & head-to-head matchups
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <Tabs defaultValue="races" className="w-full">
          <TabsList className="mb-6 w-full justify-start gap-1 bg-surface-elevated">
            <TabsTrigger value="races" className="gap-1.5 font-body text-sm">
              <Users className="h-4 w-4" /> Races
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5 font-body text-sm">
              <Calendar className="h-4 w-4" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="matchups" className="gap-1.5 font-body text-sm">
              <TrendingUp className="h-4 w-4" /> Matchups
            </TabsTrigger>
          </TabsList>

          {/* ── Races ── */}
          <TabsContent value="races" className="space-y-6">
            <section>
              <h2 className="mb-4 font-display text-xl font-bold text-headline">Federal Races</h2>
              <div className="space-y-3">
                {federalRaces.map((r, i) => <RaceCard key={r.id} race={r} index={i} />)}
              </div>
            </section>
            <section>
              <h2 className="mb-4 font-display text-xl font-bold text-headline">State Races</h2>
              <div className="space-y-3">
                {stateRaces.map((r, i) => <RaceCard key={r.id} race={r} index={i} />)}
              </div>
            </section>
          </TabsContent>

          {/* ── Calendar ── */}
          <TabsContent value="calendar">
            <h2 className="mb-4 font-display text-xl font-bold text-headline">Election Calendar</h2>
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <CalendarTimeline />
            </div>
          </TabsContent>

          {/* ── Matchups ── */}
          <TabsContent value="matchups" className="space-y-4">
            <h2 className="mb-4 font-display text-xl font-bold text-headline">Head-to-Head Matchups</h2>
            {candidateMatchups.map((m, i) => <MatchupCard key={m.raceId} matchup={m} index={i} />)}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Midterms;
