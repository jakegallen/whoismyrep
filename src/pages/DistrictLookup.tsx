import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Search,
  Landmark,
  Building2,
  Building,
  Home,
  ExternalLink,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { lookupRepresentatives, type DistrictResult } from "@/lib/districtLookup";
import type { Politician } from "@/lib/politicians";

const levelIcons: Record<string, typeof Landmark> = {
  federal: Landmark,
  state: Building2,
  county: Building,
  local: Home,
};

const levelColors: Record<string, string> = {
  federal: "text-primary bg-primary/10",
  state: "text-[hsl(210,80%,55%)] bg-[hsl(210,80%,55%/0.1)]",
  county: "text-[hsl(142,71%,45%)] bg-[hsl(142,71%,45%/0.1)]",
  local: "text-[hsl(43,90%,55%)] bg-[hsl(43,90%,55%/0.1)]",
};

const partyColors: Record<string, string> = {
  Democrat: "bg-[hsl(210,80%,55%)]",
  Republican: "bg-primary",
  Independent: "bg-[hsl(43,90%,55%)]",
  Nonpartisan: "bg-muted-foreground",
};

const EXAMPLE_ADDRESSES = [
  "1600 Las Vegas Blvd S, Las Vegas, NV 89104",
  "200 S Virginia St, Reno, NV 89501",
  "240 Water St, Henderson, NV 89015",
  "2250 Las Vegas Blvd N, North Las Vegas, NV 89030",
];

const DistrictLookup = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [results, setResults] = useState<DistrictResult[] | null>(null);
  const [searchedAddress, setSearchedAddress] = useState("");

  const handleLookup = (addr?: string) => {
    const query = addr || address;
    if (!query.trim()) return;
    setSearchedAddress(query);
    setResults(lookupRepresentatives(query));
  };

  const totalReps = results?.reduce((s, g) => s + g.representatives.length, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center gap-4 px-4 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-2 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="h-5 w-px bg-border" />
          <span className="font-display text-sm font-semibold text-headline">
            Find My Representatives
          </span>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <MapPin className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-headline">
            Find My Representatives
          </h1>
          <p className="mx-auto mt-2 max-w-lg font-body text-sm text-secondary-custom">
            Enter your Nevada address to see all your elected officials — from
            Congress to your city council.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-8"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your address (e.g. 1600 Las Vegas Blvd S, Las Vegas, NV)"
                className="pl-9 font-body"
              />
            </div>
            <Button type="submit" disabled={!address.trim()}>
              <Search className="mr-2 h-4 w-4" />
              Look Up
            </Button>
          </form>

          {/* Quick examples */}
          {!results && (
            <div className="mt-4">
              <p className="mb-2 font-body text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Try an example
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_ADDRESSES.map((addr) => (
                  <button
                    key={addr}
                    onClick={() => {
                      setAddress(addr);
                      handleLookup(addr);
                    }}
                    className="rounded-lg bg-surface-elevated px-3 py-1.5 font-body text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                  >
                    {addr.split(",")[0]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {results && (
            <motion.div
              key={searchedAddress}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="mt-8 space-y-6"
            >
              {/* Summary */}
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-body text-sm text-secondary-custom">
                    Showing <span className="font-semibold text-headline">{totalReps} representatives</span> for
                  </p>
                  <p className="font-body text-xs text-muted-foreground">
                    {searchedAddress}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setResults(null);
                    setAddress("");
                  }}
                  className="ml-auto rounded-md bg-surface-elevated px-2.5 py-1 font-body text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-hover"
                >
                  New Search
                </button>
              </div>

              {/* Level groups */}
              {results.map((group, gi) => {
                const Icon = levelIcons[group.level];
                const colorClass = levelColors[group.level];
                return (
                  <motion.section
                    key={group.level}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: gi * 0.08, duration: 0.3 }}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${colorClass}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <h2 className="font-display text-base font-bold text-headline">
                        {group.label}
                      </h2>
                      <span className="ml-auto font-body text-xs text-muted-foreground">
                        {group.representatives.length} official
                        {group.representatives.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.representatives.map((rep, ri) => (
                        <RepCard key={rep.id} rep={rep} index={ri} />
                      ))}
                    </div>
                  </motion.section>
                );
              })}

              <p className="font-body text-[10px] italic text-muted-foreground/60">
                District matching is approximate and based on address keywords.
                For official district maps visit{" "}
                <a
                  href="https://www.nvsos.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  nvsos.gov
                </a>
                .
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

function RepCard({ rep, index }: { rep: Politician; index: number }) {
  const navigate = useNavigate();
  return (
    <motion.button
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      onClick={() => navigate(`/politicians/${rep.id}`, { state: { politician: rep } })}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-surface-elevated"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated font-display text-sm font-bold text-muted-foreground">
        {rep.name
          .split(" ")
          .map((n) => n[0])
          .join("")}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-semibold text-headline">
          {rep.name}
        </p>
        <p className="truncate font-body text-xs text-muted-foreground">
          {rep.title}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div
          className={`h-2 w-2 rounded-full ${partyColors[rep.party]}`}
          title={rep.party}
        />
        <ExternalLink className="h-3 w-3 text-muted-foreground" />
      </div>
    </motion.button>
  );
}

export default DistrictLookup;
