import { useState, useMemo } from "react";
import SiteNav from "@/components/SiteNav";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Building2, Landmark, MapPin, Globe, Search, X, ArrowUpDown, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { US_STATES } from "@/lib/usStates";
import { useLegislators, type Legislator } from "@/hooks/useLegislators";

const chamberConfig = {
  Senate: { icon: Landmark, color: "bg-amber-500/20 text-amber-400" },
  Assembly: { icon: Building2, color: "bg-blue-500/20 text-blue-400" },
} as const;

const Politicians = () => {
  const navigate = useNavigate();
  const [selectedState, setSelectedState] = useState("NV");
  const [search, setSearch] = useState("");
  const [chamberFilter, setChamberFilter] = useState<"all" | "Senate" | "Assembly">("all");
  const [sortBy, setSortBy] = useState<"default" | "name" | "party">("default");

  const jurisdiction = US_STATES.find((s) => s.abbr === selectedState)?.jurisdiction || "Nevada";
  const stateName = US_STATES.find((s) => s.abbr === selectedState)?.name || "Nevada";

  const { legislators, isLoading, error, refetch } = useLegislators(
    chamberFilter === "Senate" ? "upper" : chamberFilter === "Assembly" ? "lower" : undefined,
    jurisdiction
  );

  const filtered = useMemo(() => {
    let list = [...legislators];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.party.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.district.toLowerCase().includes(q)
      );
    }

    if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "party") {
      list.sort((a, b) => a.party.localeCompare(b.party) || a.name.localeCompare(b.name));
    }

    return list;
  }, [legislators, search, sortBy]);

  const senateCt = legislators.filter((l) => l.chamber === "Senate").length;
  const assemblyCt = legislators.filter((l) => l.chamber === "Assembly").length;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
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
                Back to Home
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-headline">
                State Officials Directory
              </h1>
            </div>
            <p className="mt-2 max-w-xl font-body text-sm text-tertiary">
              Browse state legislators across all 50 states via OpenStates. Select a state to see its current officeholders.
            </p>

            {/* State selector */}
            <div className="mt-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {US_STATES.map((s) => (
                    <SelectItem key={s.abbr} value={s.abbr}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Chamber filter tabs */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
          {(["all", "Senate", "Assembly"] as const).map((tab) => {
            const count = tab === "all" ? legislators.length : tab === "Senate" ? senateCt : assemblyCt;
            const Icon = tab === "all" ? Users : tab === "Senate" ? Landmark : Building2;
            return (
              <button
                key={tab}
                onClick={() => setChamberFilter(tab)}
                className={`relative flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 font-body text-sm font-medium transition-colors ${
                  chamberFilter === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab === "all" ? "All" : tab} ({count})
              </button>
            );
          })}
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={refetch} disabled={isLoading} className="gap-1.5 text-muted-foreground">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, party, or district…"
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
            </SelectContent>
          </Select>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-body text-sm font-medium text-foreground">Failed to load legislators</p>
              <p className="font-body text-xs text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={refetch}>Retry</Button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 font-body text-sm text-muted-foreground">Loading {stateName} legislators…</p>
          </div>
        )}

        {/* Legislators grid */}
        {!isLoading && !error && (
          <>
            <p className="mb-4 font-body text-xs text-muted-foreground">
              Showing {filtered.length} of {legislators.length} {stateName} legislators
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((leg) => (
                <LegislatorRow key={leg.id} legislator={leg} onClick={() => {
                  const repId = leg.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
                  navigate(`/politicians/${repId}`, {
                    state: {
                      civicRep: {
                        name: leg.name,
                        office: leg.title,
                        party: leg.party,
                        level: "state",
                        photoUrl: leg.imageUrl,
                        phone: undefined,
                        email: leg.email,
                        website: leg.website,
                        channels: [],
                        jurisdiction,
                      },
                    },
                  });
                }} />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center py-16">
                <Users className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 font-body text-sm text-muted-foreground">No legislators found.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

function LegislatorRow({ legislator, onClick }: { legislator: Legislator; onClick: () => void }) {
  const config = chamberConfig[legislator.chamber] || chamberConfig.Assembly;
  const Icon = config.icon;
  const partyDot =
    legislator.party === "Democrat" || legislator.party === "Democratic"
      ? "bg-[hsl(217,72%,48%)]"
      : legislator.party === "Republican"
      ? "bg-[hsl(0,68%,48%)]"
      : "bg-muted-foreground";

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-surface-hover"
    >
      {legislator.imageUrl ? (
        <img
          src={legislator.imageUrl}
          alt={legislator.name}
          className="h-12 w-12 rounded-lg object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${config.color}`}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-display text-sm font-bold text-headline truncate">{legislator.name}</h4>
          <div className={`h-2 w-2 shrink-0 rounded-full ${partyDot}`} title={legislator.party} />
        </div>
        <p className="font-body text-xs text-muted-foreground truncate">{legislator.title}</p>
        <p className="mt-0.5 font-body text-[10px] text-muted-foreground/60">{legislator.party} · {legislator.chamber}</p>
      </div>
    </motion.button>
  );
}

export default Politicians;
