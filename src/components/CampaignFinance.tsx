import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  PiggyBank,
  Wallet,
  Building2,
  Users,
  Landmark,
  User,
  Loader2,
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
import type {
  FECResponse,
  TopEmployer,
  DisbursementByPurpose,
  DonorBySize,
} from "@/hooks/useFECFinance";
import { formatUSD, getSizeLabel } from "@/hooks/useFECFinance";

interface CampaignFinanceProps {
  fecData?: FECResponse | null;
  isLoading?: boolean;
  level: string;
  error?: string | null;
}

const SPENDING_COLORS = [
  "hsl(0, 72%, 51%)",
  "hsl(210, 80%, 55%)",
  "hsl(142, 71%, 45%)",
  "hsl(43, 90%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(190, 70%, 50%)",
  "hsl(15, 80%, 55%)",
  "hsl(330, 60%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(50, 80%, 50%)",
];

const DONOR_SIZE_COLORS = [
  "hsl(142, 71%, 45%)",
  "hsl(210, 80%, 55%)",
  "hsl(43, 90%, 55%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 60%, 55%)",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-card">
      <p className="font-body text-xs font-semibold text-headline">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-body text-[11px]" style={{ color: p.color }}>
          {p.name}: {formatUSD(p.value)}
        </p>
      ))}
    </div>
  );
};

const CampaignFinance = ({ fecData, isLoading, level, error }: CampaignFinanceProps) => {
  const totals = fecData?.totals?.[0];

  // No FEC data available
  if (!isLoading && !totals) {
    if (level !== "federal") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold text-headline">Campaign Finance</h2>
          </div>
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <DollarSign className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 font-body text-sm text-muted-foreground">
              FEC campaign finance data is only available for federal candidates.
            </p>
            <p className="mt-1 font-body text-xs text-muted-foreground/60">
              State and local campaign finance data varies by jurisdiction.
            </p>
          </div>
        </div>
      );
    }

    // Distinguish API error from genuinely empty data
    if (error) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold text-headline">Campaign Finance</h2>
          </div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-8 text-center">
            <DollarSign className="mx-auto h-8 w-8 text-destructive/40" />
            <p className="mt-3 font-body text-sm text-foreground">
              Unable to load campaign finance data.
            </p>
            <p className="mt-1 font-body text-xs text-muted-foreground">
              Data sourced from the Federal Election Commission (FEC).
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold text-headline">Campaign Finance</h2>
        </div>
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <DollarSign className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 font-body text-sm text-muted-foreground">
            No FEC campaign finance data found for this candidate.
          </p>
          <p className="mt-1 font-body text-xs text-muted-foreground/60">
            Data sourced from the Federal Election Commission (FEC).
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold text-headline">Campaign Finance</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Build chart data from real FEC response
  const disbursements = (fecData?.disbursementsByPurpose || [])
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((d, i) => ({
      category: formatPurpose(d.purpose),
      amount: Math.round(d.total),
      color: SPENDING_COLORS[i % SPENDING_COLORS.length],
    }));

  const donorsBySize = (fecData?.donorsBySize || [])
    .filter((d) => d.total > 0)
    .sort((a, b) => a.size - b.size)
    .map((d, i) => ({
      label: getSizeLabel(d.size),
      amount: Math.round(d.total),
      count: d.count,
      color: DONOR_SIZE_COLORS[i % DONOR_SIZE_COLORS.length],
    }));

  const topEmployers = (fecData?.topEmployers || [])
    .filter((e) => e.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Contribution source breakdown for bar chart
  const contributionSources = [];
  if (totals!.individualContributions > 0) contributionSources.push({ source: "Individual", amount: Math.round(totals!.individualContributions) });
  if (totals!.pacContributions > 0) contributionSources.push({ source: "PAC", amount: Math.round(totals!.pacContributions) });
  if (totals!.partyContributions > 0) contributionSources.push({ source: "Party", amount: Math.round(totals!.partyContributions) });
  if (totals!.candidateContributions > 0) contributionSources.push({ source: "Self", amount: Math.round(totals!.candidateContributions) });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <DollarSign className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">Campaign Finance</h2>
        {(() => {
          const cycle = totals!.cycle
            || (totals!.lastReportDate
              ? (() => { const y = new Date(totals!.lastReportDate).getFullYear(); return y % 2 === 0 ? y : y + 1; })()
              : null);
          return cycle ? (
            <span className="ml-auto rounded-md bg-surface-elevated px-2 py-1 font-body text-[10px] font-medium text-muted-foreground">
              {cycle} Cycle
            </span>
          ) : null;
        })()}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <FinanceStat icon={TrendingUp} label="Total Raised" value={formatUSD(totals!.receipts)} color="hsl(142, 71%, 45%)" />
        <FinanceStat icon={Wallet} label="Total Spent" value={formatUSD(totals!.disbursements)} color="hsl(0, 72%, 51%)" />
        <FinanceStat icon={PiggyBank} label="Cash on Hand" value={formatUSD(totals!.cashOnHand)} color="hsl(210, 80%, 55%)" />
      </div>

      {/* Contribution Sources Bar Chart */}
      {contributionSources.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 font-display text-sm font-bold text-headline">
            Contribution Sources
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contributionSources} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis
                  dataKey="source"
                  tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 10, fontFamily: "Inter" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 10, fontFamily: "Inter" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatUSD(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" name="Amount" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Two-column: Spending Breakdown + Top Employers */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Spending by Purpose */}
        {disbursements.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-3 font-display text-sm font-bold text-headline">
              Spending Breakdown
            </h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={disbursements}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="amount"
                    nameKey="category"
                    strokeWidth={0}
                  >
                    {disbursements.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-card">
                          <p className="font-body text-xs font-semibold text-headline">{d.category}</p>
                          <p className="font-body text-[11px] text-muted-foreground">{formatUSD(d.amount)}</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {disbursements.map((cat) => (
                <div key={cat.category} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="truncate font-body text-[10px] text-muted-foreground">{cat.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Employers / Donors */}
        {topEmployers.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-3 font-display text-sm font-bold text-headline">
              Top Employer/Donors
            </h3>
            <div className="space-y-2">
              {topEmployers.map((emp, idx) => (
                <motion.div
                  key={emp.employer}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.25 }}
                  className="flex items-center gap-2"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[hsl(210,80%,55%/0.15)] text-[hsl(210,80%,55%)]">
                    <Building2 className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-xs text-secondary-custom">{emp.employer}</p>
                  </div>
                  <span className="shrink-0 font-body text-xs font-semibold text-headline">{formatUSD(emp.total)}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Donor Size Breakdown */}
      {donorsBySize.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 font-display text-sm font-bold text-headline">
            Donations by Size
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={donorsBySize} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 9, fontFamily: "Inter" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 10, fontFamily: "Inter" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatUSD(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" name="Total" radius={[4, 4, 0, 0]}>
                  {donorsBySize.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Data source */}
      <div className="flex items-center gap-2">
        <p className="font-body text-[10px] text-muted-foreground/60 italic">
          Data sourced from the Federal Election Commission (FEC).
          {totals!.lastReportDate && ` Last report: ${new Date(totals!.lastReportDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}.`}
        </p>
      </div>
    </div>
  );
};

function FinanceStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-center">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
      <p className="mt-1.5 font-display text-xl font-bold" style={{ color }}>{value}</p>
      <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

/** Clean up FEC disbursement purpose strings */
function formatPurpose(raw: string): string {
  if (!raw) return "Other";
  // FEC purposes are often ALL CAPS — title-case them
  return raw
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .replace(/^(.{30}).+$/, "$1...");
}

export default CampaignFinance;
