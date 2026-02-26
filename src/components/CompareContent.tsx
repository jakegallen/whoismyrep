import { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  ChevronDown,
  DollarSign,
  BarChart3,
  Tag,
  Search,
  Loader2,
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
import type { Politician } from "@/lib/politicians";
import { getVotingRecord, gradeFromScore, gradeColor } from "@/lib/votingRecords";
import { getCampaignFinance, formatCurrency } from "@/lib/campaignFinance";
import { useLegislators, type Legislator } from "@/hooks/useLegislators";
import { US_STATES } from "@/lib/usStates";

const partyDot = (p: string) =>
  p === "Democrat" || p === "Democratic"
    ? "bg-[hsl(210,80%,55%)]"
    : p === "Republican"
      ? "bg-primary"
      : "bg-[hsl(43,90%,55%)]";

const partyText = (p: string) =>
  p === "Democrat" || p === "Democratic"
    ? "text-[hsl(210,80%,55%)]"
    : p === "Republican"
      ? "text-primary"
      : "text-[hsl(43,90%,55%)]";

const partyHsl = (p: string) =>
  p === "Democrat" || p === "Democratic" ? "hsl(210,80%,55%)" : p === "Republican" ? "hsl(0,72%,51%)" : "hsl(43,90%,55%)";

/** Convert a Legislator from the API into a Politician shape for comparison */
function legislatorToPolitician(l: Legislator): Politician {
  return {
    id: l.id,
    name: l.name,
    title: l.title,
    party: l.party as Politician["party"],
    office: l.office,
    region: l.region,
    level: l.level,
    imageUrl: l.imageUrl,
    bio: "",
    keyIssues: [],
    website: l.website,
    email: l.email,
    socialHandles: l.socialHandles,
  };
}

function PoliticianPicker({
  selected,
  onSelect,
  otherId,
  side,
  legislators,
  isLoading,
}: {
  selected: Politician | null;
  onSelect: (p: Politician) => void;
  otherId?: string;
  side: "left" | "right";
  legislators: Legislator[];
  isLoading: boolean;
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

  const filtered = legislators.filter(
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated font-display text-sm font-bold text-muted-foreground">
              {selected.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-body text-sm font-semibold text-foreground">{selected.name}</p>
              <p className={`font-body text-xs ${partyText(selected.party)}`}>{selected.title} · {selected.party}</p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="font-body text-sm">{isLoading ? "Loading…" : `Select ${side === "left" ? "first" : "second"} politician…`}</span>
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
              onClick={() => { onSelect(legislatorToPolitician(p)); setOpen(false); setSearch(""); }}
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

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-display text-lg font-bold text-headline">{title}</h3>
      </div>
      {children}
    </motion.section>
  );
}

function CompareStatCard({ label, valueA, valueB, colorA, colorB }: { label: string; valueA: string; valueB: string; colorA?: string; colorB?: string }) {
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

function VotingComparison({ a, b }: { a: Politician; b: Politician }) {
  const recA = useMemo(() => getVotingRecord(a.id, a.keyIssues, a.party), [a]);
  const recB = useMemo(() => getVotingRecord(b.id, b.keyIssues, b.party), [b]);
  const radarData = recA.issueGrades.map((ig) => {
    const bGrade = recB.issueGrades.find((g) => g.issue === ig.issue);
    return { issue: ig.issue.split(" ")[0], [a.name.split(" ").pop()!]: ig.score, [b.name.split(" ").pop()!]: bGrade?.score || 0 };
  });
  const nameA = a.name.split(" ").pop()!;
  const nameB = b.name.split(" ").pop()!;

  return (
    <Section icon={<BarChart3 className="h-4 w-4 text-[hsl(210,80%,55%)]" />} title="Voting Record">
      <div className="grid grid-cols-3 gap-3 mb-5">
        <CompareStatCard label="Overall Score" valueA={`${gradeFromScore(recA.overallScore)} (${recA.overallScore}%)`} valueB={`${gradeFromScore(recB.overallScore)} (${recB.overallScore}%)`} colorA={gradeColor(gradeFromScore(recA.overallScore))} colorB={gradeColor(gradeFromScore(recB.overallScore))} />
        <CompareStatCard label="Attendance" valueA={`${recA.attendance}%`} valueB={`${recB.attendance}%`} />
        <CompareStatCard label="Total Votes" valueA={String(recA.totalVotes)} valueB={String(recB.totalVotes)} />
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="mb-2 font-display text-sm font-bold text-headline">Issue Area Scores</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(220,14%,18%)" />
              <PolarAngleAxis dataKey="issue" tick={{ fill: "hsl(215,12%,55%)", fontSize: 10, fontFamily: "Inter" }} />
              <Radar name={nameA} dataKey={nameA} stroke={partyHsl(a.party)} fill={partyHsl(a.party)} fillOpacity={0.2} />
              <Radar name={nameB} dataKey={nameB} stroke={partyHsl(b.party)} fill={partyHsl(b.party)} fillOpacity={0.2} />
              <Legend wrapperStyle={{ fontFamily: "Inter", fontSize: 11 }} formatter={(value) => <span style={{ color: "hsl(210,20%,92%)" }}>{value}</span>} />
              <Tooltip content={<ChartTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
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
    </Section>
  );
}

const CompareContent = () => {
  const [selectedState, setSelectedState] = useState("California");
  const { legislators, isLoading } = useLegislators(undefined, selectedState);

  const [politicianA, setPoliticianA] = useState<Politician | null>(null);
  const [politicianB, setPoliticianB] = useState<Politician | null>(null);
  const ready = politicianA && politicianB;

  // Reset selections when state changes
  useEffect(() => {
    setPoliticianA(null);
    setPoliticianB(null);
  }, [selectedState]);

  return (
    <div className="space-y-8">
      {/* State selector */}
      <div>
        <label className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
          Select a state to compare legislators
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

      <div className="flex items-center gap-3">
        <PoliticianPicker selected={politicianA} onSelect={setPoliticianA} otherId={politicianB?.id} side="left" legislators={legislators} isLoading={isLoading} />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated">
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <PoliticianPicker selected={politicianB} onSelect={setPoliticianB} otherId={politicianA?.id} side="right" legislators={legislators} isLoading={isLoading} />
      </div>

      {!ready && (
        <div className="py-16 text-center">
          <ArrowLeftRight className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 font-body text-sm text-muted-foreground">Select two politicians above to compare</p>
        </div>
      )}

      {ready && (
        <motion.div key={`${politicianA.id}-${politicianB.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-8">
          <VotingComparison a={politicianA} b={politicianB} />
          <div className="h-px bg-border" />
          <FinanceComparison a={politicianA} b={politicianB} />
          <p className="font-body text-[10px] text-muted-foreground/60 italic">
            Data is illustrative. Voting records and finance data are generated for comparison purposes.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default CompareContent;
