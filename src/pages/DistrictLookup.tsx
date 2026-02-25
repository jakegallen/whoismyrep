import { useState, useMemo } from "react";
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
  Loader2,
  AlertCircle,
  Phone,
  Mail,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCivicReps, type CivicRep, type CivicGroup } from "@/hooks/useCivicReps";
import { nevadaPoliticians } from "@/lib/politicians";

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
  const { groups, normalizedAddress, totalReps, isLoading, error, lookup, reset } = useCivicReps();

  // Build a lookup map: normalized name -> politician object
  const politicianByName = useMemo(() => {
    const map = new Map<string, (typeof nevadaPoliticians)[number]>();
    for (const p of nevadaPoliticians) {
      map.set(p.name.toLowerCase().replace(/[^a-z]/g, ""), p);
    }
    return map;
  }, []);

  const handleLookup = (addr?: string) => {
    const query = addr || address;
    if (!query.trim()) return;
    lookup(query);
  };

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
            <Button type="submit" disabled={!address.trim() || isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              {isLoading ? "Looking up…" : "Look Up"}
            </Button>
          </form>

          {/* Quick examples */}
          {!groups && !isLoading && (
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

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4"
          >
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="font-body text-sm text-destructive">{error}</p>
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence mode="wait">
          {groups && (
            <motion.div
              key={normalizedAddress}
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
                    {normalizedAddress}
                  </p>
                </div>
                <button
                  onClick={() => {
                    reset();
                    setAddress("");
                  }}
                  className="ml-auto rounded-md bg-surface-elevated px-2.5 py-1 font-body text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-hover"
                >
                  New Search
                </button>
              </div>

              {/* Level groups */}
              {groups.map((group, gi) => {
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
                        <CivicRepCard key={`${rep.name}-${rep.office}`} rep={rep} index={ri} politicianByName={politicianByName} navigate={navigate} />
                      ))}
                    </div>
                  </motion.section>
                );
              })}

              <p className="font-body text-[10px] italic text-muted-foreground/60">
                Data provided by Google Civic Information API. For official district maps visit{" "}
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

function CivicRepCard({ rep, index, politicianByName, navigate }: { rep: CivicRep; index: number; politicianByName: Map<string, import("@/lib/politicians").Politician>; navigate: ReturnType<typeof useNavigate> }) {
  const nameKey = rep.name.toLowerCase().replace(/[^a-z]/g, "");
  const matchedPolitician = politicianByName.get(nameKey);
  const isClickable = !!matchedPolitician;

  const handleClick = () => {
    if (matchedPolitician) {
      navigate(`/politicians/${matchedPolitician.id}`, { state: { politician: matchedPolitician } });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      onClick={isClickable ? handleClick : undefined}
      className={`flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left ${isClickable ? "cursor-pointer transition-colors hover:border-primary/40 hover:bg-card/80" : ""}`}
    >
      {rep.photoUrl ? (
        <img
          src={rep.photoUrl}
          alt={rep.name}
          className="h-10 w-10 shrink-0 rounded-full object-cover bg-surface-elevated"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
          }}
        />
      ) : null}
      <div
        className={`h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated font-display text-sm font-bold text-muted-foreground ${rep.photoUrl ? "hidden" : "flex"}`}
      >
        {rep.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-semibold text-headline">
          {rep.name}
        </p>
        <p className="truncate font-body text-xs text-muted-foreground">
          {rep.office}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div
          className={`h-2 w-2 rounded-full ${partyColors[rep.party] || "bg-muted-foreground"}`}
          title={rep.party}
        />
        {rep.phone && (
          <a href={`tel:${rep.phone}`} title={rep.phone} onClick={(e) => e.stopPropagation()} className="rounded-md p-1 transition-colors hover:bg-surface-elevated">
            <Phone className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </a>
        )}
        {rep.email && (
          <a href={`mailto:${rep.email}`} title={rep.email} onClick={(e) => e.stopPropagation()} className="rounded-md p-1 transition-colors hover:bg-surface-elevated">
            <Mail className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </a>
        )}
        {rep.website && (
          <a href={rep.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-md p-1 transition-colors hover:bg-surface-elevated">
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </a>
        )}
      </div>
    </motion.div>
  );
}

export default DistrictLookup;
