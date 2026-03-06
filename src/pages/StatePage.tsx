import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Users,
  FileText,
  Map as MapIcon,
  Newspaper,
  ChevronRight,
  ExternalLink,
  Crown,
  Shield,
  Scale,
  Layers,
  GraduationCap,
  Home,
  Search,
  Loader2,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SiteNav from "@/components/SiteNav";
import { SocialIcons } from "@/components/SocialIcons";
import { CardListSkeleton, NewsSkeleton } from "@/components/TabSkeletons";
import { US_STATES } from "@/lib/usStates";
import { useLegislators, type Legislator } from "@/hooks/useLegislators";
import { useFederalReps, type FederalRep } from "@/hooks/useFederalReps";
import { useCountyOfficials, countyOfficialToCivicRep, type CountyOfficial } from "@/hooks/useCountyOfficials";
import { useSchoolBoard, schoolBoardMemberToCivicRep, type SchoolBoardMember } from "@/hooks/useSchoolBoard";
import { useMunicipalOfficials, municipalOfficialToCivicRep, type MunicipalOfficial } from "@/hooks/useMunicipalOfficials";
import { useJudicialOfficials, judicialOfficialToCivicRep, type JudicialOfficial } from "@/hooks/useJudicialOfficials";
import { useSpecialDistrictOfficials, specialDistrictOfficialToCivicRep, type SpecialDistrictOfficial } from "@/hooks/useSpecialDistrictOfficials";
import { SaveRepButton } from "@/components/SaveRepButton";
import type { CivicRep } from "@/hooks/useCivicReps";
import SEO from "@/components/SEO";
import { useRecentPages } from "@/hooks/useRecentPages";
import { useBills } from "@/hooks/useBills";
import { supabase } from "@/integrations/supabase/client";

const partyDot: Record<string, string> = {
  Democrat: "bg-[hsl(217,72%,48%)]",
  Democratic: "bg-[hsl(217,72%,48%)]",
  Republican: "bg-[hsl(0,68%,48%)]",
  Independent: "bg-[hsl(43,90%,48%)]",
  Nonpartisan: "bg-muted-foreground",
};

const StatePage = () => {
  const { abbr } = useParams<{ abbr: string }>();
  const navigate = useNavigate();
  const upperAbbr = (abbr || "").toUpperCase();
  const stateInfo = US_STATES.find((s) => s.abbr === upperAbbr);
  const { recordVisit } = useRecentPages();

  // Track recent page visit
  useEffect(() => {
    if (stateInfo) {
      recordVisit({
        path: `/state/${abbr}`,
        title: stateInfo.name,
        subtitle: "State Overview",
        type: "state",
      });
    }
  }, [stateInfo, abbr, recordVisit]);

  if (!stateInfo) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <main className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold text-headline">State Not Found</h1>
          <p className="mt-4 font-body text-muted-foreground">
            "{abbr}" is not a recognized state abbreviation.
          </p>
          <Button onClick={() => navigate("/")} className="mt-6">Back to Home</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${stateInfo.name || upperAbbr} — State Overview`}
        description={`View ${stateInfo.name || upperAbbr}'s elected officials, legislation, and political landscape.`}
        path={`/state/${abbr}`}
      />
      <SiteNav />
      <main id="main-content" className="container mx-auto max-w-5xl px-4 py-8">
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-2 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          All States
        </button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-display text-4xl font-bold text-headline md:text-5xl">
            {stateInfo.name}
          </h1>
          <p className="mt-2 font-body text-base text-secondary-custom">
            State legislators, active bills, news, and district maps for {stateInfo.name}.
          </p>

          {/* Quick nav */}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to={`/bills?state=${upperAbbr}`}>
              <Button variant="outline" size="sm" className="font-body text-xs">
                <FileText className="mr-1.5 h-3.5 w-3.5" /> Bills
              </Button>
            </Link>
            <Link to="/district-map" state={{ defaultState: upperAbbr }}>
              <Button variant="outline" size="sm" className="font-body text-xs">
                <MapIcon className="mr-1.5 h-3.5 w-3.5" /> District Map
              </Button>
            </Link>
            <Link to={`/committees?state=${upperAbbr}`}>
              <Button variant="outline" size="sm" className="font-body text-xs">
                <Building2 className="mr-1.5 h-3.5 w-3.5" /> Committees
              </Button>
            </Link>
          </div>
        </motion.div>

        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          {/* Left column: Federal + Executives + Local (County + School Board) + State Legislators */}
          <div className="space-y-10">
            <FederalSection stateAbbr={upperAbbr} stateName={stateInfo.name} />
            <ExecutivesSection stateAbbr={upperAbbr} stateName={stateInfo.name} />
            <LocalOfficialsSections stateName={stateInfo.name} />
            <LegislatorsSection stateName={stateInfo.name} jurisdiction={stateInfo.jurisdiction} />
          </div>

          {/* Right column: News + Bills summary */}
          <div className="space-y-8">
            <StateNewsSection stateName={stateInfo.name} />
            <BillsSummary jurisdiction={stateInfo.jurisdiction} stateAbbr={upperAbbr} />
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="font-body text-xs text-muted-foreground">
            © {new Date().getFullYear()} WhoIsMyRep.us — {stateInfo.name} Political Transparency
          </p>
        </div>
      </footer>
    </div>
  );
};

/* ════════ Federal Representatives ════════ */
function FederalSection({ stateAbbr, stateName }: { stateAbbr: string; stateName: string }) {
  const { reps, isLoading, error } = useFederalReps(stateAbbr);
  const navigate = useNavigate();

  const senators = reps.filter((r) => r.office.includes("Senator"));
  const houseMembers = reps.filter((r) => !r.office.includes("Senator"));

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Building2 className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">Federal Representatives</h2>
        {!isLoading && reps.length > 0 && (
          <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-xs text-muted-foreground">
            {reps.length} total
          </span>
        )}
      </div>

      {isLoading && <CardListSkeleton />}
      {error && <p className="font-body text-sm text-destructive">{error}</p>}

      {!isLoading && reps.length === 0 && !error && (
        <p className="py-6 font-body text-sm text-muted-foreground">
          No federal representatives found for {stateName}.
        </p>
      )}

      {/* U.S. Senators */}
      {senators.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            U.S. Senators ({senators.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {senators.map((rep) => (
              <FederalRepCard key={rep.name} rep={rep} onClick={() => {
                const repId = rep.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
                navigate(`/politicians/${repId}`, {
                  state: {
                    civicRep: {
                      name: rep.name,
                      office: rep.office,
                      level: "federal" as const,
                      party: rep.party,
                      photoUrl: rep.photoUrl,
                      phone: rep.phone,
                      website: rep.website,
                      email: rep.email,
                      socialHandles: rep.socialHandles,
                      bioguideId: rep.bioguideId,
                      divisionId: rep.divisionId || "",
                    },
                  },
                });
              }} />
            ))}
          </div>
        </div>
      )}

      {/* U.S. House Members */}
      {houseMembers.length > 0 && (
        <div>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            U.S. House Members ({houseMembers.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {houseMembers.map((rep) => (
              <FederalRepCard key={rep.name} rep={rep} onClick={() => {
                const repId = rep.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
                navigate(`/politicians/${repId}`, {
                  state: {
                    civicRep: {
                      name: rep.name,
                      office: rep.office,
                      level: "federal" as const,
                      party: rep.party,
                      photoUrl: rep.photoUrl,
                      phone: rep.phone,
                      website: rep.website,
                      email: rep.email,
                      socialHandles: rep.socialHandles,
                      bioguideId: rep.bioguideId,
                      divisionId: rep.divisionId || "",
                    },
                  },
                });
              }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FederalRepCard({ rep, onClick }: { rep: FederalRep; onClick: () => void }) {
  const dot = partyDot[rep.party] || partyDot.Nonpartisan;
  const allHandles: Record<string, string> = {
    ...(rep.website ? { website: rep.website } : {}),
    ...(rep.email ? { email: rep.email } : {}),
    ...(rep.socialHandles || {}),
  };

  const civicRep: CivicRep = {
    name: rep.name,
    office: rep.office,
    level: "federal",
    party: rep.party,
    photoUrl: rep.photoUrl,
    phone: rep.phone,
    website: rep.website,
    email: rep.email,
    socialHandles: rep.socialHandles,
    bioguideId: rep.bioguideId,
    divisionId: rep.divisionId || "",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="group relative flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-surface-hover"
    >
      {rep.photoUrl ? (
        <img src={rep.photoUrl} alt={rep.name} className="h-10 w-10 rounded-lg object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated font-display text-sm font-bold text-muted-foreground">
          {rep.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-sm font-bold text-headline truncate">{rep.name}</span>
          <div className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        </div>
        <p className="font-body text-[11px] text-muted-foreground truncate">{rep.office}</p>
        <SocialIcons socialHandles={allHandles} size="sm" className="mt-1" />
      </div>
      <SaveRepButton rep={civicRep} size="sm" className="shrink-0" />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

/* ════════ Legislators ════════ */
function LegislatorsSection({ stateName, jurisdiction }: { stateName: string; jurisdiction: string }) {
  const { legislators, isLoading, error } = useLegislators(undefined, jurisdiction);

  const senate = legislators.filter((l) => l.chamber === "Senate");
  const house = legislators.filter((l) => l.chamber !== "Senate");
  const navigate = useNavigate();

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">State Legislators</h2>
        {!isLoading && (
          <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-xs text-muted-foreground">
            {legislators.length} total
          </span>
        )}
      </div>

      {isLoading && <CardListSkeleton />}
      {error && <p className="font-body text-sm text-destructive">{error}</p>}

      {!isLoading && legislators.length === 0 && !error && (
        <p className="py-6 font-body text-sm text-muted-foreground">
          No legislators found for {stateName} via OpenStates.
        </p>
      )}

      {/* Senate */}
      {senate.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Senate ({senate.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {senate.slice(0, 20).map((leg) => (
              <LegislatorCard key={leg.id} leg={leg} onClick={() => {
                const repId = leg.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
                navigate(`/politicians/${repId}`, {
                  state: {
                    civicRep: {
                      name: leg.name,
                      office: leg.office,
                      level: "state" as const,
                      party: leg.party,
                      photoUrl: leg.imageUrl,
                      website: leg.website,
                      email: leg.email,
                      socialHandles: leg.socialHandles,
                      divisionId: "",
                    },
                  },
                });
              }} />
            ))}
          </div>
          {senate.length > 20 && (
            <p className="mt-2 font-body text-xs text-muted-foreground">
              + {senate.length - 20} more senators
            </p>
          )}
        </div>
      )}

      {/* House/Assembly */}
      {house.length > 0 && (
        <div>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            House / Assembly ({house.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {house.slice(0, 20).map((leg) => (
              <LegislatorCard key={leg.id} leg={leg} onClick={() => {
                const repId = leg.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
                navigate(`/politicians/${repId}`, {
                  state: {
                    civicRep: {
                      name: leg.name,
                      office: leg.office,
                      level: "state" as const,
                      party: leg.party,
                      photoUrl: leg.imageUrl,
                      website: leg.website,
                      email: leg.email,
                      socialHandles: leg.socialHandles,
                      divisionId: "",
                    },
                  },
                });
              }} />
            ))}
          </div>
          {house.length > 20 && (
            <p className="mt-2 font-body text-xs text-muted-foreground">
              + {house.length - 20} more representatives
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function LegislatorCard({ leg, onClick }: { leg: Legislator; onClick: () => void }) {
  const dot = partyDot[leg.party] || partyDot.Nonpartisan;
  const allHandles: Record<string, string> = {
    ...(leg.website ? { website: leg.website } : {}),
    ...(leg.email ? { email: leg.email } : {}),
    ...(leg.socialHandles || {}),
  };

  const civicRep: CivicRep = {
    name: leg.name,
    office: leg.office,
    level: "state",
    party: leg.party,
    photoUrl: leg.imageUrl,
    website: leg.website,
    email: leg.email,
    socialHandles: leg.socialHandles,
    divisionId: "",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="group relative flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-surface-hover"
    >
      {leg.imageUrl ? (
        <img src={leg.imageUrl} alt={leg.name} className="h-10 w-10 rounded-lg object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated font-display text-sm font-bold text-muted-foreground">
          {leg.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-sm font-bold text-headline truncate">{leg.name}</span>
          <div className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        </div>
        <p className="font-body text-[11px] text-muted-foreground truncate">{leg.title}</p>
        <SocialIcons socialHandles={allHandles} size="sm" className="mt-1" />
      </div>
      <SaveRepButton rep={civicRep} size="sm" className="shrink-0" />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

/* ════════ Executives (Governors, Mayors, etc.) ════════ */

interface ExecutiveEntry {
  id: string;
  name: string;
  title: string;
  party: string;
  state: string;
  level: "state" | "local";
  website?: string;
}

function ExecutivesSection({ stateAbbr, stateName }: { stateAbbr: string; stateName: string }) {
  const [executives, setExecutives] = useState<ExecutiveEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("fetch-state-executives", {
          body: { stateAbbr },
        });
        if (cancelled) return;
        if (fnError) throw fnError;
        setExecutives(data?.executives || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load executives");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [stateAbbr]);

  const stateExecs = executives.filter((e) => e.level === "state");
  const localExecs = executives.filter((e) => e.level === "local");

  // Don't render the section at all if empty and done loading
  if (!isLoading && executives.length === 0 && !error) return null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Crown className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">Governors & Executives</h2>
        {!isLoading && executives.length > 0 && (
          <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-xs text-muted-foreground">
            {executives.length} total
          </span>
        )}
      </div>

      {isLoading && <CardListSkeleton />}
      {error && <p className="font-body text-sm text-destructive">{error}</p>}

      {/* State-level executives (Governor, Lt. Governor, AG, etc.) */}
      {stateExecs.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            State Executives ({stateExecs.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {stateExecs.map((exec) => (
              <ExecutiveCard key={exec.id} exec={exec} onClick={() => {
                const repId = exec.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
                navigate(`/politicians/${repId}`, {
                  state: {
                    civicRep: {
                      name: exec.name,
                      office: `${exec.title} of ${stateName}`,
                      level: "state" as const,
                      party: exec.party,
                      website: exec.website,
                      divisionId: "",
                    },
                  },
                });
              }} stateName={stateName} />
            ))}
          </div>
        </div>
      )}

      {/* Local executives (Mayors, etc.) */}
      {localExecs.length > 0 && (
        <div>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Local Officials ({localExecs.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {localExecs.map((exec) => (
              <ExecutiveCard key={exec.id} exec={exec} onClick={() => {
                const repId = exec.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
                navigate(`/politicians/${repId}`, {
                  state: {
                    civicRep: {
                      name: exec.name,
                      office: exec.title,
                      level: "local" as const,
                      party: exec.party,
                      website: exec.website,
                      divisionId: "",
                    },
                  },
                });
              }} stateName={stateName} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExecutiveCard({ exec, onClick, stateName }: { exec: ExecutiveEntry; onClick: () => void; stateName: string }) {
  const dot = partyDot[exec.party] || partyDot.Nonpartisan;

  const civicRep: CivicRep = {
    name: exec.name,
    office: exec.level === "state" ? `${exec.title} of ${stateName}` : exec.title,
    level: exec.level === "state" ? "state" : "local",
    party: exec.party,
    website: exec.website,
    divisionId: "",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="group relative flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-surface-hover"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated font-display text-sm font-bold text-muted-foreground">
        {exec.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-sm font-bold text-headline truncate">{exec.name}</span>
          <div className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        </div>
        <p className="font-body text-[11px] text-muted-foreground truncate">{exec.title}</p>
        {exec.website && (
          <a
            href={exec.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-1 inline-flex items-center gap-1 font-body text-[10px] text-primary hover:underline"
          >
            <ExternalLink className="h-2.5 w-2.5" /> Website
          </a>
        )}
      </div>
      <SaveRepButton rep={civicRep} size="sm" className="shrink-0" />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

/* ════════ Combined Local Officials: County + School Board (shared address) ════════ */
function LocalOfficialsSections({ stateName }: { stateName: string }) {
  const [address, setAddress] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const county = useCountyOfficials();
  const schoolBoard = useSchoolBoard();
  const municipal = useMunicipalOfficials();
  const judicial = useJudicialOfficials();
  const specialDistrict = useSpecialDistrictOfficials();

  const isLoading = county.isLoading || schoolBoard.isLoading || municipal.isLoading || judicial.isLoading || specialDistrict.isLoading;

  const handleSearch = async () => {
    if (!address.trim()) return;
    setHasSearched(true);
    // Fire all lookups in parallel
    await Promise.all([
      county.lookup(address.trim()),
      schoolBoard.lookup(address.trim()),
      municipal.lookup(address.trim()),
      judicial.lookup(address.trim()),
      specialDistrict.lookup(address.trim()),
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div>
      {/* Shared address input */}
      <div className="mb-6 rounded-xl border border-border bg-card/50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-bold text-headline">Address Lookup</h2>
        </div>
        <p className="mb-3 font-body text-xs text-muted-foreground">
          Enter a street address to find county officials, judges & courts, special district officials, city/municipal officials, school board members, and other local representatives in {stateName}.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`123 Main St, City, ${stateName}...`}
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isLoading || !address.trim()}
            size="sm"
            className="shrink-0"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>
        {!hasSearched && (
          <div className="mt-2 flex items-start gap-1.5">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60" />
            <p className="font-body text-[11px] text-muted-foreground/60">
              A full street address is required because county and school district boundaries vary by location.
            </p>
          </div>
        )}
      </div>

      {/* County Officials Section */}
      <CountyOfficialsResults
        officials={county.officials}
        isLoading={county.isLoading}
        error={county.error}
        message={county.message}
        hasSearched={hasSearched}
        stateName={stateName}
      />

      {/* Judicial Officials Section */}
      {hasSearched && (
        <div className="mt-8">
          <JudicialOfficialsResults
            officials={judicial.officials}
            isLoading={judicial.isLoading}
            error={judicial.error}
            message={judicial.message}
            hasSearched={hasSearched}
            stateName={stateName}
          />
        </div>
      )}

      {/* Special District Officials Section */}
      {hasSearched && (
        <div className="mt-8">
          <SpecialDistrictOfficialsResults
            officials={specialDistrict.officials}
            isLoading={specialDistrict.isLoading}
            error={specialDistrict.error}
            message={specialDistrict.message}
            hasSearched={hasSearched}
            stateName={stateName}
          />
        </div>
      )}

      {/* Municipal/City Officials Section */}
      {hasSearched && (
        <div className="mt-8">
          <MunicipalOfficialsResults
            officials={municipal.officials}
            isLoading={municipal.isLoading}
            error={municipal.error}
            message={municipal.message}
            hasSearched={hasSearched}
            stateName={stateName}
          />
        </div>
      )}

      {/* School Board Section */}
      {hasSearched && (
        <div className="mt-8">
          <SchoolBoardResults
            members={schoolBoard.members}
            districts={schoolBoard.districts}
            isLoading={schoolBoard.isLoading}
            error={schoolBoard.error}
            message={schoolBoard.message}
            hasSearched={hasSearched}
          />
        </div>
      )}
    </div>
  );
}

/* ════════ County Officials Results ════════ */
function CountyOfficialsResults({
  officials,
  isLoading,
  error,
  message,
  hasSearched,
  stateName,
}: {
  officials: CountyOfficial[];
  isLoading: boolean;
  error: string | null;
  message?: string;
  hasSearched: boolean;
  stateName: string;
}) {
  const navigate = useNavigate();

  // Group officials by category
  const lawEnforcement = officials.filter((o) => {
    const lower = o.office.toLowerCase();
    return lower.includes("sheriff") || lower.includes("district attorney") || lower.includes("prosecutor") || lower.includes("public defender") || lower.includes("constable");
  });
  const administration = officials.filter((o) => {
    const lower = o.office.toLowerCase();
    return lower.includes("commissioner") || lower.includes("supervisor") || lower.includes("clerk") || lower.includes("recorder") || lower.includes("assessor") || lower.includes("treasurer") || lower.includes("auditor") || lower.includes("coroner") || lower.includes("tax collector") || lower.includes("surveyor") || lower.includes("register");
  });
  const categorized = new Set([...lawEnforcement, ...administration]);
  const other = officials.filter((o) => !categorized.has(o));

  const countyName = officials.length > 0 && officials[0].county ? officials[0].county : null;

  if (!hasSearched) return null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">
          {countyName ? `${countyName} Officials` : "County Officials"}
        </h2>
        {!isLoading && officials.length > 0 && (
          <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-xs text-muted-foreground">
            {officials.length} total
          </span>
        )}
      </div>

      {isLoading && <CardListSkeleton />}
      {error && <p className="font-body text-sm text-destructive">{error}</p>}
      {message && !error && officials.length === 0 && !isLoading && (
        <p className="py-4 font-body text-sm text-muted-foreground">{message}</p>
      )}
      {!isLoading && !error && !message && officials.length === 0 && (
        <p className="py-4 font-body text-sm text-muted-foreground">
          No county officials found for this address. Try a different address within {stateName}.
        </p>
      )}

      {/* Law Enforcement & Justice */}
      {lawEnforcement.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Law Enforcement & Justice ({lawEnforcement.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {lawEnforcement.map((official) => (
              <CountyOfficialCard key={`${official.name}-${official.office}`} official={official} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

      {/* Administration */}
      {administration.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            County Administration ({administration.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {administration.map((official) => (
              <CountyOfficialCard key={`${official.name}-${official.office}`} official={official} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

      {/* Other county officials */}
      {other.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Other County Officials ({other.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {other.map((official) => (
              <CountyOfficialCard key={`${official.name}-${official.office}`} official={official} navigate={navigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════ School Board Results ════════ */
function SchoolBoardResults({
  members,
  districts,
  isLoading,
  error,
  message,
  hasSearched,
}: {
  members: SchoolBoardMember[];
  districts: { name: string; ocdId: string }[];
  isLoading: boolean;
  error: string | null;
  message?: string;
  hasSearched: boolean;
}) {
  const navigate = useNavigate();

  if (!hasSearched) return null;

  const districtName = districts.length > 0 ? districts[0].name : null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <GraduationCap className="h-5 w-5 text-[hsl(174,60%,40%)]" />
        <h2 className="font-display text-xl font-bold text-headline">
          {districtName ? districtName : "School Board"}
        </h2>
        {!isLoading && members.length > 0 && (
          <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-xs text-muted-foreground">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading && <CardListSkeleton />}
      {error && <p className="font-body text-sm text-destructive">{error}</p>}

      {/* Show district info even when no individual members found */}
      {!isLoading && !error && members.length === 0 && districts.length > 0 && (
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <p className="font-body text-sm text-muted-foreground">
            {message || "Your school district was identified but individual board member data is not currently available."}
          </p>
          <div className="mt-3 space-y-1">
            {districts.map((d) => (
              <div key={d.ocdId} className="flex items-center gap-2">
                <GraduationCap className="h-3.5 w-3.5 text-[hsl(174,60%,40%)]" />
                <span className="font-display text-sm font-medium text-headline">{d.name}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 font-body text-xs text-muted-foreground/60">
            Check your school district's website for current board member information.
          </p>
        </div>
      )}

      {!isLoading && !error && members.length === 0 && districts.length === 0 && (
        <p className="py-4 font-body text-sm text-muted-foreground">
          {message || "No school district data found for this address."}
        </p>
      )}

      {/* Board member cards */}
      {members.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {members.map((member) => (
            <SchoolBoardMemberCard
              key={`${member.name}-${member.office}`}
              member={member}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SchoolBoardMemberCard({
  member,
  navigate,
}: {
  member: SchoolBoardMember;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const dot = partyDot[member.party] || partyDot.Nonpartisan;
  const civicRep = schoolBoardMemberToCivicRep(member);

  const allHandles: Record<string, string> = {
    ...(member.website ? { website: member.website } : {}),
    ...(member.email ? { email: member.email } : {}),
    ...(member.channels || {}),
  };

  const handleClick = () => {
    const repId = member.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    navigate(`/politicians/${repId}`, {
      state: { civicRep },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className="group relative flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-surface-hover"
    >
      {member.photoUrl ? (
        <img src={member.photoUrl} alt={member.name} className="h-10 w-10 rounded-lg object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(174,60%,40%/0.12)] font-display text-sm font-bold text-[hsl(174,60%,40%)]">
          {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-sm font-bold text-headline truncate">{member.name}</span>
          <div className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        </div>
        <p className="font-body text-[11px] text-muted-foreground truncate">{member.office}</p>
        {member.district && (
          <p className="font-body text-[10px] text-muted-foreground/70 truncate">{member.district}</p>
        )}
        <SocialIcons socialHandles={allHandles} size="sm" className="mt-1" />
      </div>
      <SaveRepButton rep={civicRep} size="sm" className="shrink-0" />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

function CountyOfficialCard({ official, navigate }: { official: CountyOfficial; navigate: ReturnType<typeof useNavigate> }) {
  const dot = partyDot[official.party] || partyDot.Nonpartisan;
  const civicRep = countyOfficialToCivicRep(official);

  const allHandles: Record<string, string> = {
    ...(official.website ? { website: official.website } : {}),
    ...(official.email ? { email: official.email } : {}),
    ...(official.channels || {}),
  };

  const handleClick = () => {
    const repId = official.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    navigate(`/politicians/${repId}`, {
      state: { civicRep },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className="group relative flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-surface-hover"
    >
      {official.photoUrl ? (
        <img src={official.photoUrl} alt={official.name} className="h-10 w-10 rounded-lg object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated font-display text-sm font-bold text-muted-foreground">
          {official.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-sm font-bold text-headline truncate">{official.name}</span>
          <div className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        </div>
        <p className="font-body text-[11px] text-muted-foreground truncate">{official.office}</p>
        {official.county && (
          <p className="font-body text-[10px] text-muted-foreground/70 truncate">{official.county}</p>
        )}
        <SocialIcons socialHandles={allHandles} size="sm" className="mt-1" />
      </div>
      <SaveRepButton rep={civicRep} size="sm" className="shrink-0" />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

/* ════════ Municipal/City Officials Results ════════ */
function MunicipalOfficialsResults({
  officials,
  isLoading,
  error,
  message,
  hasSearched,
  stateName,
}: {
  officials: MunicipalOfficial[];
  isLoading: boolean;
  error: string | null;
  message?: string;
  hasSearched: boolean;
  stateName: string;
}) {
  const navigate = useNavigate();

  const municipalityName = officials.length > 0 && officials[0].municipality ? officials[0].municipality : null;

  if (!hasSearched) return null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Home className="h-5 w-5 text-[hsl(43,90%,48%)]" />
        <h2 className="font-display text-xl font-bold text-headline">
          {municipalityName ? `${municipalityName} Officials` : "City & Local Officials"}
        </h2>
        {!isLoading && officials.length > 0 && (
          <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-xs text-muted-foreground">
            {officials.length} total
          </span>
        )}
      </div>

      {isLoading && <CardListSkeleton />}
      {error && <p className="font-body text-sm text-destructive">{error}</p>}
      {message && !error && officials.length === 0 && !isLoading && (
        <p className="py-4 font-body text-sm text-muted-foreground">{message}</p>
      )}
      {!isLoading && !error && !message && officials.length === 0 && (
        <p className="py-4 font-body text-sm text-muted-foreground">
          No city/municipal officials found for this address. City government data may not be available for all areas in {stateName}.
        </p>
      )}

      {officials.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {officials.map((official) => (
            <MunicipalOfficialCard
              key={`${official.name}-${official.office}`}
              official={official}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MunicipalOfficialCard({
  official,
  navigate,
}: {
  official: MunicipalOfficial;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const dot = partyDot[official.party] || partyDot.Nonpartisan;
  const civicRep = municipalOfficialToCivicRep(official);

  const allHandles: Record<string, string> = {
    ...(official.website ? { website: official.website } : {}),
    ...(official.email ? { email: official.email } : {}),
    ...(official.channels || {}),
  };

  const handleClick = () => {
    const repId = official.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    navigate(`/politicians/${repId}`, {
      state: { civicRep },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className="group relative flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-surface-hover"
    >
      {official.photoUrl ? (
        <img src={official.photoUrl} alt={official.name} className="h-10 w-10 rounded-lg object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(43,90%,48%/0.12)] font-display text-sm font-bold text-[hsl(43,90%,48%)]">
          {official.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-sm font-bold text-headline truncate">{official.name}</span>
          <div className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        </div>
        <p className="font-body text-[11px] text-muted-foreground truncate">{official.office}</p>
        {official.municipality && (
          <p className="font-body text-[10px] text-muted-foreground/70 truncate">{official.municipality}</p>
        )}
        <SocialIcons socialHandles={allHandles} size="sm" className="mt-1" />
      </div>
      <SaveRepButton rep={civicRep} size="sm" className="shrink-0" />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

/* ════════ Judicial Officials Results ════════ */
function JudicialOfficialsResults({
  officials,
  isLoading,
  error,
  message,
  hasSearched,
  stateName,
}: {
  officials: JudicialOfficial[];
  isLoading: boolean;
  error: string | null;
  message?: string;
  hasSearched: boolean;
  stateName: string;
}) {
  const navigate = useNavigate();

  const jurisdictionName = officials.length > 0 && officials[0].jurisdiction ? officials[0].jurisdiction : null;

  if (!hasSearched) return null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Scale className="h-5 w-5 text-[hsl(262,50%,50%)]" />
        <h2 className="font-display text-xl font-bold text-headline">
          {jurisdictionName ? `${jurisdictionName} Courts & Judges` : "Judges & Courts"}
        </h2>
        {!isLoading && officials.length > 0 && (
          <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-xs text-muted-foreground">
            {officials.length} total
          </span>
        )}
      </div>

      {isLoading && <CardListSkeleton />}
      {error && <p className="font-body text-sm text-destructive">{error}</p>}
      {message && !error && officials.length === 0 && !isLoading && (
        <p className="py-4 font-body text-sm text-muted-foreground">{message}</p>
      )}
      {!isLoading && !error && !message && officials.length === 0 && (
        <p className="py-4 font-body text-sm text-muted-foreground">
          No judicial officials found for this address. Court and judicial data may not be available for all areas in {stateName}.
        </p>
      )}

      {officials.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {officials.map((official) => (
            <JudicialOfficialCard
              key={`${official.name}-${official.office}`}
              official={official}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JudicialOfficialCard({
  official,
  navigate,
}: {
  official: JudicialOfficial;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const dot = partyDot[official.party] || partyDot.Nonpartisan;
  const civicRep = judicialOfficialToCivicRep(official);

  const allHandles: Record<string, string> = {
    ...(official.website ? { website: official.website } : {}),
    ...(official.email ? { email: official.email } : {}),
    ...(official.channels || {}),
  };

  const handleClick = () => {
    const repId = official.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    navigate(`/politicians/${repId}`, {
      state: { civicRep },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className="group relative flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-surface-hover"
    >
      {official.photoUrl ? (
        <img src={official.photoUrl} alt={official.name} className="h-10 w-10 rounded-lg object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(262,50%,50%/0.12)] font-display text-sm font-bold text-[hsl(262,50%,50%)]">
          {official.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-sm font-bold text-headline truncate">{official.name}</span>
          <div className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        </div>
        <p className="font-body text-[11px] text-muted-foreground truncate">{official.office}</p>
        {official.jurisdiction && (
          <p className="font-body text-[10px] text-muted-foreground/70 truncate">{official.jurisdiction}</p>
        )}
        <SocialIcons socialHandles={allHandles} size="sm" className="mt-1" />
      </div>
      <SaveRepButton rep={civicRep} size="sm" className="shrink-0" />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

/* ════════ Special District Officials Results ════════ */
function SpecialDistrictOfficialsResults({
  officials,
  isLoading,
  error,
  message,
  hasSearched,
  stateName,
}: {
  officials: SpecialDistrictOfficial[];
  isLoading: boolean;
  error: string | null;
  message?: string;
  hasSearched: boolean;
  stateName: string;
}) {
  const navigate = useNavigate();

  if (!hasSearched) return null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Layers className="h-5 w-5 text-[hsl(16,75%,52%)]" />
        <h2 className="font-display text-xl font-bold text-headline">
          Special District Officials
        </h2>
        {!isLoading && officials.length > 0 && (
          <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-xs text-muted-foreground">
            {officials.length} total
          </span>
        )}
      </div>

      {isLoading && <CardListSkeleton />}
      {error && <p className="font-body text-sm text-destructive">{error}</p>}
      {message && !error && officials.length === 0 && !isLoading && (
        <p className="py-4 font-body text-sm text-muted-foreground">{message}</p>
      )}
      {!isLoading && !error && !message && officials.length === 0 && (
        <p className="py-4 font-body text-sm text-muted-foreground">
          No special district officials found for this address. Special district data (water, fire, transit, etc.) may not be available for all areas in {stateName}.
        </p>
      )}

      {officials.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {officials.map((official) => (
            <SpecialDistrictOfficialCard
              key={`${official.name}-${official.office}`}
              official={official}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SpecialDistrictOfficialCard({
  official,
  navigate,
}: {
  official: SpecialDistrictOfficial;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const dot = partyDot[official.party] || partyDot.Nonpartisan;
  const civicRep = specialDistrictOfficialToCivicRep(official);

  const allHandles: Record<string, string> = {
    ...(official.website ? { website: official.website } : {}),
    ...(official.email ? { email: official.email } : {}),
    ...(official.channels || {}),
  };

  const handleClick = () => {
    const repId = official.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    navigate(`/politicians/${repId}`, {
      state: { civicRep },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className="group relative flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-surface-hover"
    >
      {official.photoUrl ? (
        <img src={official.photoUrl} alt={official.name} className="h-10 w-10 rounded-lg object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(16,75%,52%/0.12)] font-display text-sm font-bold text-[hsl(16,75%,52%)]">
          {official.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-sm font-bold text-headline truncate">{official.name}</span>
          <div className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        </div>
        <p className="font-body text-[11px] text-muted-foreground truncate">{official.office}</p>
        {official.district && (
          <p className="font-body text-[10px] text-muted-foreground/70 truncate">{official.district}</p>
        )}
        <SocialIcons socialHandles={allHandles} size="sm" className="mt-1" />
      </div>
      <SaveRepButton rep={civicRep} size="sm" className="shrink-0" />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

/* ════════ State News ════════ */
function StateNewsSection({ stateName }: { stateName: string }) {
  const [articles, setArticles] = useState<{ id: string; title: string; url: string; source: string; date: string; summary: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const { data } = await supabase.functions.invoke("fetch-politician-news", {
          body: { politicianName: `${stateName} politics legislature` },
        });
        if (cancelled) return;
        setArticles(data?.articles || []);
      } catch {
        // silent fail
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [stateName]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-bold text-headline">Latest News</h3>
      </div>

      {isLoading && <NewsSkeleton />}

      {!isLoading && articles.length === 0 && (
        <p className="py-4 font-body text-xs text-muted-foreground">No recent news found.</p>
      )}

      <div className="space-y-2">
        {articles.slice(0, 8).map((a) => (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-surface-hover"
          >
            <p className="font-display text-xs font-bold text-headline line-clamp-2">{a.title}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-body text-[10px] text-muted-foreground">{a.source}</span>
              <span className="font-body text-[10px] text-muted-foreground">{a.date}</span>
              <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
            </div>
          </a>
        ))}
      </div>

      <p className="mt-2 font-body text-[10px] text-muted-foreground/60 italic">
        News via Google News RSS
      </p>
    </div>
  );
}

/* ════════ Bills Summary ════════ */
function BillsSummary({ jurisdiction, stateAbbr }: { jurisdiction: string; stateAbbr: string }) {
  const { bills: allBills, total, isLoading } = useBills(undefined, jurisdiction);
  const bills = allBills.slice(0, 6);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-bold text-headline">Recent Bills</h3>
        {!isLoading && total > 0 && (
          <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-[10px] text-muted-foreground">
            {total} total
          </span>
        )}
      </div>

      {isLoading && <CardListSkeleton />}

      {!isLoading && bills.length === 0 && (
        <p className="py-4 font-body text-xs text-muted-foreground">No recent bills found.</p>
      )}

      <div className="space-y-2">
        {bills.map((bill) => (
          <Link
            key={bill.id}
            to={`/bills/${encodeURIComponent(bill.id)}`}
            state={{ bill }}
            className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-surface-hover"
          >
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px]">{bill.billNumber}</Badge>
              <span className="font-body text-[10px] text-muted-foreground">{bill.latestActionDate}</span>
            </div>
            <p className="font-display text-xs font-bold text-headline line-clamp-2">{bill.title}</p>
          </Link>
        ))}
      </div>

      {bills.length > 0 && (
        <Link to={`/bills?state=${stateAbbr}`} className="mt-3 flex items-center gap-1 font-body text-xs font-medium text-primary hover:underline">
          View all bills <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

export default StatePage;
