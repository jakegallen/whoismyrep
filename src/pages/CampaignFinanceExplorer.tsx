import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  DollarSign,
  Search,
  TrendingUp,
  Wallet,
  PiggyBank,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Users,
  Building2,
  Landmark,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import DashboardHeader from "@/components/DashboardHeader";
import { useFECFinance, formatUSD, getSizeLabel } from "@/hooks/useFECFinance";
import type { FECTotals } from "@/hooks/useFECFinance";
import { nevadaPoliticians } from "@/lib/politicians";
import { Skeleton } from "@/components/ui/skeleton";

const PIE_COLORS = [
  "hsl(0, 72%, 51%)",
  "hsl(210, 80%, 55%)",
  "hsl(142, 71%, 45%)",
  "hsl(43, 90%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(190, 70%, 50%)",
  "hsl(15, 80%, 55%)",
  "hsl(330, 70%, 55%)",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="font-body text-xs font-semibold text-headline">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-body text-[11px]" style={{ color: p.color }}>
          {p.name}: {formatUSD(p.value)}
        </p>
      ))}
    </div>
  );
};

const CampaignFinanceExplorer = () => {
  const navigate = useNavigate();
  // Pre-populate with federal politicians
  const federalPoliticians = nevadaPoliticians.filter((p) => p.level === "federal");
  const [selectedName, setSelectedName] = useState(federalPoliticians[0]?.name || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCycle, setSelectedCycle] = useState<number | undefined>();

  const office = federalPoliticians.find((p) => p.name === selectedName)?.office.includes("Senate")
    ? "senate"
    : "house";

  const { data, isLoading, error } = useFECFinance(selectedName, undefined, office, selectedCycle);

  const currentTotals: FECTotals | undefined = data?.totals?.[0];

  const filteredPoliticians = federalPoliticians.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto max-w-5xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 font-body text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-7 w-7 text-primary" />
            <h1 className="font-display text-3xl font-bold text-headline">
              Campaign Finance Explorer
            </h1>
          </div>
          <p className="font-body text-sm text-tertiary mb-6">
            Real FEC filings for Nevada's federal candidates — contributions, expenditures, and donor breakdowns.
          </p>

          {/* Politician selector */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search politicians..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {filteredPoliticians.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedName(p.name)}
                  className={`rounded-lg px-3 py-2 font-body text-xs font-medium transition-colors ${
                    selectedName === p.name
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-elevated text-foreground hover:bg-surface-hover"
                  }`}
                >
                  {p.name.split(" ").pop()}
                </button>
              ))}
            </div>
          </div>

          {/* Cycle selector */}
          {data?.totals && data.totals.length > 1 && (
            <div className="flex gap-2 mb-6">
              <span className="font-body text-xs text-muted-foreground self-center mr-1">Cycle:</span>
              {data.totals.map((t) => (
                <button
                  key={t.cycle}
                  onClick={() => setSelectedCycle(t.cycle === selectedCycle ? undefined : t.cycle)}
                  className={`rounded-lg px-3 py-1.5 font-body text-xs font-medium transition-colors ${
                    (selectedCycle || data.totals[0].cycle) === t.cycle
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-elevated text-muted-foreground hover:bg-surface-hover"
                  }`}
                >
                  {t.cycle}
                </button>
              ))}
            </div>
          )}

          {isLoading && <ExplorerSkeleton />}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-body text-sm font-medium text-foreground">Couldn't load FEC data</p>
                <p className="mt-1 font-body text-xs text-muted-foreground">
                  {error instanceof Error ? error.message : "Unknown error"}
                </p>
              </div>
            </div>
          )}

          {data && !isLoading && !data.candidate && (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(43,90%,55%)]" />
              <div>
                <p className="font-body text-sm font-medium text-foreground">
                  No FEC records found for "{selectedName}"
                </p>
                <p className="mt-1 font-body text-xs text-muted-foreground">
                  This may be a state/local official without federal filings, or the name may not match FEC records.
                </p>
              </div>
            </div>
          )}

          {data && !isLoading && data.candidate && currentTotals && (
            <div className="space-y-8">
              {/* Candidate header */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Landmark className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="font-display text-lg font-bold text-headline">
                      {data.candidate.name}
                    </h2>
                    <p className="font-body text-xs text-muted-foreground">
                      {data.candidate.party} · {data.candidate.office} · {data.candidate.state}
                      {data.candidate.district ? ` District ${data.candidate.district}` : ""}
                      {data.candidate.incumbentChallenger ? ` · ${data.candidate.incumbentChallenger}` : ""}
                    </p>
                  </div>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <StatCard
                    icon={TrendingUp}
                    label="Total Receipts"
                    value={formatUSD(currentTotals.receipts)}
                    color="hsl(142, 71%, 45%)"
                  />
                  <StatCard
                    icon={Wallet}
                    label="Disbursements"
                    value={formatUSD(currentTotals.disbursements)}
                    color="hsl(0, 72%, 51%)"
                  />
                  <StatCard
                    icon={PiggyBank}
                    label="Cash on Hand"
                    value={formatUSD(currentTotals.cashOnHand)}
                    color="hsl(210, 80%, 55%)"
                  />
                  <StatCard
                    icon={AlertTriangle}
                    label="Debts"
                    value={formatUSD(currentTotals.debts)}
                    color="hsl(43, 90%, 55%)"
                  />
                </div>
              </div>

              {/* Contribution sources breakdown */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Contribution sources */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-display text-sm font-bold text-headline mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Contribution Sources
                  </h3>
                  <div className="space-y-3">
                    <ContributionBar
                      label="Individual Contributions"
                      amount={currentTotals.individualContributions}
                      total={currentTotals.receipts}
                      color="hsl(142, 71%, 45%)"
                    />
                    <ContributionBar
                      label="PAC Contributions"
                      amount={currentTotals.pacContributions}
                      total={currentTotals.receipts}
                      color="hsl(280, 60%, 55%)"
                    />
                    <ContributionBar
                      label="Party Contributions"
                      amount={currentTotals.partyContributions}
                      total={currentTotals.receipts}
                      color="hsl(210, 80%, 55%)"
                    />
                    <ContributionBar
                      label="Candidate Self-Funding"
                      amount={currentTotals.candidateContributions}
                      total={currentTotals.receipts}
                      color="hsl(43, 90%, 55%)"
                    />
                  </div>
                </div>

                {/* Donor size breakdown */}
                {data.donorsBySize && data.donorsBySize.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="font-display text-sm font-bold text-headline mb-4 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      Donations by Size
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={data.donorsBySize.map((d) => ({
                          name: getSizeLabel(d.size),
                          total: d.total,
                        }))}
                      >
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 9, fill: "hsl(215, 12%, 55%)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(v) => formatUSD(v)}
                          tick={{ fontSize: 10, fill: "hsl(215, 12%, 55%)" }}
                          axisLine={false}
                          tickLine={false}
                          width={50}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="total" name="Amount" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Top employers and spending */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Top employers */}
                {data.topEmployers && data.topEmployers.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="font-display text-sm font-bold text-headline mb-4 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Top Donor Employers
                    </h3>
                    <div className="space-y-2">
                      {data.topEmployers.slice(0, 8).map((emp, i) => (
                        <div key={emp.employer} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-body text-[10px] text-muted-foreground w-4 shrink-0">
                              {i + 1}.
                            </span>
                            <span className="font-body text-xs text-foreground truncate">
                              {emp.employer}
                            </span>
                          </div>
                          <span className="font-body text-xs font-semibold text-headline shrink-0">
                            {formatUSD(emp.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spending by purpose */}
                {data.disbursementsByPurpose && data.disbursementsByPurpose.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="font-display text-sm font-bold text-headline mb-4 flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      Spending by Purpose
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={data.disbursementsByPurpose.slice(0, 8).map((d) => ({
                            name: d.purpose,
                            value: d.total,
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="value"
                          stroke="none"
                        >
                          {data.disbursementsByPurpose.slice(0, 8).map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatUSD(value)}
                          contentStyle={{
                            background: "hsl(220, 18%, 10%)",
                            border: "1px solid hsl(220, 14%, 18%)",
                            borderRadius: "8px",
                            fontSize: "11px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {data.disbursementsByPurpose.slice(0, 8).map((d, i) => (
                        <div key={d.purpose} className="flex items-center gap-1.5">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="font-body text-[10px] text-muted-foreground">
                            {d.purpose}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-cycle comparison */}
              {data.totals.length > 1 && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-display text-sm font-bold text-headline mb-4">
                    Fundraising by Cycle
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.totals.map((t) => ({
                      cycle: String(t.cycle),
                      receipts: t.receipts,
                      disbursements: t.disbursements,
                    }))}>
                      <XAxis
                        dataKey="cycle"
                        tick={{ fontSize: 11, fill: "hsl(215, 12%, 55%)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => formatUSD(v)}
                        tick={{ fontSize: 10, fill: "hsl(215, 12%, 55%)" }}
                        axisLine={false}
                        tickLine={false}
                        width={55}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="receipts" name="Receipts" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="disbursements" name="Spent" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <p className="font-body text-[10px] text-muted-foreground text-center">
                Data sourced from the Federal Election Commission (FEC). Updated through {currentTotals.lastReportDate ? new Date(currentTotals.lastReportDate).toLocaleDateString() : "latest filing"}.
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span className="font-body text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="font-display text-lg font-bold text-headline">{value}</p>
    </div>
  );
}

function ContributionBar({
  label,
  amount,
  total,
  color,
}: {
  label: string;
  amount: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-body text-xs text-foreground">{label}</span>
        <span className="font-body text-xs font-semibold text-headline">{formatUSD(amount)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(pct, 1)}%`, background: color }}
        />
      </div>
      <p className="mt-0.5 font-body text-[10px] text-muted-foreground">{pct}% of total</p>
    </div>
  );
}

function ExplorerSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 rounded-xl" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export default CampaignFinanceExplorer;
