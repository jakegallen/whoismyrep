import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin,
  Search,
  Landmark,
  Building2,
  Building,
  Home,
  Loader2,
  Users,
  FileText,
  Vote,
  ChevronRight,
  Shield,
  BarChart3,
  DollarSign,
  Scale,
  Globe,
  Star,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Button } from "@/components/ui/button";
import SiteNav from "@/components/SiteNav";
import { SocialIcons } from "@/components/SocialIcons";
import { useCivicReps, type CivicRep } from "@/hooks/useCivicReps";
import DistrictDashboard from "@/components/DistrictDashboard";
import { US_STATES } from "@/lib/usStates";

const levelIcons: Record<string, typeof Landmark> = {
  federal: Landmark,
  state: Building2,
  county: Building,
  local: Home,
};

const levelStyles: Record<string, { bg: string; text: string; border: string }> = {
  federal: { bg: "bg-[hsl(217,72%,42%/0.12)]", text: "text-[hsl(217,72%,42%)]", border: "border-[hsl(217,72%,42%/0.25)]" },
  state: { bg: "bg-[hsl(0,68%,48%/0.12)]", text: "text-[hsl(0,68%,48%)]", border: "border-[hsl(0,68%,48%/0.25)]" },
  county: { bg: "bg-[hsl(220,20%,45%/0.12)]", text: "text-[hsl(220,20%,45%)]", border: "border-[hsl(220,20%,45%/0.25)]" },
  local: { bg: "bg-[hsl(43,90%,48%/0.12)]", text: "text-[hsl(43,90%,48%)]", border: "border-[hsl(43,90%,48%/0.25)]" },
};

const partyDot: Record<string, string> = {
  Democrat: "bg-[hsl(217,72%,48%)]",
  Democratic: "bg-[hsl(217,72%,48%)]",
  Republican: "bg-[hsl(0,68%,48%)]",
  Independent: "bg-[hsl(43,90%,48%)]",
  Nonpartisan: "bg-muted-foreground",
};

const EXAMPLE_ADDRESSES = [
  "1600 Pennsylvania Ave NW, Washington, DC",
  "200 N Spring St, Los Angeles, CA",
  "100 State St, Albany, NY",
  "500 S State St, Chicago, IL",
];

const STATS = [
  { label: "States + D.C. Covered", value: "51", icon: Globe },
  { label: "Elected Officials", value: "7,500+", icon: Users },
  { label: "Bills Tracked", value: "100K+", icon: FileText },
  { label: "Data Sources", value: "12+", icon: BarChart3 },
];

const FEATURES = [
  {
    icon: Users,
    title: "Every Level of Government",
    desc: "From the U.S. Senate to your city council — see everyone who represents you in one place.",
  },
  {
    icon: Vote,
    title: "Live Voting Records",
    desc: "Track how your representatives vote on the issues that matter most, powered by OpenStates.",
  },
  {
    icon: DollarSign,
    title: "Campaign Finance",
    desc: "Follow the money — see who funds your officials with real-time FEC data.",
  },
  {
    icon: Scale,
    title: "Court Cases & Lobbying",
    desc: "Discover court opinions and lobbying activity connected to your representatives.",
  },
  {
    icon: Shield,
    title: "AI-Powered Analysis",
    desc: "Get plain-language summaries and accountability insights for every politician.",
  },
  {
    icon: BarChart3,
    title: "Prediction Markets",
    desc: "See real-time odds from Polymarket on elections and policy outcomes.",
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const [searchMode, setSearchMode] = useState<"address" | "name">("address");
  const [nameQuery, setNameQuery] = useState("");
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

  return (
    <div className="min-h-screen bg-background">

      {/* ═══════ HERO ═══════ */}
      <section className="relative overflow-hidden">
        {/* Background glow effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[700px] w-[1000px] rounded-full bg-[hsl(217,72%,42%/0.06)] blur-[140px]" />
          <div className="absolute right-0 top-40 h-[400px] w-[400px] rounded-full bg-[hsl(0,68%,48%/0.04)] blur-[100px]" />
          <div className="absolute left-0 bottom-0 h-[300px] w-[300px] rounded-full bg-[hsl(43,90%,48%/0.04)] blur-[80px]" />
        </div>

        <div className="container relative mx-auto px-4 pb-12 pt-10 md:pt-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
              <Star className="h-3.5 w-3.5 text-primary" />
              <span className="font-body text-xs font-medium text-primary">
                The nationwide political transparency platform
              </span>
            </div>

            <h1 className="font-display text-4xl font-bold leading-[1.1] text-headline md:text-6xl lg:text-7xl">
              Know who{" "}
              <span className="text-gradient-brand">represents</span>
              {" "}you
            </h1>

            <p className="mx-auto mt-5 max-w-xl font-body text-base leading-relaxed text-secondary-custom md:text-lg">
              Enter any U.S. address to instantly discover your elected officials — from Congress to city hall — with voting records, campaign finance, and AI-powered analysis.
            </p>

            {/* Search mode toggle */}
            <div className="mx-auto mt-6 flex items-center justify-center gap-1 rounded-full border border-border bg-card/50 p-1 backdrop-blur-sm w-fit">
              <button
                onClick={() => setSearchMode("address")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-body text-xs font-medium transition-all ${
                  searchMode === "address"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                By Address
              </button>
              <button
                onClick={() => setSearchMode("name")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-body text-xs font-medium transition-all ${
                  searchMode === "name"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                By Name
              </button>
            </div>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mx-auto mt-4 max-w-xl"
            >
              {searchMode === "address" ? (
                <>
                  <div className="flex gap-2">
                    <AddressAutocomplete
                      value={address}
                      onChange={setAddress}
                      onSelect={(addr) => {
                        setAddress(addr);
                        lookup(addr);
                        setTimeout(() => {
                          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 300);
                      }}
                      placeholder="Enter your U.S. address…"
                      disabled={isLoading}
                      inputClassName="h-14 rounded-xl border-border bg-card pl-12 pr-4 font-body text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                    />
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
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        value={nameQuery}
                        onChange={(e) => setNameQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && nameQuery.trim()) {
                            navigate(`/politicians?q=${encodeURIComponent(nameQuery.trim())}&level=federal`);
                          }
                        }}
                        placeholder="Search by representative name…"
                        className="h-14 rounded-xl border-border bg-card pl-12 pr-4 font-body text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (nameQuery.trim()) {
                          navigate(`/politicians?q=${encodeURIComponent(nameQuery.trim())}&level=federal`);
                        }
                      }}
                      disabled={!nameQuery.trim()}
                      className="h-14 rounded-xl px-6 gradient-brand font-display font-semibold text-white shadow-glow hover:opacity-90 transition-opacity"
                    >
                      <Search className="mr-2 h-5 w-5" />
                      Search
                    </Button>
                  </div>

                  {/* Example names */}
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <span className="font-body text-xs text-muted-foreground">Try:</span>
                    {["Nancy Pelosi", "Ted Cruz", "Alexandria Ocasio-Cortez"].map((name) => (
                      <button
                        key={name}
                        onClick={() => setNameQuery(name)}
                        className="rounded-md border border-border px-2.5 py-1 font-body text-[11px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card/50 p-4 text-center backdrop-blur-sm">
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

      {/* ═══════ RESULTS ═══════ */}
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
                        const dot = partyDot[rep.party] || partyDot.Nonpartisan;

                        return (
                          <motion.div
                            key={`${rep.name}-${ri}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: gi * 0.1 + ri * 0.05 }}
                            className={`group relative cursor-pointer rounded-xl border ${style.border} bg-card p-4 transition-colors hover:bg-surface-hover`}
                            onClick={() => {
                              const repId = rep.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
                              navigate(`/politicians/${repId}`, { state: { civicRep: rep } });
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
                                <SocialIcons socialHandles={rep.socialHandles} size="sm" className="mt-1" />
                              </div>
                              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
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

      {/* ═══════ FEATURES (shown when no search) ═══════ */}
      {reps.length === 0 && !isLoading && (
        <section className="container mx-auto px-4 pb-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <h2 className="font-display text-2xl font-bold text-headline md:text-3xl">
                Everything you need to hold power accountable
              </h2>
              <p className="mx-auto mt-3 max-w-lg font-body text-sm text-muted-foreground">
                One address. Every elected official. Complete transparency.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feat, i) => (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-glow"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <feat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display text-sm font-bold text-headline">{feat.title}</h3>
                  <p className="mt-2 font-body text-xs leading-relaxed text-muted-foreground">{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════ HOW IT WORKS ═══════ */}
      {reps.length === 0 && !isLoading && (
        <section className="border-t border-border py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl">
              <div className="mb-10 text-center">
                <h2 className="font-display text-2xl font-bold text-headline">
                  How It Works
                </h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                {[
                  { step: "1", icon: MapPin, title: "Enter Your Address", desc: "Type any U.S. address — we'll identify your districts at every level of government." },
                  { step: "2", icon: Users, title: "See Your Reps", desc: "Get a complete list of your elected officials, from the U.S. Senate to city council." },
                  { step: "3", icon: FileText, title: "Dig Deeper", desc: "Explore voting records, campaign finance, bills, court cases, and AI analysis." },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="relative rounded-xl border border-border bg-card p-6 text-center"
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full gradient-brand font-display text-xs font-bold text-white">
                      {item.step}
                    </div>
                    <div className="mx-auto mb-3 mt-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-display text-sm font-bold text-headline">{item.title}</h3>
                    <p className="mt-2 font-body text-xs text-muted-foreground">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════ EXPLORE BY STATE ═══════ */}
      <section id="states" className="border-t border-border py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
              <div className="flex-1">
                <h2 className="font-display text-2xl font-bold text-headline">
                  Explore by State
                </h2>
                <p className="mt-1 font-body text-sm text-muted-foreground">
                  Browse legislators, bills, and district maps for all 50 states + D.C.
                </p>
              </div>
              <Link
                to="/bills"
                className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-4 py-2 font-body text-sm font-medium text-primary transition-colors hover:bg-primary/15"
              >
                Browse All Bills <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
              {US_STATES.map((state) => (
                <Link
                  key={state.abbr}
                  to={`/state/${state.abbr.toLowerCase()}`}
                  className="flex flex-col items-center rounded-lg border border-border bg-card p-2.5 text-center transition-all hover:border-primary/40 hover:bg-surface-hover hover:shadow-sm"
                >
                  <span className="font-display text-sm font-bold text-headline">{state.abbr}</span>
                  <span className="font-body text-[9px] text-muted-foreground leading-tight truncate w-full">{state.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      {reps.length === 0 && !isLoading && (
        <section className="border-t border-border">
          <div className="container mx-auto px-4 py-16">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center md:p-12"
            >
              <h2 className="font-display text-2xl font-bold text-headline md:text-3xl">
                Ready to know your reps?
              </h2>
              <p className="mx-auto mt-3 max-w-md font-body text-sm text-muted-foreground">
                Join thousands of Americans using WhoIsMyRep.us to stay informed about their elected officials.
              </p>
              <Button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="mt-6 h-12 rounded-xl px-8 gradient-brand font-display font-semibold text-white shadow-glow hover:opacity-90 transition-opacity"
              >
                <Search className="mr-2 h-4 w-4" />
                Look Up Your Address
              </Button>
            </motion.div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {/* Brand */}
              <div className="sm:col-span-2 lg:col-span-1">
                <Link to="/" className="flex items-center gap-2">
                  <img src="/logo.png" alt="WhoIsMyRep.us logo" className="h-7 w-7 rounded-lg" />
                  <span className="font-display text-base font-bold text-headline">
                    WhoIsMyRep<span className="text-gradient-brand">.us</span>
                  </span>
                </Link>
                <p className="mt-3 font-body text-xs leading-relaxed text-muted-foreground">
                  A free, nonpartisan platform for U.S. political transparency. Data sourced from Congress.gov, OpenStates, FEC, CourtListener, and more.
                </p>
              </div>

              {/* Explore */}
              <div>
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-headline mb-3">Explore</h4>
                <div className="flex flex-col gap-2">
                  <Link to="/bills" className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">Bills</Link>
                  <Link to="/politicians" className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">Politicians</Link>
                  <Link to="/district-map" className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">District Map</Link>
                  <Link to="/committees" className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">Committees</Link>
                  <Link to="/calendar" className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">Legislative Calendar</Link>
                </div>
              </div>

              {/* Data */}
              <div>
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-headline mb-3">Data</h4>
                <div className="flex flex-col gap-2">
                  <Link to="/congress-trades" className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">Stock Tracker</Link>
                  <Link to="/campaign-finance" className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">Campaign Finance</Link>
                  <Link to="/lobbying" className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">Lobbying</Link>
                  <Link to="/court-cases" className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">Court Cases</Link>
                  <Link to="/federal-register" className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">Federal Register</Link>
                </div>
              </div>

              {/* About */}
              <div>
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-headline mb-3">Platform</h4>
                <div className="flex flex-col gap-2">
                  <Link to="/midterms" className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">Elections</Link>
                  <Link to="/alerts" className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">Alerts</Link>
                  <a href="mailto:contact@whoismyrep.us" className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</a>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-10 flex flex-col items-center gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
              <p className="font-body text-[11px] text-muted-foreground">
                © {new Date().getFullYear()} WhoIsMyRep.us — U.S. Political Transparency Platform. Not affiliated with the U.S. government.
              </p>
              <div className="flex items-center gap-4">
                <a href="https://x.com/whoismyrep" target="_blank" rel="noopener noreferrer" className="font-body text-[11px] text-muted-foreground hover:text-foreground transition-colors">𝕏</a>
                <a href="https://github.com/whoismyrep" target="_blank" rel="noopener noreferrer" className="font-body text-[11px] text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;