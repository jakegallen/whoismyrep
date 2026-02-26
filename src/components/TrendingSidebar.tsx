import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Flame, Newspaper, User, Flag, Bell } from "lucide-react";
import type { TrendingTopic, TrendingIndividual } from "@/lib/mockNews";
import { useAuth } from "@/hooks/useAuth";

// Use party from API data, or fallback to "?"
const getParty = (name: string, apiParty?: string): string => {
  if (apiParty) return apiParty;
  return "?";
};

const partyFullName: Record<string, string> = {
  R: "Republican",
  D: "Democrat",
  I: "Independent",
  L: "Libertarian",
};

const partyBadgeStyle: Record<string, string> = {
  R: "bg-[hsl(0_72%_51%/0.15)] text-[hsl(0,72%,51%)]",
  D: "bg-[hsl(210_80%_55%/0.15)] text-[hsl(210,80%,55%)]",
  I: "bg-[hsl(43_90%_55%/0.15)] text-[hsl(43,90%,55%)]",
  L: "bg-[hsl(50_80%_50%/0.15)] text-[hsl(50,80%,50%)]",
};

const trendIcon = {
  up: <TrendingUp className="h-3.5 w-3.5 text-primary" />,
  down: <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />,
  stable: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
};

type Tab = "stories" | "individuals" | "parties";

interface TrendingSidebarProps {
  topics: TrendingTopic[];
  individuals: TrendingIndividual[];
}

interface PartyAggregate {
  party: string;
  fullName: string;
  totalMentions: number;
  memberCount: number;
  trend: "up" | "down" | "stable";
}

const TrendingSidebar = ({ topics, individuals }: TrendingSidebarProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("stories");

  // Aggregate individuals by party
  const partyData = useMemo<PartyAggregate[]>(() => {
    const map: Record<string, { mentions: number; count: number; ups: number; downs: number }> = {};

    individuals.forEach((person) => {
      const p = getParty(person.name, person.party);
      if (!map[p]) map[p] = { mentions: 0, count: 0, ups: 0, downs: 0 };
      map[p].mentions += person.mentions;
      map[p].count += 1;
      if (person.trend === "up") map[p].ups += 1;
      if (person.trend === "down") map[p].downs += 1;
    });

    return Object.entries(map)
      .map(([party, data]) => ({
        party,
        fullName: partyFullName[party] || party,
        totalMentions: data.mentions,
        memberCount: data.count,
        trend: (data.ups > data.downs ? "up" : data.downs > data.ups ? "down" : "stable") as "up" | "down" | "stable",
      }))
      .sort((a, b) => b.totalMentions - a.totalMentions);
  }, [individuals]);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "stories", label: "Stories", icon: Newspaper },
    { key: "individuals", label: "People", icon: User },
    { key: "parties", label: "Parties", icon: Flag },
  ];

  const footerText: Record<Tab, string> = {
    stories: "Top stories across U.S. news outlets and social media.",
    individuals: "Most mentioned politicians ranked by news frequency.",
    parties: "Party engagement aggregated from individual politician mentions.",
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-xl border border-border bg-card p-5 shadow-card"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-bold text-headline">Trending</h2>
        </div>
        <Link
          to={user ? "/alerts" : "/auth"}
          className="flex items-center gap-1.5 rounded-lg bg-surface-elevated px-2.5 py-1.5 font-body text-[11px] font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <Bell className="h-3 w-3" />
          Alerts
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex rounded-lg bg-surface-elevated p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-body text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Stories tab */}
      {activeTab === "stories" && (
        <motion.div key="stories" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-3">
          {topics.map((topic, i) => (
            <div key={topic.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-hover">
              <div className="flex items-center gap-3">
                <span className="font-body text-xs font-bold text-tertiary">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-body text-sm font-medium text-foreground">{topic.topic}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-body text-xs text-muted-foreground">{topic.mentions.toLocaleString()}</span>
                {trendIcon[topic.trend]}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Individuals tab */}
      {activeTab === "individuals" && (
        <motion.div key="individuals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-3">
          {individuals.map((person, i) => (
            <div key={person.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-hover">
              <div className="flex items-center gap-3">
                <span className="font-body text-xs font-bold text-tertiary">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <span className="block truncate font-body text-sm font-medium text-foreground">
                    {person.name} <span className="text-muted-foreground">({getParty(person.name, person.party)})</span>
                  </span>
                  <span className="block font-body text-[10px] text-muted-foreground">{person.title}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-body text-xs text-muted-foreground">{person.mentions.toLocaleString()}</span>
                {trendIcon[person.trend]}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Parties tab */}
      {activeTab === "parties" && (
        <motion.div key="parties" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-3">
          {partyData.map((party, i) => {
            const totalAll = partyData.reduce((s, p) => s + p.totalMentions, 0);
            const pct = totalAll > 0 ? Math.round((party.totalMentions / totalAll) * 100) : 0;

            return (
              <div key={party.party} className="rounded-lg px-3 py-3 transition-colors hover:bg-surface-hover">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-body text-xs font-bold text-tertiary">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-body text-sm font-bold text-foreground">{party.fullName}</span>
                        <span className={`inline-flex rounded-md px-1.5 py-0.5 font-body text-[10px] font-bold ${partyBadgeStyle[party.party] || "bg-muted text-muted-foreground"}`}>
                          {party.party}
                        </span>
                      </div>
                      <span className="font-body text-[10px] text-muted-foreground">
                        {party.memberCount} {party.memberCount === 1 ? "member" : "members"} trending
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-body text-xs text-muted-foreground">{party.totalMentions.toLocaleString()}</span>
                    {trendIcon[party.trend]}
                  </div>
                </div>
                {/* Engagement bar */}
                <div className="mt-2 ml-8">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-body text-[10px] text-muted-foreground">Engagement share</span>
                    <span className="font-body text-[10px] font-semibold text-foreground">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-elevated overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: party.party === "R" ? "hsl(0, 72%, 51%)" : party.party === "D" ? "hsl(210, 80%, 55%)" : "hsl(43, 90%, 55%)" }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      <div className="mt-5 rounded-lg bg-surface-elevated p-4">
        <p className="font-body text-xs font-medium text-secondary-custom">
          {footerText[activeTab]}
        </p>
      </div>
    </motion.aside>
  );
};

export default TrendingSidebar;
