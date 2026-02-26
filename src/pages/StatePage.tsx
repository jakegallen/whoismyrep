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
  Loader2,
  ChevronRight,
  ExternalLink,
  Globe,
  Mail,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SiteNav from "@/components/SiteNav";
import { CardListSkeleton, NewsSkeleton } from "@/components/TabSkeletons";
import { US_STATES } from "@/lib/usStates";
import { useLegislators, type Legislator } from "@/hooks/useLegislators";
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
      <SiteNav />
      <main className="container mx-auto max-w-5xl px-4 py-8">
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
          {/* Left column: Legislators */}
          <div>
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
              <LegislatorCard key={leg.id} leg={leg} jurisdiction={jurisdiction} onClick={() => {
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
              <LegislatorCard key={leg.id} leg={leg} jurisdiction={jurisdiction} onClick={() => {
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

function LegislatorCard({ leg, jurisdiction, onClick }: { leg: Legislator; jurisdiction: string; onClick: () => void }) {
  const dot = partyDot[leg.party] || partyDot.Nonpartisan;
  const socials = leg.socialHandles || {};
  const hasLinks = socials.x || socials.facebook || socials.instagram || leg.website || leg.email;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="group flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-surface-hover"
    >
      {leg.imageUrl ? (
        <img src={leg.imageUrl} alt={leg.name} className="h-10 w-10 rounded-lg object-cover" />
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

        {hasLinks && (
          <div className="mt-1 flex items-center gap-1.5">
            {socials.x && (
              <a href={socials.x} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary transition-colors" title="X / Twitter">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
            )}
            {socials.facebook && (
              <a href={socials.facebook} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary transition-colors" title="Facebook">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </a>
            )}
            {socials.instagram && (
              <a href={socials.instagram} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary transition-colors" title="Instagram">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              </a>
            )}
            {leg.website && (
              <a href={leg.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary transition-colors" title="Website">
                <Globe className="h-3.5 w-3.5" />
              </a>
            )}
            {leg.email && (
              <a href={`mailto:${leg.email}`} onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary transition-colors" title="Email">
                <Mail className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </div>
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
