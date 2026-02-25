import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Flame, Newspaper, User } from "lucide-react";
import type { TrendingTopic, TrendingIndividual } from "@/lib/mockNews";

const trendIcon = {
  up: <TrendingUp className="h-3.5 w-3.5 text-primary" />,
  down: <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />,
  stable: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
};

type Tab = "stories" | "individuals";

interface TrendingSidebarProps {
  topics: TrendingTopic[];
  individuals: TrendingIndividual[];
}

const TrendingSidebar = ({ topics, individuals }: TrendingSidebarProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("stories");

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-xl border border-border bg-card p-5 shadow-card"
    >
      <div className="mb-4 flex items-center gap-2">
        <Flame className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-bold text-headline">Trending</h2>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex rounded-lg bg-surface-elevated p-1">
        <button
          onClick={() => setActiveTab("stories")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-body text-xs font-medium transition-colors ${
            activeTab === "stories"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Newspaper className="h-3 w-3" />
          Stories
        </button>
        <button
          onClick={() => setActiveTab("individuals")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-body text-xs font-medium transition-colors ${
            activeTab === "individuals"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-3 w-3" />
          Individuals
        </button>
      </div>

      {/* Stories tab */}
      {activeTab === "stories" && (
        <motion.div
          key="stories"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {topics.map((topic, i) => (
            <div
              key={topic.id}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-hover"
            >
              <div className="flex items-center gap-3">
                <span className="font-body text-xs font-bold text-tertiary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-body text-sm font-medium text-foreground">
                  {topic.topic}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-body text-xs text-muted-foreground">
                  {topic.mentions.toLocaleString()}
                </span>
                {trendIcon[topic.trend]}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Individuals tab */}
      {activeTab === "individuals" && (
        <motion.div
          key="individuals"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {individuals.map((person, i) => (
            <div
              key={person.id}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-hover"
            >
              <div className="flex items-center gap-3">
                <span className="font-body text-xs font-bold text-tertiary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <span className="block truncate font-body text-sm font-medium text-foreground">
                    {person.name} <span className="text-muted-foreground">({person.party})</span>
                  </span>
                  <span className="block font-body text-[10px] text-muted-foreground">
                    {person.title}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-body text-xs text-muted-foreground">
                  {person.mentions.toLocaleString()}
                </span>
                {trendIcon[person.trend]}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <div className="mt-5 rounded-lg bg-surface-elevated p-4">
        <p className="font-body text-xs font-medium text-secondary-custom">
          {activeTab === "stories"
            ? "Top stories across Nevada news outlets and social media."
            : "Most mentioned Nevada politicians ranked by news frequency."}
        </p>
      </div>
    </motion.aside>
  );
};

export default TrendingSidebar;
