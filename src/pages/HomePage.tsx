import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin,
  Search,
  ArrowRight,
  Landmark,
  Building2,
  Building,
  Home,
  Loader2,
  Users,
  FileText,
  Vote,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SiteNav from "@/components/SiteNav";
import { useCivicReps, type CivicGroup, type CivicRep } from "@/hooks/useCivicReps";
import DistrictDashboard from "@/components/DistrictDashboard";
import { nevadaPoliticians } from "@/lib/politicians";

const levelIcons: Record<string, typeof Landmark> = {
  federal: Landmark,
  state: Building2,
  county: Building,
  local: Home,
};

const levelStyles: Record<string, { bg: string; text: string; border: string }> = {
  federal: { bg: "bg-[hsl(250,85%,65%/0.12)]", text: "text-[hsl(250,85%,65%)]", border: "border-[hsl(250,85%,65%/0.25)]" },
  state: { bg: "bg-[hsl(210,80%,55%/0.12)]", text: "text-[hsl(210,80%,55%)]", border: "border-[hsl(210,80%,55%/0.25)]" },
  county: { bg: "bg-[hsl(168,80%,55%/0.12)]", text: "text-[hsl(168,80%,55%)]", border: "border-[hsl(168,80%,55%/0.25)]" },
  local: { bg: "bg-[hsl(43,90%,55%/0.12)]", text: "text-[hsl(43,90%,55%)]", border: "border-[hsl(43,90%,55%/0.25)]" },
};

const partyDot: Record<string, string> = {
  Democrat: "bg-[hsl(210,80%,55%)]",
  Democratic: "bg-[hsl(210,80%,55%)]",
  Republican: "bg-[hsl(0,72%,51%)]",
  Independent: "bg-[hsl(43,90%,55%)]",
  Nonpartisan: "bg-muted-foreground",
};

const EXAMPLE_ADDRESSES = [
  "1600 Las Vegas Blvd S, Las Vegas, NV",
  "200 S Virginia St, Reno, NV",
  "240 Water St, Henderson, NV",
];

const STATS = [
  { label: "Representatives Tracked", value: "100+", icon: Users },
  { label: "Active Bills", value: "500+", icon: FileText },
  { label: "Roll Call Votes", value: "1,200+", icon: Vote },
];

const HomePage = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const { groups, isLoading, error, lookup, elections, voterInfo } = useCivicReps();
  const reps = groups || [];
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSearch = () => {
    if (!address.trim()) return;
    lookup(address.trim());
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  // Match civic reps to politician profiles for linking
  const findPoliticianId = (rep: CivicRep) => {
    const match = nevadaPoliticians.find(
      (p) => p.name.toLowerCase() === rep.name.toLowerCase() ||
        rep.name.toLowerCase().includes(p.name.split(" ").pop()?.toLowerCase() || "___")
    );
    return match?.id;
  };

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background glow effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-[hsl(250,85%,65%/0.08)] blur-[120px]" />
          <div className="absolute right-0 top-32 h-[400px] w-[400px] rounded-full bg-[hsl(168,80%,55%/0.05)] blur-[100px]" />
        </div>

        <div className="container relative mx-auto px-4 pb-10 pt-8 md:pt-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="font-body text-xs text-muted-foreground">
                Nevada's most comprehensive rep tracker
              </span>
            </div>

            <h1 className="font-display text-4xl font-bold leading-tight text-headline md:text-6xl">
              Know who{" "}
              <span className="text-gradient-brand">represents</span>
              {" "}you
            </h1>

            <p className="mx-auto mt-4 max-w-xl font-body text-base text-secondary-custom">
              Enter your address to instantly find your representatives at every level — federal, state, county, and local — with voting records, campaign finance, and more.
            </p>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mx-auto mt-6 max-w-xl"
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter your Nevada address…"
                    className="h-14 rounded-xl border-border bg-card pl-12 pr-4 font-body text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={isLoading || !address.trim()}
                  className="h-14 rounded-xl px-6 gradient-brand font-display font-semibold text-white shadow-glow hover:opacity-90 transition-opacity"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="mr-2 h-5 w-5" />
                      Find Reps
                    </>
                  )}
                </Button>
              </div>

              {/* Example addresses */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="font-body text-xs text-muted-foreground">Try:</span>
                {EXAMPLE_ADDRESSES.map((addr) => (
                  <button
                    key={addr}
                    onClick={() => { setAddress(addr); }}
                    className="rounded-md border border-border px-2.5 py-1 font-body text-[11px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                  >
                    {addr}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-4"
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="mx-auto mb-2 h-5 w-5 text-primary" />
                <p className="font-display text-2xl font-bold text-headline">{stat.value}</p>
                <p className="font-body text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="container mx-auto px-4 pb-8">
          <div className="mx-auto max-w-3xl rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center">
            <p className="font-body text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {reps.length > 0 && (
        <section ref={resultsRef} className="container mx-auto px-4 pb-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-4xl"
          >
            <div className="mb-8 text-center">
              <h2 className="font-display text-2xl font-bold text-headline md:text-3xl">
                Your Representatives
              </h2>
              <p className="mt-2 font-body text-sm text-muted-foreground">
                {reps.reduce((a, g) => a + g.representatives.length, 0)} representatives found at {reps.length} levels of government
              </p>
            </div>

            <div className="space-y-8">
              {reps.map((group, gi) => {
                const style = levelStyles[group.level] || levelStyles.federal;
                const Icon = levelIcons[group.level] || Landmark;

                return (
                  <motion.div
                    key={group.level}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: gi * 0.1 }}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${style.bg}`}>
                        <Icon className={`h-4 w-4 ${style.text}`} />
                      </div>
                      <h3 className="font-display text-sm font-bold uppercase tracking-wider text-headline">
                        {group.label}
                      </h3>
                      <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {group.representatives.length}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {group.representatives.map((rep, ri) => {
                        const politicianId = findPoliticianId(rep);
                        const dot = partyDot[rep.party] || partyDot.Nonpartisan;

                        return (
                          <motion.div
                            key={`${rep.name}-${ri}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: gi * 0.1 + ri * 0.05 }}
                            className={`group relative rounded-xl border ${style.border} bg-card p-4 transition-colors hover:bg-surface-hover ${politicianId ? "cursor-pointer" : ""}`}
                            onClick={() => {
                              if (politicianId) {
                                const pol = nevadaPoliticians.find((p) => p.id === politicianId);
                                navigate(`/politicians/${politicianId}`, { state: { politician: pol } });
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              {rep.photoUrl ? (
                                <img
                                  src={rep.photoUrl}
                                  alt={rep.name}
                                  className="h-12 w-12 rounded-lg object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                              ) : (
                                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${style.bg}`}>
                                  <Icon className={`h-5 w-5 ${style.text}`} />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-display text-sm font-bold text-headline">
                                    {rep.name}
                                  </h4>
                                  <div className={`h-2 w-2 rounded-full ${dot}`} title={rep.party} />
                                </div>
                                <p className="font-body text-xs text-muted-foreground">{rep.office}</p>
                                <p className="mt-0.5 font-body text-[10px] text-muted-foreground/60">{rep.party}</p>
                              </div>
                              {politicianId && (
                                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* District Dashboard */}
          <DistrictDashboard address={address} voterInfo={voterInfo} />
        </section>
      )}

      {/* Featured reps section (shown when no search) */}
      {reps.length === 0 && !isLoading && (
        <section className="container mx-auto px-4 pb-20">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <h2 className="font-display text-2xl font-bold text-headline">
                Featured Representatives
              </h2>
              <p className="mt-2 font-body text-sm text-muted-foreground">
                Explore profiles of Nevada's key elected officials
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {nevadaPoliticians
                .filter((p) => p.level === "federal")
                .slice(0, 6)
                .map((pol, i) => {
                  const style = levelStyles[pol.level];
                  const dot = partyDot[pol.party] || partyDot.Nonpartisan;

                  return (
                    <motion.div
                      key={pol.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => navigate(`/politicians/${pol.id}`, { state: { politician: pol } })}
                      className="group cursor-pointer rounded-xl border border-border bg-card p-4 transition-colors hover:bg-surface-hover"
                    >
                      <div className="flex items-start gap-3">
                        {pol.imageUrl ? (
                          <img
                            src={pol.imageUrl}
                            alt={pol.name}
                            className="h-12 w-12 rounded-lg object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${style.bg}`}>
                            <Landmark className={`h-5 w-5 ${style.text}`} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-display text-sm font-bold text-headline">{pol.name}</h4>
                            <div className={`h-2 w-2 rounded-full ${dot}`} />
                          </div>
                          <p className="font-body text-xs text-muted-foreground">{pol.title}</p>
                          <p className="mt-0.5 font-body text-[10px] text-muted-foreground/60">{pol.party}</p>
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </motion.div>
                  );
                })}
            </div>
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => navigate("/politicians")}
                className="gap-2"
              >
                View all representatives
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="font-body text-xs text-muted-foreground">
            © {new Date().getFullYear()} WhoIsMyRep.ai — Nevada Political Transparency Platform
          </p>
        
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
