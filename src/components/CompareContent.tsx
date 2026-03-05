import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  ChevronDown,
  DollarSign,
  BarChart3,
  Search,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLegislators, type Legislator } from "@/hooks/useLegislators";
import { useVotingRecords } from "@/hooks/useVotingRecords";
import { useFECFinance, formatUSD } from "@/hooks/useFECFinance";
import { US_STATES } from "@/lib/usStates";

// ── Party color helpers ──

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
  p === "Democrat" || p === "Democratic"
    ? "hsl(210,80%,55%)"
    : p === "Republican"
      ? "hsl(0,72%,51%)"
      : "hsl(43,90%,55%)";

// ── Shared UI components ──

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-card">
      <p className="font-body text-xs font-semibold text-headline">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-body text-[11px]" style={{ color: p.color || p.fill }}>
          {p.name}: {typeof p.value === "number" && p.value > 999 ? formatUSD(p.value) : p.value}
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
      <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </p>
      <div className="flex items-center justify-center gap-2">
        <span
          className="font-display text-sm font-bold"
          style={{ color: colorA || "hsl(var(--foreground))" }}
        >
          {valueA}
        </span>
        <span className="text-muted-foreground text-[10px]">vs</span>
        <span
          className="font-display text-sm font-bold"
          style={{ color: colorB || "hsl(var(--foreground))" }}
        >
          {valueB}
        </span>
      </div>
    </div>
  );
}

function DataUnavailable({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/40" />
      <p className="mt-3 font-body text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ── Legislator Picker ──

function LegislatorPicker({
  selected,
  onSelect,
  otherId,
  side,
  legislators,
  isLoading,
}: {
  selected: Legislator | null;
  onSelect: (l: Legislator) => void;
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
        p.title.toLowerCase().includes(search.toLowerCase())),
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
              {selected.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
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
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="font-body text-sm">
              {isLoading
                ? "Loading…"
                : `Select ${side === "left" ? "first" : "second"} legislator…`}
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
                <span className="ml-2 font-body text-xs text-muted-foreground">
                  {p.title}
                </span>
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

// ── Voting Record Comparison (live API data) ──

function VotingComparison({
  a,
  b,
  state,
}: {
  a: Legislator;
  b: Legislator;
  state: string;
}) {
  const votesA = useVotingRecords(a.name, a.chamber, state, undefined, "state");
  const votesB = useVotingRecords(b.name, b.chamber, state, undefined, "state");

  const isLoading = votesA.isLoading || votesB.isLoading;
  const hasDataA =
    votesA.data?.legislatorFound && (votesA.data?.summary?.totalVotes ?? 0) > 0;
  const hasDataB =
    votesB.data?.legislatorFound && (votesB.data?.summary?.totalVotes ?? 0) > 0;

  if (isLoading) {
    return (
      <Section
        icon={<BarChart3 className="h-4 w-4 text-[hsl(210,80%,55%)]" />}
        title="Voting Record"
      >
        <div className="flex items-center gap-3 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-body text-sm text-muted-foreground">
            Loading voting records…
          </span>
        </div>
      </Section>
    );
  }

  if (!hasDataA && !hasDataB) {
    return (
      <Section
        icon={<BarChart3 className="h-4 w-4 text-[hsl(210,80%,55%)]" />}
        title="Voting Record"
      >
        <DataUnavailable message="No voting records found for either legislator in the current session." />
      </Section>
    );
  }

  const sA = votesA.data?.summary;
  const sB = votesB.data?.summary;

  const nameA = a.name.split(" ").pop()!;
  const nameB = b.name.split(" ").pop()!;

  // Bar chart data
  const barData = [
    {
      label: "Yes",
      [nameA]: sA?.yesVotes ?? 0,
      [nameB]: sB?.yesVotes ?? 0,
    },
    {
      label: "No",
      [nameA]: sA?.noVotes ?? 0,
      [nameB]: sB?.noVotes ?? 0,
    },
    {
      label: "Abstain",
      [nameA]: sA?.abstainVotes ?? 0,
      [nameB]: sB?.abstainVotes ?? 0,
    },
    {
      label: "Not Voting",
      [nameA]: sA?.notVoting ?? 0,
      [nameB]: sB?.notVoting ?? 0,
    },
  ];

  return (
    <Section
      icon={<BarChart3 className="h-4 w-4 text-[hsl(210,80%,55%)]" />}
      title="Voting Record"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="rounded-md bg-[hsl(142,71%,45%/0.15)] px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-wider text-[hsl(142,71%,45%)]">
          Live Data
        </span>
        {sA?.session && (
          <span className="font-body text-xs text-muted-foreground">
            {sA.session} session
          </span>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
        <CompareStatCard
          label="Total Votes"
          valueA={String(sA?.totalVotes ?? "—")}
          valueB={String(sB?.totalVotes ?? "—")}
        />
        <CompareStatCard
          label="Yes Rate"
          valueA={
            sA && sA.totalVotes > 0
              ? `${Math.round((sA.yesVotes / sA.totalVotes) * 100)}%`
              : "—"
          }
          valueB={
            sB && sB.totalVotes > 0
              ? `${Math.round((sB.yesVotes / sB.totalVotes) * 100)}%`
              : "—"
          }
          colorA="hsl(142, 71%, 45%)"
          colorB="hsl(142, 71%, 45%)"
        />
        <CompareStatCard
          label="No Rate"
          valueA={
            sA && sA.totalVotes > 0
              ? `${Math.round((sA.noVotes / sA.totalVotes) * 100)}%`
              : "—"
          }
          valueB={
            sB && sB.totalVotes > 0
              ? `${Math.round((sB.noVotes / sB.totalVotes) * 100)}%`
              : "—"
          }
          colorA="hsl(0, 72%, 51%)"
          colorB="hsl(0, 72%, 51%)"
        />
        <CompareStatCard
          label="Majority Alignment"
          valueA={sA ? `${sA.partyLineRate}%` : "—"}
          valueB={sB ? `${sB.partyLineRate}%` : "—"}
          colorA="hsl(210, 80%, 55%)"
          colorB="hsl(210, 80%, 55%)"
        />
      </div>

      {/* Vote breakdown bar chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="mb-2 font-display text-sm font-bold text-headline">
          Vote Breakdown Comparison
        </h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
              <XAxis
                dataKey="label"
                tick={{
                  fill: "hsl(215,12%,55%)",
                  fontSize: 11,
                  fontFamily: "Inter",
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{
                  fill: "hsl(215,12%,55%)",
                  fontSize: 10,
                  fontFamily: "Inter",
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey={nameA}
                fill={partyHsl(a.party)}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey={nameB}
                fill={partyHsl(b.party)}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="font-body text-[10px] text-muted-foreground/60 italic">
        Live data sourced from OpenStates.org. Showing current legislative session
        roll call votes.
      </p>
    </Section>
  );
}

// ── Campaign Finance Comparison (live FEC data) ──

function FinanceComparison({ a, b }: { a: Legislator; b: Legislator }) {
  const finA = useFECFinance(a.name);
  const finB = useFECFinance(b.name);

  const isLoading = finA.isLoading || finB.isLoading;
  const totalsA = finA.data?.totals?.[0];
  const totalsB = finB.data?.totals?.[0];
  const hasData = !!totalsA || !!totalsB;

  if (isLoading) {
    return (
      <Section
        icon={<DollarSign className="h-4 w-4 text-[hsl(142,71%,45%)]" />}
        title="Campaign Finance"
      >
        <div className="flex items-center gap-3 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-body text-sm text-muted-foreground">
            Searching FEC records…
          </span>
        </div>
      </Section>
    );
  }

  if (!hasData) {
    return (
      <Section
        icon={<DollarSign className="h-4 w-4 text-[hsl(142,71%,45%)]" />}
        title="Campaign Finance"
      >
        <DataUnavailable message="No FEC campaign finance data found. FEC data is primarily available for federal candidates." />
        <p className="font-body text-[10px] text-muted-foreground/60 italic">
          State-level campaign finance data varies by state and is not yet
          integrated. FEC data sourced from the Federal Election Commission.
        </p>
      </Section>
    );
  }

  const nameA = a.name.split(" ").pop()!;
  const nameB = b.name.split(" ").pop()!;

  const barData = [
    {
      label: "Receipts",
      [nameA]: totalsA?.receipts ?? 0,
      [nameB]: totalsB?.receipts ?? 0,
    },
    {
      label: "Spent",
      [nameA]: totalsA?.disbursements ?? 0,
      [nameB]: totalsB?.disbursements ?? 0,
    },
    {
      label: "Cash on Hand",
      [nameA]: totalsA?.cashOnHand ?? 0,
      [nameB]: totalsB?.cashOnHand ?? 0,
    },
  ];

  return (
    <Section
      icon={<DollarSign className="h-4 w-4 text-[hsl(142,71%,45%)]" />}
      title="Campaign Finance"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="rounded-md bg-[hsl(142,71%,45%/0.15)] px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-wider text-[hsl(142,71%,45%)]">
          FEC Data
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <CompareStatCard
          label="Total Receipts"
          valueA={totalsA ? formatUSD(totalsA.receipts) : "—"}
          valueB={totalsB ? formatUSD(totalsB.receipts) : "—"}
        />
        <CompareStatCard
          label="Disbursements"
          valueA={totalsA ? formatUSD(totalsA.disbursements) : "—"}
          valueB={totalsB ? formatUSD(totalsB.disbursements) : "—"}
        />
        <CompareStatCard
          label="Cash on Hand"
          valueA={totalsA ? formatUSD(totalsA.cashOnHand) : "—"}
          valueB={totalsB ? formatUSD(totalsB.cashOnHand) : "—"}
        />
      </div>

      {/* Fundraising sources */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <CompareStatCard
          label="Individual Donors"
          valueA={totalsA ? formatUSD(totalsA.individualContributions) : "—"}
          valueB={totalsB ? formatUSD(totalsB.individualContributions) : "—"}
        />
        <CompareStatCard
          label="PAC Contributions"
          valueA={totalsA ? formatUSD(totalsA.pacContributions) : "—"}
          valueB={totalsB ? formatUSD(totalsB.pacContributions) : "—"}
        />
      </div>

      {/* Fundraising bar chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="mb-2 font-display text-sm font-bold text-headline">
          Fundraising Comparison
        </h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
              <XAxis
                dataKey="label"
                tick={{
                  fill: "hsl(215,12%,55%)",
                  fontSize: 11,
                  fontFamily: "Inter",
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{
                  fill: "hsl(215,12%,55%)",
                  fontSize: 10,
                  fontFamily: "Inter",
                }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatUSD(v)}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey={nameA}
                fill={partyHsl(a.party)}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey={nameB}
                fill={partyHsl(b.party)}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="font-body text-[10px] text-muted-foreground/60 italic">
        Campaign finance data sourced from the Federal Election Commission (FEC).
        Showing most recent reporting cycle.
      </p>
    </Section>
  );
}

// ── Main CompareContent ──

const CompareContent = () => {
  const [selectedState, setSelectedState] = useState("California");
  const { legislators, isLoading } = useLegislators(undefined, selectedState);

  const [legA, setLegA] = useState<Legislator | null>(null);
  const [legB, setLegB] = useState<Legislator | null>(null);
  const ready = legA && legB;

  // Reset selections when state changes
  useEffect(() => {
    setLegA(null);
    setLegB(null);
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
          {US_STATES.filter((s) => s.abbr !== "US").map((s) => (
            <option key={s.abbr} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <LegislatorPicker
          selected={legA}
          onSelect={setLegA}
          otherId={legB?.id}
          side="left"
          legislators={legislators}
          isLoading={isLoading}
        />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated">
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <LegislatorPicker
          selected={legB}
          onSelect={setLegB}
          otherId={legA?.id}
          side="right"
          legislators={legislators}
          isLoading={isLoading}
        />
      </div>

      {!ready && (
        <div className="py-16 text-center">
          <ArrowLeftRight className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 font-body text-sm text-muted-foreground">
            Select two legislators above to compare
          </p>
        </div>
      )}

      {ready && (
        <motion.div
          key={`${legA.id}-${legB.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          <VotingComparison a={legA} b={legB} state={selectedState} />
          <div className="h-px bg-border" />
          <FinanceComparison a={legA} b={legB} />
        </motion.div>
      )}
    </div>
  );
};

export default CompareContent;
