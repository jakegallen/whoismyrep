import { useState, useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin,
  Search,
  Loader2,
  Users,
  FileText,
  BarChart3,
  Globe,
  Star,
  Flame,
  Trophy,
} from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { NameAutocomplete, type NameAutocompleteRef } from "@/components/NameAutocomplete";
import { StateAutocomplete } from "@/components/StateAutocomplete";
import { Button } from "@/components/ui/button";
import SiteNav from "@/components/SiteNav";
import { useCivicReps } from "@/hooks/useCivicReps";
import { US_STATES } from "@/lib/usStates";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { WeeklyRecap } from "@/components/WeeklyRecap";
import { DiscoveryPrompts } from "@/components/DiscoveryPrompts";

const EXAMPLE_ADDRESSES = [
  "3799 S Las Vegas Blvd, Las Vegas, NV",
  "350 5th Ave, New York, NY",
  "1600 Pennsylvania Ave NW, Washington, DC",
];

const STATS = [
  { label: "States + D.C. Covered", value: "51", icon: Globe },
  { label: "Elected Officials", value: "600+", icon: Users },
  { label: "Live Data Sources", value: "14", icon: BarChart3 },
  { label: "Government Levels", value: "2", icon: FileText },
];


const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserProfile();
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
    trackEvent("Search", { method: "address" });
    const result = await lookup(address.trim());
    if (result) {
      navigate("/reps", { state: result });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO path="/" raw title="WhoIsMyRep.us — Find Your U.S. Representatives" description="Find your representatives instantly — federal, state, and local. Search any U.S. address to see voting records, campaign finance, legislation, and more." />
      <SiteNav />

      <main id="main-content">
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
              Search by address, name, or state to instantly discover your elected officials — from Congress to your state capitol — with voting records, campaign finance, and AI-powered analysis.
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
                        trackEvent("Search", { method: "name", politician: suggestion.name });
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
                              website: suggestion.website,
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
                          const selected = nameAutocompleteRef.current?.selectFirst();
                          if (!selected) {
                            nameAutocompleteRef.current?.closeDropdown();
                            navigate(`/politicians?q=${encodeURIComponent(nameQuery.trim())}&level=federal`);
                          }
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
                        trackEvent("Search", { method: "state", state: state.abbr });
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

          {/* Logged-in user engagement strip */}
          {user && profile && (profile.xp > 0 || profile.current_streak > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mx-auto mt-8 flex max-w-md items-center justify-center gap-6 rounded-xl border border-primary/20 bg-primary/5 px-6 py-3"
            >
              <div className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="font-display text-sm font-bold text-headline">Level {profile.level}</span>
              </div>
              <div className="h-5 w-px bg-border" />
              <span className="font-mono text-sm font-semibold text-primary">
                {profile.xp.toLocaleString()} XP
              </span>
              {profile.current_streak > 0 && (
                <>
                  <div className="h-5 w-px bg-border" />
                  <div className="flex items-center gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="font-mono text-sm font-bold text-orange-500">
                      {profile.current_streak}d
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Discovery prompts for home page */}
          <div className="mx-auto mt-6 max-w-3xl">
            <DiscoveryPrompts context="home" />
          </div>

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

      </main>

      {/* Weekly recap dialog (auto-shows for logged-in users on first visit of the week) */}
      <WeeklyRecap />

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="font-body text-[11px] text-muted-foreground">
              © {new Date().getFullYear()} WhoIsMyRep.us — U.S. Political Transparency Platform. Not affiliated with the U.S. government.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://x.com/Jakegallen" target="_blank" rel="noopener noreferrer" className="font-body text-[11px] text-muted-foreground hover:text-foreground transition-colors">𝕏</a>
              <a href="https://github.com/EmblemCompany" target="_blank" rel="noopener noreferrer" className="font-body text-[11px] text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;