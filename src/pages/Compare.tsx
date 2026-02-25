import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowLeftRight,
  ChevronDown,
  DollarSign,
  BarChart3,
  Tag,
  Search,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
} from "recharts";
import { nevadaPoliticians, type Politician } from "@/lib/politicians";
import { getVotingRecord, gradeFromScore, gradeColor } from "@/lib/votingRecords";
import { getCampaignFinance, formatCurrency } from "@/lib/campaignFinance";

/* ──────────────────────────────────────────────────────────── */
/*  Helpers                                                     */
/* ──────────────────────────────────────────────────────────── */

const partyDot = (p: string) =>
  p === "Democrat"
    ? "bg-[hsl(210,80%,55%)]"
    : p === "Republican"
      ? "bg-primary"
      : "bg-[hsl(43,90%,55%)]";

const partyText = (p: string) =>
  p === "Democrat"
    ? "text-[hsl(210,80%,55%)]"
    : p === "Republican"
      ? "text-primary"
      : "text-[hsl(43,90%,55%)]";

const partyHsl = (p: string) =>
  p === "Democrat" ? "hsl(210,80%,55%)" : p === "Republican" ? "hsl(0,72%,51%)" : "hsl(43,90%,55%)";

/* ──────────────────────────────────────────────────────────── */
/*  Politician Picker                                           */
/* ──────────────────────────────────────────────────────────── */

function PoliticianPicker({
  selected,
  onSelect,
  otherId,
  side,
}: {
  selected: Politician | null;
  onSelect: (p: Politician) => void;
  otherId?: string;
  side: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = nevadaPoliticians.filter(
    (p) =>
      p.id !== otherId &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div ref={ref} className="relative flex-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-surface-elevated"
      >
        {selected ? (
          <>
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated font-display text-sm font-bold text-muted-foreground`}
            >
              {selected.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-body text-sm font-semibold text-foreground">
                {selected.name}
              </p>
              <p className={`font-body text-xs ${partyText(selected.party)}`}>
                {selected.title} · {selected.party}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Search className="h-4 w-4" />
            <span className="font-body text-sm">
              Select {side === "left" ? "first" : "second"} politician…
            </span>
          </div>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl border border-border bg-card shadow-card">
          <div className="sticky top-0 border-b border-border bg-card p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              autoFocus
              className="w-full rounded-lg bg-surface-elevated px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSelect(p);
                setOpen(false);
                setSearch("");
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-elevated"
            >
              <div className={`h-2 w-2 rounded-full ${partyDot(p.party)}`} />
              <div className="min-w-0 flex-1">
                <span className="font-body text-sm text-foreground">{p.name}</span>
                <span className="ml-2 font-body text-xs text-muted-foreground">{p.title}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-3 font-body text-sm text-muted-foreground">No results</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Custom Tooltip                                              */
/* ──────────────────────────────────────────────────────────── */

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-card">
      <p className="font-body text-xs font-semibold text-headline">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-body text-[11px]" style={{ color: p.color || p.fill }}>
          {p.name}: {typeof p.value === "number" && p.value > 999 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────── */
/*  Comparison Sections                                         */
/* ──────────────────────────────────────────────────────────── */

function KeyIssuesComparison({ a, b }: { a: Politician; b: Politician }) {
  const allIssues = Array.from(new Set([...a.keyIssues, ...b.keyIssues]));

  return (
    <Section icon={<Tag className="h-4 w-4 text-[hsl(43,90%,55%)]" />} title="Key Issues">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-2">
        {/* Headers */}
        <p className={`font-body text-xs font-semibold ${partyText(a.party)}`}>{a.name}</p>
        <div />
        <p className={`font-body text-xs font-semibold text-right ${partyText(b.party)}`}>{b.name}</p>

        {allIssues.map((issue) => {
          const aHas = a.keyIssues.includes(issue);
          const bHas = b.keyIssues.includes(issue);
          return (
            <div key={issue} className="contents">
              <div className="flex items-center">
                {aHas && (
                  <span className="rounded-md bg-surface-elevated px-2 py-1 font-body text-[11px] font-medium text-foreground">
                    {issue}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center">
                {aHas && bHas ? (
                  <span className="h-2 w-2 rounded-full bg-[hsl(142,71%,45%)]" title="Shared" />
                ) : (
                  <span className="h-px w-4 bg-border" />
                )}
              </div>
              <div className="flex items-center justify-end">
                {bHas && (
                  <span className="rounded-md bg-surface-elevated px-2 py-1 font-body text-[11px] font-medium text-foreground">
                    {issue}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {(() => {
        const shared = a.keyIssues.filter((i) => b.keyIssues.includes(i));
        return shared.length > 0 ? (
          <p className="mt-3 font-body text-[11px] text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-[hsl(142,71%,45%)] mr-1 align-middle" />
            Shared priorities: {shared.join(", ")}
          </p>
        ) : null;
      })()}
    </Section>
  );
}

function VotingComparison({ a, b }: { a: Politician; b: Politician }) {
  const recA = useMemo(() => getVotingRecord(a.id, a.keyIssues, a.party), [a]);
  const recB = useMemo(() => getVotingRecord(b.id, b.keyIssues, b.party), [b]);

  // Radar data
  const radarData = recA.issueGrades.map((ig) => {
    const bGrade = recB.issueGrades.find((g) => g.issue === ig.issue);
    return { issue: ig.issue.split(" ")[0], [a.name.split(" ").pop()!]: ig.score, [b.name.split(" ").pop()!]: bGrade?.score || 0 };
  });

  const nameA = a.name.split(" ").pop()!;
  const nameB = b.name.split(" ").pop()!;

  return (
    <Section icon={<BarChart3 className="h-4 w-4 text-[hsl(210,80%,55%)]" />} title="Voting Record">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <CompareStatCard
          label="Overall Score"
          valueA={`${gradeFromScore(recA.overallScore)} (${recA.overallScore}%)`}
          valueB={`${gradeFromScore(recB.overallScore)} (${recB.overallScore}%)`}
          colorA={gradeColor(gradeFromScore(recA.overallScore))}
          colorB={gradeColor(gradeFromScore(recB.overallScore))}
        />
        <CompareStatCard
          label="Attendance"
          valueA={`${recA.attendance}%`}
          valueB={`${recB.attendance}%`}
        />
        <CompareStatCard
          label="Total Votes"
          valueA={String(recA.totalVotes)}
          valueB={String(recB.totalVotes)}
        />
      </div>

      {/* Radar chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="mb-2 font-display text-sm font-bold text-headline">Issue Area Scores</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(220,14%,18%)" />
              <PolarAngleAxis
                dataKey="issue"
                tick={{ fill: "hsl(215,12%,55%)", fontSize: 10, fontFamily: "Inter" }}
              />
              <Radar name={nameA} dataKey={nameA} stroke={partyHsl(a.party)} fill={partyHsl(a.party)} fillOpacity={0.2} />
              <Radar name={nameB} dataKey={nameB} stroke={partyHsl(b.party)} fill={partyHsl(b.party)} fillOpacity={0.2} />
              <Legend
                wrapperStyle={{ fontFamily: "Inter", fontSize: 11 }}
                formatter={(value) => <span style={{ color: "hsl(210,20%,92%)" }}>{value}</span>}
              />
              <Tooltip content={<ChartTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Issue grade bars side by side */}
      <div className="mt-4 space-y-2">
        {recA.issueGrades.map((ig) => {
          const bGrade = recB.issueGrades.find((g) => g.issue === ig.issue);
          return (
            <div key={ig.issue} className="space-y-1">
              <div className="flex justify-between">
                <span className="font-body text-xs text-secondary-custom">{ig.issue}</span>
                <div className="flex gap-3">
                  <span className="font-body text-[10px] font-bold" style={{ color: gradeColor(ig.grade) }}>{ig.grade}</span>
                  <span className="text-muted-foreground font-body text-[10px]">vs</span>
                  <span className="font-body text-[10px] font-bold" style={{ color: gradeColor(bGrade?.grade || "F") }}>{bGrade?.grade || "—"}</span>
                </div>
              </div>
              <div className="flex gap-1 h-1.5">
                <div className="flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${ig.score}%`, backgroundColor: partyHsl(a.party) }} />
                </div>
                <div className="flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${bGrade?.score || 0}%`, backgroundColor: partyHsl(b.party) }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function FinanceComparison({ a, b }: { a: Politician; b: Politician }) {
  const finA = useMemo(() => getCampaignFinance(a.id, a.party, a.level), [a]);
  const finB = useMemo(() => getCampaignFinance(b.id, b.party, b.level), [b]);

  const barData = [
    { label: "Raised", [a.name.split(" ").pop()!]: finA.totalRaised, [b.name.split(" ").pop()!]: finB.totalRaised },
    { label: "Spent", [a.name.split(" ").pop()!]: finA.totalSpent, [b.name.split(" ").pop()!]: finB.totalSpent },
    { label: "Cash on Hand", [a.name.split(" ").pop()!]: finA.cashOnHand, [b.name.split(" ").pop()!]: finB.cashOnHand },
  ];

  const nameA = a.name.split(" ").pop()!;
  const nameB = b.name.split(" ").pop()!;

  return (
    <Section icon={<DollarSign className="h-4 w-4 text-[hsl(142,71%,45%)]" />} title="Campaign Finance">
      <div className="grid grid-cols-3 gap-3 mb-5">
        <CompareStatCard label="Total Raised" valueA={formatCurrency(finA.totalRaised)} valueB={formatCurrency(finB.totalRaised)} />
        <CompareStatCard label="Total Spent" valueA={formatCurrency(finA.totalSpent)} valueB={formatCurrency(finB.totalSpent)} />
        <CompareStatCard label="Cash on Hand" valueA={formatCurrency(finA.cashOnHand)} valueB={formatCurrency(finB.cashOnHand)} />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="mb-2 font-display text-sm font-bold text-headline">Fundraising Comparison</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" tick={{ fill: "hsl(215,12%,55%)", fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(215,12%,55%)", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey={nameA} fill={partyHsl(a.party)} radius={[4, 4, 0, 0]} />
              <Bar dataKey={nameB} fill={partyHsl(b.party)} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top donors side by side */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        {[{ fin: finA, pol: a }, { fin: finB, pol: b }].map(({ fin, pol }) => (
          <div key={pol.id} className="rounded-lg border border-border bg-card p-4">
            <h4 className={`mb-2 font-body text-xs font-semibold ${partyText(pol.party)}`}>
              {pol.name.split(" ").pop()}'s Top Donors
            </h4>
            <div className="space-y-1.5">
              {fin.topDonors.slice(0, 5).map((d) => (
                <div key={d.name} className="flex items-center justify-between gap-2">
                  <span className="truncate font-body text-[11px] text-secondary-custom">{d.name}</span>
                  <span className="shrink-0 font-body text-[11px] font-semibold text-foreground">{formatCurrency(d.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Shared UI                                                   */
/* ──────────────────────────────────────────────────────────── */

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-display text-lg font-bold text-headline">{title}</h3>
      </div>
      {children}
    </motion.section>
  );
}

function CompareStatCard({
  label,
  valueA,
  valueB,
  colorA,
  colorB,
}: {
  label: string;
  valueA: string;
  valueB: string;
  colorA?: string;
  colorB?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
      <div className="flex items-center justify-center gap-2">
        <span className="font-display text-sm font-bold" style={{ color: colorA || "hsl(var(--foreground))" }}>{valueA}</span>
        <span className="text-muted-foreground text-[10px]">vs</span>
        <span className="font-display text-sm font-bold" style={{ color: colorB || "hsl(var(--foreground))" }}>{valueB}</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Page                                                        */
/* ──────────────────────────────────────────────────────────── */

const Compare = () => {
  const [politicianA, setPoliticianA] = useState<Politician | null>(null);
  const [politicianB, setPoliticianB] = useState<Politician | null>(null);

  const ready = politicianA && politicianB;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero border-b border-border">
        <div className="container mx-auto px-4 py-8 md:py-10">
          <div className="flex items-center gap-3 mb-4">
            <Link
              to="/politicians"
              className="flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-2 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
                <ArrowLeftRight className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-headline md:text-4xl">
                  Compare Politicians
                </h1>
                <p className="font-body text-sm text-secondary-custom">
                  Side-by-side voting records, campaign finance & key issues
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* Selectors */}
        <div className="flex items-center gap-3">
          <PoliticianPicker selected={politicianA} onSelect={setPoliticianA} otherId={politicianB?.id} side="left" />
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated">
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <PoliticianPicker selected={politicianB} onSelect={setPoliticianB} otherId={politicianA?.id} side="right" />
        </div>

        {!ready && (
          <div className="py-16 text-center">
            <ArrowLeftRight className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 font-body text-sm text-muted-foreground">
              Select two politicians above to compare
            </p>
          </div>
        )}

        {ready && (
          <motion.div
            key={`${politicianA.id}-${politicianB.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            <KeyIssuesComparison a={politicianA} b={politicianB} />
            <div className="h-px bg-border" />
            <VotingComparison a={politicianA} b={politicianB} />
            <div className="h-px bg-border" />
            <FinanceComparison a={politicianA} b={politicianB} />

            <p className="font-body text-[10px] text-muted-foreground/60 italic">
              Data is illustrative. Voting records based on 83rd Session (2025). Finance data from 2025-2026 cycle.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Compare;
