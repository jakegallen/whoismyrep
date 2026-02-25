import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Building2, Landmark, MapPin, Globe } from "lucide-react";
import { nevadaPoliticians } from "@/lib/politicians";
import PoliticianCard from "@/components/PoliticianCard";

const levelConfig = {
  federal: { label: "Federal", icon: Globe, description: "U.S. Senators & Representatives" },
  state: { label: "State", icon: Landmark, description: "Governor, Constitutional Officers & State Legislators" },
  county: { label: "County", icon: Building2, description: "Clark County & Washoe County Commissioners" },
  local: { label: "Local", icon: MapPin, description: "City Mayors & Council Members" },
} as const;

type Level = keyof typeof levelConfig;

const levels: Level[] = ["federal", "state", "county", "local"];

const Politicians = () => {
  const navigate = useNavigate();
  const [activeLevel, setActiveLevel] = useState<Level | "all">("all");

  const filtered = activeLevel === "all"
    ? nevadaPoliticians
    : nevadaPoliticians.filter((p) => p.level === activeLevel);

  const grouped = levels
    .map((level) => ({
      level,
      ...levelConfig[level],
      politicians: filtered.filter((p) => p.level === level),
    }))
    .filter((g) => g.politicians.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-hero border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4">
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-1.5 font-body text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to News
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-headline">
                Nevada Politicians
              </h1>
            </div>
            <p className="mt-2 max-w-xl font-body text-sm text-tertiary">
              {nevadaPoliticians.length} elected officials from federal to local level. Click a profile for AI-powered analysis.
            </p>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Level filter tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveLevel("all")}
            className={`relative flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 font-body text-sm font-medium transition-colors ${
              activeLevel === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            All ({nevadaPoliticians.length})
          </button>
          {levels.map((level) => {
            const config = levelConfig[level];
            const Icon = config.icon;
            const count = nevadaPoliticians.filter((p) => p.level === level).length;
            return (
              <button
                key={level}
                onClick={() => setActiveLevel(level)}
                className={`relative flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 font-body text-sm font-medium transition-colors ${
                  activeLevel === level
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {config.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Grouped sections */}
        {grouped.map((group) => (
          <section key={group.level} className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <group.icon className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold text-headline">{group.label}</h2>
              <span className="font-body text-xs text-muted-foreground">— {group.description}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.politicians.map((politician) => (
                <PoliticianCard
                  key={politician.id}
                  politician={politician}
                  onClick={() =>
                    navigate(`/politicians/${politician.id}`, {
                      state: { politician },
                    })
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};

export default Politicians;
