import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  PiggyBank,
  Wallet,
  Building2,
  Users,
  Landmark,
  Handshake,
  User,
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
  AreaChart,
  Area,
} from "recharts";
import { getCampaignFinance, formatCurrency, type Donor } from "@/lib/campaignFinance";

interface CampaignFinanceProps {
  politicianId: string;
  party: string;
  level: string;
}

const donorTypeIcons: Record<Donor["type"], typeof Building2> = {
  PAC: Landmark,
  Corporation: Building2,
  Individual: User,
  Union: Users,
  Self: Handshake,
};

const donorTypeBg: Record<Donor["type"], string> = {
  PAC: "bg-[hsl(280,60%,55%/0.15)] text-[hsl(280,60%,55%)]",
  Corporation: "bg-[hsl(210,80%,55%/0.15)] text-[hsl(210,80%,55%)]",
  Individual: "bg-[hsl(142,71%,45%/0.15)] text-[hsl(142,71%,45%)]",
  Union: "bg-[hsl(43,90%,55%/0.15)] text-[hsl(43,90%,55%)]",
  Self: "bg-[hsl(0,72%,51%/0.15)] text-[hsl(0,72%,51%)]",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-card">
      <p className="font-body text-xs font-semibold text-headline">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-body text-[11px]" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

const CampaignFinance = ({ politicianId, party, level }: CampaignFinanceProps) => {
  const data = useMemo(
    () => getCampaignFinance(politicianId, party, level),
    [politicianId, party, level]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <DollarSign className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">
          Campaign Finance
        </h2>
        <span className="ml-auto rounded-md bg-surface-elevated px-2 py-1 font-body text-[10px] font-medium text-muted-foreground">
          {data.cycle} Cycle
        </span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <FinanceStat
          icon={TrendingUp}
          label="Total Raised"
          value={formatCurrency(data.totalRaised)}
          color="hsl(142, 71%, 45%)"
        />
        <FinanceStat
          icon={Wallet}
          label="Total Spent"
          value={formatCurrency(data.totalSpent)}
          color="hsl(0, 72%, 51%)"
        />
        <FinanceStat
          icon={PiggyBank}
          label="Cash on Hand"
          value={formatCurrency(data.cashOnHand)}
          color="hsl(210, 80%, 55%)"
        />
      </div>

      {/* Fundraising Trend */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 font-display text-sm font-bold text-headline">
          Fundraising vs. Spending
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.fundraisingTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="raisedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 10, fontFamily: "Inter" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 10, fontFamily: "Inter" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="raised"
                name="Raised"
                stroke="hsl(142, 71%, 45%)"
                strokeWidth={2}
                fill="url(#raisedGrad)"
              />
              <Area
                type="monotone"
                dataKey="spent"
                name="Spent"
                stroke="hsl(0, 72%, 51%)"
                strokeWidth={2}
                fill="url(#spentGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two-column: Spending Breakdown + Top Donors */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Spending by Category */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 font-display text-sm font-bold text-headline">
            Spending Breakdown
          </h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.spendingBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="amount"
                  nameKey="category"
                  strokeWidth={0}
                >
                  {data.spendingBreakdown.map((entry, i) => (
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
                        <p className="font-body text-[11px] text-muted-foreground">
                          {formatCurrency(d.amount)}
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="mt-2 grid grid-cols-2 gap-1">
            {data.spendingBreakdown.map((cat) => (
              <div key={cat.category} className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="truncate font-body text-[10px] text-muted-foreground">
                  {cat.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Donors */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 font-display text-sm font-bold text-headline">
            Top Donors
          </h3>
          <div className="space-y-2">
            {data.topDonors.slice(0, 7).map((donor, idx) => {
              const Icon = donorTypeIcons[donor.type];
              const bgClass = donorTypeBg[donor.type];
              return (
                <motion.div
                  key={donor.name}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.25 }}
                  className="flex items-center gap-2"
                >
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${bgClass}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-xs text-secondary-custom">
                      {donor.name}
                    </p>
                  </div>
                  <span className="shrink-0 font-body text-xs font-semibold text-headline">
                    {formatCurrency(donor.amount)}
                  </span>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-3 border-t border-border pt-2">
            <div className="flex gap-3">
              {(["Individual", "PAC", "Corporation", "Union"] as const).map((t) => (
                <div key={t} className="flex items-center gap-1">
                  <div className={`flex h-4 w-4 items-center justify-center rounded ${donorTypeBg[t]}`}>
                    {(() => { const I = donorTypeIcons[t]; return <I className="h-2 w-2" />; })()}
                  </div>
                  <span className="font-body text-[9px] text-muted-foreground">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="font-body text-[10px] text-muted-foreground/60 italic">
        Campaign finance data is illustrative. Actual filings available via FEC and Nevada Secretary of State.
      </p>
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
      <p className="mt-1.5 font-display text-xl font-bold" style={{ color }}>
        {value}
      </p>
      <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export default CampaignFinance;
