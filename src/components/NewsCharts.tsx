import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { NewsItem } from "@/lib/mockNews";

const CATEGORY_COLORS: Record<string, string> = {
  law: "hsl(210, 80%, 55%)",
  policy: "hsl(280, 60%, 55%)",
  politician: "hsl(0, 72%, 51%)",
  social: "hsl(160, 60%, 45%)",
};

const CATEGORY_LABELS: Record<string, string> = {
  law: "Laws",
  policy: "Policy",
  politician: "Politicians",
  social: "Social",
};

interface NewsChartsProps {
  news: NewsItem[];
}

const NewsCharts = ({ news }: NewsChartsProps) => {
  // Category breakdown for pie chart
  const categoryCounts = news.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(categoryCounts).map(([key, value]) => ({
    name: CATEGORY_LABELS[key] || key,
    value,
    color: CATEGORY_COLORS[key] || "hsl(0,0%,50%)",
  }));

  // Source breakdown for bar chart
  const sourceCounts = news.reduce<Record<string, number>>((acc, item) => {
    const source = item.source.length > 15 ? item.source.slice(0, 15) + "…" : item.source;
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const barData = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-card">
        <p className="font-body text-xs font-medium text-foreground">
          {payload[0].name || payload[0].payload?.name}: <span className="text-primary">{payload[0].value}</span>
        </p>
      </div>
    );
  };

  if (news.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-8 rounded-xl border border-border bg-card p-5 shadow-card"
    >
      <div className="mb-5 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-bold text-headline">News Analytics</h2>
        <span className="ml-auto font-body text-xs text-tertiary">{news.length} articles</span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie chart - Category breakdown */}
        <div>
          <h3 className="mb-3 font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            By Category
          </h3>
          <div className="flex items-center gap-4">
            <div className="h-36 w-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="font-body text-xs text-secondary-custom">
                    {entry.name}
                  </span>
                  <span className="font-body text-xs font-semibold text-foreground">
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar chart - Top sources */}
        <div>
          <h3 className="mb-3 font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top Sources
          </h3>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 11, fill: "hsl(215, 12%, 55%)", fontFamily: "Inter" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="hsl(0, 72%, 51%)" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default NewsCharts;
