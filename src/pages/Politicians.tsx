import { useState, useMemo, useEffect } from "react";
import SiteNav from "@/components/SiteNav";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Building2, Landmark, MapPin, Search, X, ArrowUpDown, Loader2, AlertCircle, RefreshCw, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SocialIcons } from "@/components/SocialIcons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { US_STATES, detectStateFromTimezone } from "@/lib/usStates";
import { useLegislators, type Legislator } from "@/hooks/useLegislators";
import { useCongress, type CongressMember } from "@/hooks/useCongress";

const PAGE_SIZE = 12;

type Level = "state" | "federal";

const Politicians = () => {
  useEffect(() => { document.title = "Politicians | WhoIsMyRep.us"; }, []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedState, setSelectedState] = useState(() => detectStateFromTimezone());
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [level, setLevel] = useState<Level>(() => (searchParams.get("level") === "federal" ? "federal" : "state"));
  const [chamberFilter, setChamberFilter] = useState<"all" | "Senate" | "Assembly">("all");
  const [federalChamberFilter, setFederalChamberFilter] = useState<"all" | "Senate" | "House">("all");
  const [sortBy, setSortBy] = useState<"default" | "name" | "party">("default");
  const [currentPage, setCurrentPage] = useState(1);

  const jurisdiction = US_STATES.find((s) => s.abbr === selectedState)?.jurisdiction || "Nevada";
  const stateName = US_STATES.find((s) => s.abbr === selectedState)?.name || "Nevada";

  // State legislators
  const { legislators, isLoading: stateLoading, error: stateError, refetch: stateRefetch } = useLegislators(
    chamberFilter === "Senate" ? "upper" : chamberFilter === "Assembly" ? "lower" : undefined,
    jurisdiction
  );

  // Federal members
  const { data: congressData, isLoading: federalLoading, error: federalError, refetch: federalRefetch } = useCongress("members", {
    limit: 50,
    state: selectedState,
  });

  const federalMembers: CongressMember[] = useMemo(() => congressData?.items || [], [congressData]);

  const isLoading = level === "state" ? stateLoading : federalLoading;
  const error = level === "state" ? stateError : federalError ? (federalError as Error).message : null;
  const refetch = level === "state" ? stateRefetch : federalRefetch;

  // Filtered state legislators
  const filteredState = useMemo(() => {
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
    if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "party") list.sort((a, b) => a.party.localeCompare(b.party) || a.name.localeCompare(b.name));
    return list;
  }, [legislators, search, sortBy]);

  // Filtered federal members
  const filteredFederal = useMemo(() => {
    let list = [...federalMembers];
    if (federalChamberFilter !== "all") {
      list = list.filter((m) => m.chamber === federalChamberFilter || m.chamber === `${federalChamberFilter} of Representatives`);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.party.toLowerCase().includes(q) ||
          (m.state && m.state.toLowerCase().includes(q))
      );
    }
    if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "party") list.sort((a, b) => a.party.localeCompare(b.party) || a.name.localeCompare(b.name));
    return list;
  }, [federalMembers, federalChamberFilter, search, sortBy]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [search, level, chamberFilter, federalChamberFilter, sortBy, selectedState]);

  const activeList = level === "state" ? filteredState : filteredFederal;
  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedState = filteredState.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const paginatedFederal = filteredFederal.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const senateCt = legislators.filter((l) => l.chamber === "Senate").length;
  const assemblyCt = legislators.filter((l) => l.chamber === "Assembly").length;
  const fedSenateCt = federalMembers.filter((m) => m.chamber === "Senate").length;
  const fedHouseCt = federalMembers.filter((m) => m.chamber !== "Senate").length;

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
                Officials Directory
              </h1>
            </div>
            <p className="mt-2 max-w-xl font-body text-sm text-tertiary">
              Browse state and federal legislators across all 50 states. Select a state and level to see current officeholders.
            </p>

            {/* State selector + Level toggle */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
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

              {/* Level toggle */}
              <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
                <button
                  onClick={() => setLevel("state")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-body text-sm font-medium transition-colors ${
                    level === "state"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  State
                </button>
                <button
                  onClick={() => setLevel("federal")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-body text-sm font-medium transition-colors ${
                    level === "federal"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Landmark className="h-3.5 w-3.5" />
                  Federal
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Chamber filter tabs */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
          {level === "state" ? (
            <>
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
            </>
          ) : (
            <>
              {(["all", "Senate", "House"] as const).map((tab) => {
                const count = tab === "all" ? federalMembers.length : tab === "Senate" ? fedSenateCt : fedHouseCt;
                const Icon = tab === "all" ? Users : tab === "Senate" ? Landmark : Building2;
                return (
                  <button
                    key={tab}
                    onClick={() => setFederalChamberFilter(tab)}
                    className={`relative flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 font-body text-sm font-medium transition-colors ${
                      federalChamberFilter === tab
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab === "all" ? "All" : tab} ({count})
                  </button>
                );
              })}
            </>
          )}
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading} className="gap-1.5 text-muted-foreground">
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
              placeholder={level === "state" ? "Search by name, party, or district…" : "Search by name or party…"}
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
              <p className="font-body text-sm font-medium text-foreground">Failed to load officials</p>
              <p className="font-body text-xs text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && level === "state" && (
          <>
            <p className="mb-4 font-body text-xs text-muted-foreground">
              Showing {Math.min(safePage * PAGE_SIZE, filteredState.length)} of {filteredState.length} {stateName} state legislators
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedState.map((leg) => (
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
                        socialHandles: leg.socialHandles,
                        channels: [],
                        jurisdiction,
                      },
                    },
                  });
                }} />
              ))}
            </div>
            {filteredState.length === 0 && (
              <div className="flex flex-col items-center py-16">
                <Users className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 font-body text-sm text-muted-foreground">No state legislators found.</p>
              </div>
            )}
            {totalPages > 1 && <PaginationControls currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} />}
          </>
        )}

        {!isLoading && !error && level === "federal" && (
          <>
            <p className="mb-4 font-body text-xs text-muted-foreground">
              Showing {Math.min(safePage * PAGE_SIZE, filteredFederal.length)} of {filteredFederal.length} {stateName} federal officials
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedFederal.map((member) => (
                <FederalMemberRow key={member.bioguideId} member={member} onClick={() => {
                  const repId = member.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
                  navigate(`/politicians/${repId}`, {
                    state: {
                      civicRep: {
                        name: member.name,
                        office: `U.S. ${member.chamber === "Senate" ? "Senator" : "Representative"}${member.district ? `, District ${member.district}` : ""}`,
                        party: member.party,
                        level: "federal",
                        photoUrl: member.depiction?.imageUrl,
                        phone: undefined,
                        email: undefined,
                        website: member.url,
                        socialHandles: {},
                        channels: [],
                        jurisdiction: member.state,
                      },
                    },
                  });
                }} />
              ))}
            </div>
            {filteredFederal.length === 0 && (
              <div className="flex flex-col items-center py-16">
                <Landmark className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 font-body text-sm text-muted-foreground">No federal officials found.</p>
              </div>
            )}
            {totalPages > 1 && <PaginationControls currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} />}
          </>
        )}
      </main>
    </div>
  );
};

/* ── Pagination controls ── */
function PaginationControls({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (p: number) => void }) {
  const getPages = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <Pagination className="mt-6">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
        {getPages().map((p, i) =>
          p === "ellipsis" ? (
            <PaginationItem key={`e-${i}`}><PaginationEllipsis /></PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink isActive={p === currentPage} onClick={() => onPageChange(p)} className="cursor-pointer">{p}</PaginationLink>
            </PaginationItem>
          )
        )}
        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

/* ── State legislator card ── */
function LegislatorRow({ legislator, onClick }: { legislator: Legislator; onClick: () => void }) {
  const chamberConfig: Record<string, { icon: typeof Landmark; color: string }> = {
    Senate: { icon: Landmark, color: "bg-amber-500/20 text-amber-400" },
    Assembly: { icon: Building2, color: "bg-blue-500/20 text-blue-400" },
  };
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
        <img src={legislator.imageUrl} alt={legislator.name} className="h-12 w-12 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
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
        {legislator.socialHandles && Object.keys(legislator.socialHandles).length > 0 && (
          <SocialIcons socialHandles={legislator.socialHandles} size="sm" className="mt-1" />
        )}
      </div>
    </motion.button>
  );
}

/* ── Federal member card ── */
function FederalMemberRow({ member, onClick }: { member: CongressMember; onClick: () => void }) {
  const isSenate = member.chamber === "Senate";
  const partyDot =
    member.party === "Democrat" || member.party === "Democratic"
      ? "bg-[hsl(217,72%,48%)]"
      : member.party === "Republican"
      ? "bg-[hsl(0,68%,48%)]"
      : "bg-muted-foreground";

  const chamberLabel = isSenate ? "Senate" : "House";
  const title = isSenate
    ? "U.S. Senator"
    : `U.S. Representative${member.district ? `, District ${member.district}` : ""}`;

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-surface-hover"
    >
      {member.depiction?.imageUrl ? (
        <img src={member.depiction.imageUrl} alt={member.name} className="h-12 w-12 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${isSenate ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>
          {isSenate ? <Landmark className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-display text-sm font-bold text-headline truncate">{member.name}</h4>
          <div className={`h-2 w-2 shrink-0 rounded-full ${partyDot}`} title={member.party} />
        </div>
        <p className="font-body text-xs text-muted-foreground truncate">{title}</p>
        <p className="mt-0.5 font-body text-[10px] text-muted-foreground/60">{member.party} · {chamberLabel}</p>
      </div>
    </motion.button>
  );
}

export default Politicians;
