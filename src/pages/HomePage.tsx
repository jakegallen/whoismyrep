import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin,
  Search,
  Loader2,
  Users,
  FileText,
  Vote,
  Shield,
  BarChart3,
  DollarSign,
  Scale,
  Globe,
  Star,
} from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { NameAutocomplete, type NameAutocompleteRef } from "@/components/NameAutocomplete";
import { StateAutocomplete } from "@/components/StateAutocomplete";
import { Button } from "@/components/ui/button";
import SiteNav from "@/components/SiteNav";
import { useCivicReps } from "@/hooks/useCivicReps";
import { US_STATES } from "@/lib/usStates";

const EXAMPLE_ADDRESSES = [
  "3799 S Las Vegas Blvd, Las Vegas, NV",
  "350 5th Ave, New York, NY",
  "1600 Pennsylvania Ave NW, Washington, DC",
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
  const [searchMode, setSearchMode] = useState<"address" | "name" | "state">("address");
  const [nameQuery, setNameQuery] = useState("");
  const [address, setAddress] = useState("");
  const [stateQuery, setStateQuery] = useState("");
  const [selectedStateAbbr, setSelectedStateAbbr] = useState<string | null>(null);
  const nameAutocompleteRef = useRef<NameAutocompleteRef>(null);
  useEffect(() => { document.title = "WhoIsMyRep.us — Find Your Representatives"; }, []);
  const { isLoading, error, lookup } = useCivicReps();

  // Social media lookup for federal members (used when navigating from name autocomplete)
  const { data: socialLookup } = useQuery({
    queryKey: ["legislators-social-media"],
    queryFn: async (): Promise<Record<string, Record<string, string>>> => {
      const resp = await fetch("https://unitedstates.github.io/congress-legislators/legislators-social-media.json");
      if (!resp.ok) return {};
      const data = await resp.json();
      const socialMap: Record<string, Record<string, string>> = {};
      for (const entry of data) {
        const bioguide = entry.id?.bioguide;
        if (!bioguide) continue;
        const social: Record<string, string> = {};
        if (entry.social?.twitter) social.x = entry.social.twitter;
        if (entry.social?.facebook) social.facebook = entry.social.facebook;
        if (entry.social?.instagram) social.instagram = entry.social.instagram;
        if (entry.social?.youtube) social.youtube = entry.social.youtube;
        else if (entry.social?.youtube_id) social.youtube = entry.social.youtube_id;
        if (Object.keys(social).length > 0) socialMap[bioguide] = social;
      }
      return socialMap;
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  const handleSearch = async () => {
    if (!address.trim()) return;
    const result = await lookup(address.trim());
    if (result) {
      navigate("/reps", { state: result });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

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
              Search by address, name, or state to instantly discover your elected officials — from Congress to city hall — with voting records, campaign finance, and AI-powered analysis.
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
                onClick={() => setSearchMode("state")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-body text-xs font-medium transition-all ${
                  searchMode === "state"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                By State
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
                      onSelect={async (addr) => {
                        setAddress(addr);
                        const result = await lookup(addr);
                        if (result) {
                          navigate("/reps", { state: result });
                        }
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
                  <div className="mt-3 flex flex-nowrap items-center justify-center gap-2">
                    <span className="font-body text-xs text-muted-foreground">Try:</span>
                    {EXAMPLE_ADDRESSES.map((addr) => (
                      <button
                        key={addr}
                        onClick={() => { setAddress(addr); }}
                        className="whitespace-nowrap rounded-md border border-border px-2.5 py-1 font-body text-[11px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                      >
                        {addr}
                      </button>
                    ))}
                  </div>
                </>
              ) : searchMode === "name" ? (
                <>
                  <div className="flex gap-2">
                    <NameAutocomplete
                      ref={nameAutocompleteRef}
                      value={nameQuery}
                      onChange={setNameQuery}
                      onSelect={(suggestion) => {
                        const repId = suggestion.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
                        const bioguideId = suggestion.id.replace("congress-", "");
                        const socialHandles = (socialLookup && bioguideId)
                          ? (socialLookup[bioguideId] ?? {})
                          : {};
                        navigate(`/politicians/${repId}`, {
                          state: {
                            civicRep: {
                              name: suggestion.name,
                              office: suggestion.title,
                              party: suggestion.party,
                              level: suggestion.level,
                              photoUrl: undefined,
                              socialHandles,
                              bioguideId,
                              channels: [],
                              jurisdiction: suggestion.state,
                            },
                          },
                        });
                      }}
                    />
                    <Button
                      onClick={() => {
                        if (nameQuery.trim()) {
                          nameAutocompleteRef.current?.closeDropdown();
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
                  <div className="mt-3 flex flex-nowrap items-center justify-center gap-2">
                    <span className="font-body text-xs text-muted-foreground">Try:</span>
                    {["Nancy Pelosi", "Ted Cruz", "Thomas Massie"].map((name) => (
                      <button
                        key={name}
                        onClick={() => setNameQuery(name)}
                        className="whitespace-nowrap rounded-md border border-border px-2.5 py-1 font-body text-[11px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </>
              ) : searchMode === "state" ? (
                <>
                  <div className="flex gap-2">
                    <StateAutocomplete
                      value={stateQuery}
                      onChange={(v) => {
                        setStateQuery(v);
                        setSelectedStateAbbr(null);
                      }}
                      onSelect={(state) => {
                        setSelectedStateAbbr(state.abbr);
                        navigate(`/state/${state.abbr.toLowerCase()}`);
                      }}
                      placeholder="Search by state name or abbreviation…"
                    />
                    <Button
                      onClick={() => {
                        if (selectedStateAbbr) {
                          navigate(`/state/${selectedStateAbbr.toLowerCase()}`);
                        }
                      }}
                      disabled={!selectedStateAbbr}
                      className="h-14 rounded-xl px-6 gradient-brand font-display font-semibold text-white shadow-glow hover:opacity-90 transition-opacity"
                    >
                      <Search className="mr-2 h-5 w-5" />
                      Browse
                    </Button>
                  </div>

                  {/* Example states */}
                  <div className="mt-3 flex flex-nowrap items-center justify-center gap-2">
                    <span className="font-body text-xs text-muted-foreground">Try:</span>
                    {["Georgia", "Colorado", "Florida"].map((name) => (
                      <button
                        key={name}
                        onClick={() => navigate(`/state/${US_STATES.find((s) => s.name === name)!.abbr.toLowerCase()}`)}
                        className="whitespace-nowrap rounded-md border border-border px-2.5 py-1 font-body text-[11px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
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

      {/* ═══════ FEATURES ═══════ */}
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

      {/* ═══════ HOW IT WORKS ═══════ */}
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
                  { step: "1", icon: Search, title: "Find Your Reps", desc: "Search by address, name, or state — we'll match you to every official who represents you." },
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

      {/* ═══════ CTA ═══════ */}
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
                Find Your Representatives
              </Button>
            </motion.div>
          </div>
        </section>

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
                <a href="https://x.com/Jakegallen" target="_blank" rel="noopener noreferrer" className="font-body text-[11px] text-muted-foreground hover:text-foreground transition-colors">𝕏</a>
                <a href="https://github.com/jakegallen/" target="_blank" rel="noopener noreferrer" className="font-body text-[11px] text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;