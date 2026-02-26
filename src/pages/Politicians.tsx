import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Building2, Landmark, MapPin, Globe, Search, X, ArrowUpDown, ArrowLeftRight } from "lucide-react";
import { nevadaPoliticians } from "@/lib/politicians";
import PoliticianCard from "@/components/PoliticianCard";
import CompareContent from "@/components/CompareContent";
import { PollingSection } from "@/components/PollingWidgets";
import { approvalRatings, racePolling } from "@/lib/pollingData";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const levelConfig = {
  federal: { label: "Federal", icon: Globe, description: "U.S. Senators & Representatives" },
  state: { label: "State", icon: Landmark, description: "Governor, Constitutional Officers & State Legislators" },
  county: { label: "County", icon: Building2, description: "Clark County & Washoe County Commissioners" },
  local: { label: "Local", icon: MapPin, description: "City Mayors & Council Members" },
} as const;

type Level = keyof typeof levelConfig;
type Tab = "directory" | "compare";

const levels: Level[] = ["federal", "state", "county", "local"];

const Politicians = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("directory");
  const [activeLevel, setActiveLevel] = useState<Level | "all">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "name" | "party" | "region">("default");

  const filtered = useMemo(() => {
    let list = activeLevel === "all"
      ? [...nevadaPoliticians]
      : nevadaPoliticians.filter((p) => p.level === activeLevel);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.party.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          (p.region && p.region.toLowerCase().includes(q))
      );
    }

    if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "party") {
      list.sort((a, b) => a.party.localeCompare(b.party) || a.name.localeCompare(b.name));
    } else if (sortBy === "region") {
      list.sort((a, b) => (a.region ?? "").localeCompare(b.region ?? "") || a.name.localeCompare(b.name));
    }

    return list;
  }, [activeLevel, search, sortBy]);

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

            {/* Tab switcher */}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setTab("directory")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 font-body text-sm font-medium transition-colors ${
                  tab === "directory"
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-elevated text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <Users className="h-4 w-4" />
                Directory
              </button>
              <button
                onClick={() => setTab("compare")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 font-body text-sm font-medium transition-colors ${
                  tab === "compare"
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-elevated text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <ArrowLeftRight className="h-4 w-4" />
                Compare
              </button>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {tab === "compare" ? (
          <CompareContent />
        ) : (
          <>
            {/* Level filter tabs */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
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

            {/* Search & Sort */}
            <div className="mb-6 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, party, title, or region…"
                  className="pl-9 pr-9"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[160px] shrink-0">
                  <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                  <SelectItem value="party">Party</SelectItem>
                  <SelectItem value="region">Region</SelectItem>
                </SelectContent>
              </Select>
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

            {/* Polling section */}
            <PollingSection
              approvalRatings={approvalRatings.filter((r) =>
                activeLevel === "all" || (activeLevel === "federal" && ["U.S. Senator", "U.S. Representative"].some(t => r.title.includes(t))) ||
                (activeLevel === "state" && ["Governor", "Attorney General", "Lt. Governor", "Secretary of State"].some(t => r.title.includes(t)))
              )}
              racePolling={racePolling}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default Politicians;
