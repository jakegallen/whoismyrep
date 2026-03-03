import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import SEO from "@/components/SEO";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  MapPin,
  ExternalLink,
  AlertCircle,
  Globe,
  Phone,
  Mail,
  MessageSquare,
  BarChart3,
  DollarSign,
  FileText,
  Scale,
  Briefcase,
  User,
  Building2,
  ScrollText,
  CalendarDays,
  Landmark,
  Newspaper,
  Flag,
  Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import SiteNav from "@/components/SiteNav";
import { SocialIcons } from "@/components/SocialIcons";
import { SaveRepButton } from "@/components/SaveRepButton";
import { AnalysisSkeleton, CardListSkeleton, CommitteeSkeleton, NewsSkeleton, StockTradesSkeleton } from "@/components/TabSkeletons";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import VotingScorecard from "@/components/VotingScorecard";
import CampaignFinance from "@/components/CampaignFinance";
import AccountabilityTimeline from "@/components/AccountabilityTimeline";
import PredictionMarketsTab from "@/components/PredictionMarketsTab";
import { useBills, type Bill } from "@/hooks/useBills";
import { useLobbying } from "@/hooks/useLobbying";
import { useCourtCases } from "@/hooks/useCourtCases";
import { useCommittees } from "@/hooks/useCommittees";
import { useCongress, useMemberDetail } from "@/hooks/useCongress";
import type { CongressTerm } from "@/hooks/useCongress";
import { useLegislativeCalendar } from "@/hooks/useLegislativeCalendar";
import { useFederalRegister } from "@/hooks/useFederalRegister";
import { useCongressTrades, type CongressTrade } from "@/hooks/useCongressTrades";
import { useVotingRecords } from "@/hooks/useVotingRecords";
import { useFECFinance, formatUSD } from "@/hooks/useFECFinance";

// midterms data is now AI-generated per politician
import { Badge } from "@/components/ui/badge";
import type { Politician } from "@/lib/politicians";
import type { CivicRep } from "@/hooks/useCivicReps";
import { US_STATES } from "@/lib/usStates";

/** Convert "Last, First" DB format to "First Last" for display. */
function toDisplayName(name: string): string {
  if (!name.includes(",")) return name;
  const [last, first] = name.split(",").map((s) => s.trim());
  return `${first} ${last}`;
}

/** Unified profile shape that works with both static Politician data and dynamic CivicRep API data */
interface RepProfile {
  id: string;
  name: string;
  title: string;
  party: string;
  office: string;
  region: string;
  level: "federal" | "state" | "county" | "local";
  imageUrl?: string;
  bio: string;
  keyIssues: string[];
  website?: string;
  phone?: string;
  email?: string;
  contactForm?: string;
  socialHandles?: Record<string, string>;
  bioguideId?: string;
  /** State abbreviation for scoping API calls (e.g. "NY", "CA") */
  stateAbbr?: string;
  /** OpenStates jurisdiction name (e.g. "New York", "California") */
  jurisdiction?: string;
}

/** Extract state abbreviation from divisionId like "ocd-jurisdiction/country:us/state:ny/government" or "ocd-jurisdiction/country:us/district:dc/government" */
function extractStateFromDivisionId(divisionId?: string): { stateAbbr: string; jurisdiction: string } | null {
  if (!divisionId) return null;
  // Match standard state pattern or DC's district pattern
  const match = divisionId.match(/(?:state|district):([a-z]{2})/);
  if (!match) return null;
  const abbr = match[1].toUpperCase();
  // Import would be circular, so inline a simple lookup
  const stateNames: Record<string, string> = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
    CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
    HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
    KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
    MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
    MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
    NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
    OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
    SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
    VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
    DC: "District of Columbia", PR: "Puerto Rico",
  };
  return { stateAbbr: abbr, jurisdiction: stateNames[abbr] || abbr };
}

/** Extract bioguideId from a bioguide.congress.gov or unitedstates.github.io photo URL */
function bioguideIdFromPhotoUrl(url?: string): string | undefined {
  if (!url) return undefined;
  // bioguide.congress.gov/bioguide/photo/R/R000608.jpg
  const m1 = url.match(/bioguide\.congress\.gov\/(?:bioguide\/photo\/[A-Z]\/|photo\/)([A-Z]\d+)\.jpg/i);
  if (m1) return m1[1];
  // unitedstates.github.io/images/congress/225x275/R000608.jpg
  const m2 = url.match(/unitedstates\.github\.io\/images\/congress\/\d+x\d+\/([A-Z]\d+)\.jpg/i);
  return m2?.[1];
}

/** Derive a bioguide.congress.gov photo URL from a bioguide ID */
function bioguidePhotoUrl(bioguideId: string): string {
  return `https://bioguide.congress.gov/bioguide/photo/${bioguideId[0].toUpperCase()}/${bioguideId.toUpperCase()}.jpg`;
}

/** Convert a raw OCD jurisdiction string to a user-friendly display name */
function friendlyRegion(region: string): string {
  if (!region) return "";
  // Already a friendly name (not an OCD ID)
  if (!region.startsWith("ocd-")) return region;
  // Extract state from "ocd-jurisdiction/country:us/state:xx/..." or DC "district:dc"
  const stateMatch = region.match(/(?:state|district):([a-z]{2})/);
  if (stateMatch) {
    const abbr = stateMatch[1].toUpperCase();
    const stateNames: Record<string, string> = {
      AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
      CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
      HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
      KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
      MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
      MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
      NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
      OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
      SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
      VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
      DC: "District of Columbia", PR: "Puerto Rico",
    };
    return stateNames[abbr] || abbr;
  }
  // Federal-level: "ocd-jurisdiction/country:us/government" → "United States"
  if (region.includes("country:us") && !region.includes("state:") && !region.includes("district:")) return "United States";
  // Fallback: strip the ocd prefix for display
  return region.replace(/^ocd-jurisdiction\//, "").replace(/\//g, " · ");
}

/** Convert a CivicRep (from API) into a RepProfile */
function civicRepToProfile(rep: CivicRep): RepProfile {
  const stateInfo = extractStateFromDivisionId(rep.divisionId);
  // Fallback: parse state from office field (e.g. "Colorado Senate") when divisionId is missing
  const officeState = !stateInfo ? US_STATES.find(s => rep.office?.includes(s.name)) : undefined;
  const effectiveState = stateInfo ?? (officeState ? { stateAbbr: officeState.abbr, jurisdiction: officeState.jurisdiction } : undefined);
  const bioguideId = rep.bioguideId || bioguideIdFromPhotoUrl(rep.photoUrl);
  const imageUrl = rep.photoUrl || (rep.level === "federal" && bioguideId ? bioguidePhotoUrl(bioguideId) : undefined);
  return {
    id: rep.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    name: rep.name,
    title: rep.office,
    party: rep.party,
    office: rep.office,
    region: effectiveState?.jurisdiction || rep.jurisdiction || rep.divisionId || "",
    level: rep.level,
    imageUrl,
    bio: "",
    keyIssues: [],
    website: rep.website,
    phone: rep.phone,
    email: rep.email,
    socialHandles: rep.socialHandles,
    bioguideId,
    stateAbbr: effectiveState?.stateAbbr,
    jurisdiction: effectiveState?.jurisdiction || rep.jurisdiction,
  };
}

const tabs = [
  { id: "overview", label: "Overview", icon: User },
  { id: "legislation", label: "Voting & Bills", icon: FileText },
  { id: "money", label: "Money & Markets", icon: DollarSign },
  { id: "accountability", label: "Accountability", icon: Scale },
  { id: "media", label: "Media & News", icon: Newspaper },
] as const;

type TabId = (typeof tabs)[number]["id"];

const PoliticianDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const [imgError, setImgError] = useState(false);

  // Build profile from either: router state Politician, router state CivicRep, or URL param lookup
  const politician: RepProfile | undefined = (() => {
    const statePol = location.state?.politician as Politician | undefined;
    if (statePol?.id) {
      // Try to infer state from the office field (e.g. "Nevada Senate")
      const officeState = US_STATES.find(s => statePol.office?.includes(s.name));
      return {
        ...statePol,
        stateAbbr: officeState?.abbr || "",
        jurisdiction: officeState?.jurisdiction || "",
      } as RepProfile;
    }

    const stateRep = location.state?.civicRep as CivicRep | undefined;
    if (stateRep) return civicRepToProfile(stateRep);

    return undefined;
  })();

  // Fallback: if social handles weren't available at navigate time (race condition),
  // use the shared React Query cache from legislators-social-media.json
  const { data: socialLookup } = useQuery({
    queryKey: ["legislators-social-media"],
    queryFn: async (): Promise<Record<string, Record<string, string>>> => {
      const resp = await fetch("https://unitedstates.github.io/congress-legislators/legislators-social-media.json");
      if (!resp.ok) return {};
      const data = await resp.json();
      const lookup: Record<string, Record<string, string>> = {};
      for (const entry of data) {
        const bioguide = entry.id?.bioguide;
        if (!bioguide) continue;
        const social: Record<string, string> = {};
        if (entry.social?.twitter) social.x = entry.social.twitter;
        if (entry.social?.facebook) social.facebook = entry.social.facebook;
        if (entry.social?.instagram) social.instagram = entry.social.instagram;
        if (entry.social?.youtube) social.youtube = entry.social.youtube;
        else if (entry.social?.youtube_id) social.youtube = entry.social.youtube_id;
        if (Object.keys(social).length > 0) lookup[bioguide] = social;
      }
      return lookup;
    },
    staleTime: 24 * 60 * 60 * 1000,
    enabled: !!(politician?.bioguideId),
  });

  // Fallback: fetch legislators-current.json for phone + website when not populated from router state
  const { data: legislatorContactLookup } = useQuery({
    queryKey: ["legislators-current-contact"],
    queryFn: async (): Promise<Record<string, { phone?: string; website?: string; senateClass?: number }>> => {
      const resp = await fetch("https://unitedstates.github.io/congress-legislators/legislators-current.json");
      if (!resp.ok) return {};
      const data = await resp.json();
      const lookup: Record<string, { phone?: string; website?: string; senateClass?: number }> = {};
      for (const entry of data) {
        const bioguide = entry.id?.bioguide;
        if (!bioguide) continue;
        const terms = entry.terms || [];
        const lastTerm = terms[terms.length - 1] || {};
        const contact: { phone?: string; website?: string; senateClass?: number } = {};
        if (lastTerm.phone) contact.phone = lastTerm.phone;
        if (lastTerm.url) contact.website = lastTerm.url;
        // Senate class (1, 2, or 3) for authoritative election year calculation
        if (lastTerm.type === "sen" && lastTerm.class) contact.senateClass = lastTerm.class as number;
        if (Object.keys(contact).length > 0) lookup[bioguide] = contact;
      }
      return lookup;
    },
    staleTime: 24 * 60 * 60 * 1000,
    enabled: !!(politician?.bioguideId || politician?.id?.startsWith("congress-")),
  });

  // Hero stat data — React Query deduplicates; bills lifted to avoid double-fetch with BillsTab
  const heroChamberId = politician?.office.includes("Senate") ? "Senate" : politician?.office.includes("Assembly") ? "Assembly" : undefined;
  // Derive bioguideId from the id field (congress-{bioguideId}) when not explicitly set
  const derivedBioguideId = politician?.bioguideId ||
    (politician?.id?.startsWith("congress-") ? politician.id.slice("congress-".length) : undefined);
  const { data: votingData, isLoading: votingLoading } = useVotingRecords(politician?.name, heroChamberId, politician?.jurisdiction, derivedBioguideId, politician?.level);
  const { data: fecData, isLoading: fecLoading, error: fecError } = useFECFinance(
    politician?.level === "federal" ? politician?.name : undefined,
    undefined,
    undefined,
    undefined,
    politician?.stateAbbr,
  );
  const { bills, total: billsTotal, isLoading: billsLoading, error: billsError } = useBills(
    politician?.name,
    politician?.jurisdiction,
    politician?.level,
    derivedBioguideId,
  );

  const billsPassed = useMemo(
    () => bills.filter((b) => /pass|enroll/i.test(b.status)).length,
    [bills],
  );

  // ── Election year ──────────────────────────────────────────────────────────
  const isSenator = politician?.office?.toLowerCase().includes("senator") || politician?.office?.toLowerCase().includes("senate");
  const isRepresentative = politician?.level === "federal" && !isSenator;
  // Only fetch member detail for federal politicians with a bioguide ID
  const { data: memberDetailData } = useMemberDetail(
    politician?.level === "federal" ? derivedBioguideId : undefined
  );

  const effectiveSocialHandles = useMemo(() => {
    const existing = politician?.socialHandles;
    if (existing && Object.keys(existing).length > 0) return existing;
    if (politician?.bioguideId && socialLookup?.[politician.bioguideId]) return socialLookup[politician.bioguideId];
    if (votingData?.socialHandles && Object.keys(votingData.socialHandles).length > 0) return votingData.socialHandles;
    return existing;
  }, [politician, socialLookup, votingData]);

  const effectivePhone = politician?.phone ||
    (derivedBioguideId ? legislatorContactLookup?.[derivedBioguideId]?.phone : undefined);

  const effectiveWebsite = politician?.website ||
    memberDetailData?.website ||
    (derivedBioguideId ? legislatorContactLookup?.[derivedBioguideId]?.website : undefined);

  const electionYear = useMemo((): number | null => {
    if (!politician || politician.level !== "federal") return null;
    const now = new Date().getFullYear();
    if (isRepresentative) {
      // House: every 2 years on even years
      return now % 2 === 0 ? now : now + 1;
    }
    if (isSenator) {
      // Primary: use authoritative Senate class from legislators-current.json
      // Class 1 → 2030 cycle, Class 2 → 2026 cycle, Class 3 → 2028 cycle
      const cls = derivedBioguideId ? legislatorContactLookup?.[derivedBioguideId]?.senateClass : undefined;
      if (cls) {
        const BASE: Record<number, number> = { 1: 2030, 2: 2026, 3: 2028 };
        const base = BASE[cls];
        if (base) {
          let year = base;
          while (year < now) year += 6;
          return year;
        }
      }
      // Fallback: use the most recent Senate term start year + 6
      const terms: CongressTerm[] = memberDetailData?.terms || [];
      const senateTerms = terms
        .filter((t) => t.chamber.toLowerCase().includes("senate"))
        .sort((a, b) => b.startYear - a.startYear);
      if (senateTerms.length === 0) return null;
      const latestStart = senateTerms[0].startYear;
      // Senate terms are 6 years; election in the year the term ends
      let electionYr = latestStart + 6;
      while (electionYr < now) electionYr += 6;
      return electionYr;
    }
    return null;
  }, [politician, isSenator, isRepresentative, memberDetailData, legislatorContactLookup, derivedBioguideId]);

  // Dynamic: election is "upcoming" if it's this year or next
  const isMidterms = electionYear !== null && electionYear <= new Date().getFullYear() + 1;

  // Derive the year they first took their current chamber seat from terms data
  const inOfficeSince = useMemo((): number | null => {
    if (politician?.level !== "federal") return null;
    const terms: CongressTerm[] = memberDetailData?.terms || [];
    if (terms.length === 0) return null;
    const sorted = [...terms].sort((a, b) => a.startYear - b.startYear);
    return sorted[0]?.startYear ?? null;
  }, [politician, memberDetailData]);

  useEffect(() => {
    if (!politician) {
      navigate("/");
    }
  }, [politician, navigate]);

  // Dynamic page title for SEO and browser tabs
  useEffect(() => {
    if (politician) {
      const displayName = toDisplayName(politician.name);
      document.title = `${displayName} — ${politician.office} | WhoIsMyRep.us`;
    }
    return () => { document.title = "WhoIsMyRep.us — Find Your U.S. Representatives"; };
  }, [politician]);

  // Plausible analytics: track politician page view
  useEffect(() => {
    if (politician) {
      trackEvent("View Politician", { name: politician.name, party: politician.party || "Unknown" });
    }
  }, [politician]);

  if (!politician) return null;

  // Hex colors so `${partyHex}50` produces a valid 8-digit hex with ~31% alpha
  const partyHex =
    politician.party === "Democrat"
      ? "#308ce8"
      : politician.party === "Republican"
        ? "#dc2828"
        : "#f39a25";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${toDisplayName(politician.name)} — ${politician.office || "Official"}`}
        description={`View ${toDisplayName(politician.name)}'s voting record, campaign finance, committee assignments, and legislative activity.`}
        path={`/politicians/${id}`}
        type="profile"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: toDisplayName(politician.name),
          jobTitle: politician.office,
          affiliation: { "@type": "Organization", name: politician.party },
          ...(politician.imageUrl && { image: politician.imageUrl }),
          ...(politician.website && { url: politician.website }),
          ...(politician.region && { workLocation: { "@type": "Place", name: politician.region } }),
        }}
      />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Skip to main content
      </a>
      <SiteNav />

      <main id="main-content" className="container mx-auto max-w-4xl px-4 py-8" aria-label={`Details for ${toDisplayName(politician.name)}`}>
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-2 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* ═══════ HERO CARD ═══════ */}
          <div className="rounded-2xl border border-border bg-surface-elevated overflow-hidden">
            {/* Party-colored accent stripe */}
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${partyHex}, ${partyHex}50)` }} />

            <div className="p-6 sm:p-8">
              {/* Top row: avatar + identity + contacts */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                {/* Avatar with party ring */}
                <div className="shrink-0 flex flex-col items-center gap-2">
                  <div
                    className="rounded-full p-[3px]"
                    style={{ background: `linear-gradient(135deg, ${partyHex}, ${partyHex}50)` }}
                  >
                    {politician.imageUrl && !imgError ? (
                      <img
                        src={politician.imageUrl}
                        alt={toDisplayName(politician.name)}
                        className="h-28 w-28 rounded-full object-cover bg-surface-elevated"
                        loading="lazy"
                        decoding="async"
                        onError={() => setImgError(true)}
                        onLoad={(e) => {
                          // Detect ORB-blocked images: browser reports load but image has 0 natural dimensions
                          const img = e.target as HTMLImageElement;
                          if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                            setImgError(true);
                          }
                        }}
                      />
                    ) : (
                      <div
                        className="flex h-28 w-28 items-center justify-center rounded-full font-display text-3xl font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${partyHex}cc, ${partyHex}88)` }}
                      >
                        {toDisplayName(politician.name).split(" ").map((n) => n[0]).join("")}
                      </div>
                    )}
                  </div>

                  {/* Re-election badge */}
                  {electionYear !== null && (
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0, y: -4 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.3 }}
                    >
                      {isMidterms ? (
                        <div
                          className="relative flex items-center gap-1 rounded-full px-2.5 py-1 font-body text-xs font-bold tracking-wide select-none"
                          style={{
                            background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,88,12,0.15))",
                            border: "1px solid rgba(245,158,11,0.45)",
                            color: "#f59e0b",
                            boxShadow: "0 0 12px rgba(245,158,11,0.35), 0 0 4px rgba(234,88,12,0.2)",
                          }}
                        >
                          {/* pulse ring */}
                          <span
                            className="absolute inset-0 rounded-full animate-ping"
                            style={{ background: "rgba(245,158,11,0.15)", animationDuration: "2s" }}
                          />
                          <Zap className="relative h-3 w-3 shrink-0" fill="currentColor" />
                          <span className="relative">Election {electionYear}</span>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-1 rounded-full px-2.5 py-1 font-body text-xs font-medium select-none"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "hsl(var(--muted-foreground))",
                          }}
                        >
                          <CalendarDays className="h-3 w-3 shrink-0" />
                          <span>Up in {electionYear}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Identity + contacts */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2">
                    <h1 className="font-display text-3xl font-bold text-headline leading-tight">{toDisplayName(politician.name)}</h1>
                    <span
                      className="mt-1.5 shrink-0 rounded-full px-2.5 py-0.5 font-body text-xs font-bold tracking-wide"
                      style={{ backgroundColor: `${partyHex}20`, color: partyHex }}
                    >
                      {politician.level.charAt(0).toUpperCase() + politician.level.slice(1)}
                    </span>
                    <SaveRepButton
                      rep={{
                        name: politician.name,
                        office: politician.office,
                        level: politician.level,
                        party: politician.party,
                        phone: politician.phone,
                        email: politician.email,
                        website: politician.website,
                        photoUrl: politician.imageUrl,
                        socialHandles: politician.socialHandles,
                        divisionId: "",
                        jurisdiction: politician.jurisdiction,
                        bioguideId: politician.bioguideId,
                      }}
                      size="md"
                      className="mt-1"
                    />
                  </div>
                  <p className="mt-1 font-body text-base font-semibold" style={{ color: partyHex }}>
                    {politician.title} · {politician.party}
                  </p>
                  {politician.region && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-tertiary" />
                      <span className="font-body text-sm text-tertiary">{friendlyRegion(politician.region)}</span>
                    </div>
                  )}
                  {inOfficeSince && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <Landmark className="h-3.5 w-3.5 text-tertiary" />
                      <span className="font-body text-sm text-tertiary">In office since {inOfficeSince}</span>
                    </div>
                  )}
                  {(effectiveWebsite || effectivePhone || politician.email || politician.contactForm) ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {effectiveWebsite && (
                        <ContactLink href={effectiveWebsite} icon={<Globe className="h-4 w-4 text-primary" />} label="Website" external />
                      )}
                      {effectivePhone && (
                        <ContactLink href={`tel:${effectivePhone}`} icon={<Phone className="h-4 w-4 text-[hsl(142,71%,45%)]" />} label={effectivePhone} />
                      )}
                      {politician.email && (
                        <ContactLink href={`mailto:${politician.email}`} icon={<Mail className="h-4 w-4 text-[hsl(210,80%,55%)]" />} label="Email" />
                      )}
                      {politician.contactForm && (
                        <ContactLink href={politician.contactForm} icon={<MessageSquare className="h-4 w-4 text-[hsl(280,60%,55%)]" />} label="Contact Form" external />
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 font-body text-xs text-muted-foreground/60 italic">
                      No direct contact information available for this official.
                    </p>
                  )}
                  <SocialIcons socialHandles={effectiveSocialHandles} size="md" className="mt-3" />
                </div>
              </div>

              {/* ── Stat tiles ── */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Vote Participation */}
                <div className="flex flex-col rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-body text-xs text-muted-foreground">Vote Participation</span>
                  </div>
                  <div className="mt-2">
                    {votingLoading ? (
                      <div className="h-7 w-16 animate-pulse rounded bg-surface-elevated" />
                    ) : votingData?.summary && votingData.summary.totalVotes > 0 ? (
                      <span className="font-display text-2xl font-bold text-headline">
                        {votingData.summary.attendance}%
                      </span>
                    ) : votingData?.summary ? (
                      <span className="font-body text-sm text-muted-foreground">No data</span>
                    ) : (
                      <span className="font-display text-2xl font-bold text-muted-foreground">—</span>
                    )}
                  </div>
                </div>

                {/* Party Alignment */}
                <div className="flex flex-col rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center gap-1.5">
                    <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-body text-xs text-muted-foreground">Majority Alignment</span>
                  </div>
                  <div className="mt-2">
                    {votingLoading ? (
                      <div className="h-7 w-16 animate-pulse rounded bg-surface-elevated" />
                    ) : votingData?.summary && votingData.summary.totalVotes > 0 ? (
                      <span className="font-display text-2xl font-bold text-headline">
                        {votingData.summary.partyLineRate}%
                      </span>
                    ) : votingData?.summary ? (
                      <span className="font-body text-sm text-muted-foreground">No data</span>
                    ) : (
                      <span className="font-display text-2xl font-bold text-muted-foreground">—</span>
                    )}
                  </div>
                </div>

                {/* Total Raised (federal) / Bills Passed (state+) */}
                <div className="flex flex-col rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      {politician.level === "federal" ? (
                        <>
                          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-body text-xs text-muted-foreground">Total Raised</span>
                        </>
                      ) : (
                        <>
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-body text-xs text-muted-foreground">Bills Passed</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    {politician.level === "federal" ? (
                      fecLoading ? (
                        <div className="h-7 w-16 animate-pulse rounded bg-surface-elevated" />
                      ) : fecData?.totals?.[0] ? (
                        <span className="font-display text-2xl font-bold text-headline">
                          {formatUSD(fecData.totals[0].receipts)}
                        </span>
                      ) : (
                        <span className="font-display text-2xl font-bold text-muted-foreground">—</span>
                      )
                    ) : billsLoading ? (
                      <div className="h-7 w-16 animate-pulse rounded bg-surface-elevated" />
                    ) : (
                      <span className="font-display text-2xl font-bold text-headline">
                        {billsPassed}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bills Sponsored */}
                <div className="flex flex-col rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center gap-1.5">
                    <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-body text-xs text-muted-foreground">Bills Sponsored</span>
                  </div>
                  <div className="mt-2">
                    {billsLoading ? (
                      <div className="h-7 w-16 animate-pulse rounded bg-surface-elevated" />
                    ) : billsError ? (
                      <span className="font-display text-2xl font-bold text-muted-foreground">—</span>
                    ) : (
                      <span className="font-display text-2xl font-bold text-headline">
                        {billsTotal}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════ TABS ═══════ */}
          <div className="mt-8 border-b border-border">
            <nav
              className="-mb-px flex gap-1 overflow-x-auto scrollbar-hide"
              role="tablist"
              aria-label="Politician detail sections"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`tabpanel-${tab.id}`}
                    id={`tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 font-body text-sm font-medium transition-colors ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* ═══════ TAB CONTENT ═══════ */}
          <div
            className="mt-8"
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
          >
            <ErrorBoundary fallbackTitle="This section encountered an error" key={activeTab}>
            {activeTab === "overview" && (
              <OverviewTab
                politician={politician}
                votingSummary={votingData?.summary}
                recentBills={bills.slice(0, 5)}
                inOfficeSince={inOfficeSince}
              />
            )}

            {activeTab === "legislation" && (
              <div className="space-y-10">
                <VotingScorecard
                  politicianId={politician.id}
                  politicianName={politician.name}
                  keyIssues={politician.keyIssues}
                  party={politician.party}
                  level={politician.level}
                  chamber={politician.office.includes("Senate") ? "Senate" : politician.office.includes("Assembly") ? "Assembly" : undefined}
                  jurisdiction={politician.jurisdiction}
                  bioguideId={derivedBioguideId}
                />
                <div className="h-px bg-border" />
                <BillsTab politicianName={politician.name} jurisdiction={politician.jurisdiction} level={politician.level} bills={bills} isLoading={billsLoading} error={billsError} />
                <div className="h-px bg-border" />
                <CommitteesTab politicianName={politician.name} chamber={politician.office.includes("Senate") ? "Senate" : politician.office.includes("Assembly") ? "Assembly" : undefined} jurisdiction={politician.jurisdiction} stateAbbr={politician.stateAbbr} level={politician.level} bioguideId={derivedBioguideId} />
                <div className="h-px bg-border" />
                <CalendarTab politicianName={politician.name} chamber={politician.office.includes("Senate") ? "Senate" : politician.office.includes("Assembly") ? "Assembly" : undefined} stateAbbr={politician.stateAbbr} jurisdiction={politician.jurisdiction} />
              </div>
            )}

            {activeTab === "money" && (
              <div className="space-y-10">
                <CampaignFinance fecData={fecData} isLoading={fecLoading} level={politician.level} error={fecError instanceof Error ? fecError.message : fecError ? String(fecError) : null} />
                {politician.level === "federal" && (
                  <>
                    <div className="h-px bg-border" />
                    <StockTradesSection politicianName={politician.name} chamber={isSenator ? "senate" : "house"} />
                  </>
                )}
                <div className="h-px bg-border" />
                <PredictionMarketsTab politicianName={politician.name} state={politician.jurisdiction} />
              </div>
            )}

            {activeTab === "accountability" && (
              <div className="space-y-10">
                <LobbyingTab politicianName={politician.name} />
                <div className="h-px bg-border" />
                <CourtCasesTab politicianName={politician.name} />
                <div className="h-px bg-border" />
                <FederalRegisterTab politicianName={politician.name} />
                <div className="h-px bg-border" />
                <AccountabilityTimeline
                  politicianName={politician.name}
                  chamber={politician.office.includes("Senate") ? "Senate" : politician.office.includes("Assembly") ? "Assembly" : undefined}
                  jurisdiction={politician.jurisdiction}
                />
              </div>
            )}

            {activeTab === "media" && (
              <div className="space-y-10">
                <NewsTab politicianName={politician.name} />
                <div className="h-px bg-border" />
                <MidtermsTab politician={politician} />
              </div>
            )}
            </ErrorBoundary>
          </div>
        </motion.div>
      </main>
    </div>
  );
};


/* ═══════════════════════════════════════════ */
/*  Overview Tab                               */
/* ═══════════════════════════════════════════ */
function OverviewTab({
  politician,
  votingSummary,
  recentBills,
  inOfficeSince,
}: {
  politician: RepProfile;
  votingSummary?: { totalVotes: number; yesVotes: number; noVotes: number; abstainVotes: number; notVoting: number; attendance: number; partyLineRate: number; session: string };
  recentBills?: { identifier?: string; id?: string; title?: string }[];
  inOfficeSince?: number | null;
}) {
  const chamber = politician.office.includes("Senate") ? "Senate" : politician.office.includes("Assembly") ? "Assembly" : undefined;
  const overviewBioguideId = politician.bioguideId || (politician.id?.startsWith("congress-") ? politician.id.slice("congress-".length) : undefined);
  const { data: committeesData, isLoading: commLoading } = useCommittees(chamber, politician.name, politician.jurisdiction, politician.stateAbbr, politician.level, overviewBioguideId);
  const legislatorCommittees = committeesData?.legislatorCommittees || [];

  // Internal AI analysis state — fetches once committee data arrives
  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait until committee data is loaded (or errored out)
    if (commLoading) return;

    let cancelled = false;
    const fetchAnalysis = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("analyze-article", {
          body: {
            politicianName: politician.name,
            party: politician.party,
            office: politician.office,
            state: politician.jurisdiction || politician.stateAbbr,
            level: politician.level,
            chamber: chamber,
            inOfficeSince: inOfficeSince ?? undefined,
            summary: politician.bio,
            committees: legislatorCommittees,
            recentBills: recentBills ?? [],
            votingSummary: votingSummary ?? undefined,
          },
        });
        if (cancelled) return;
        if (fnError) throw fnError;
        if (data?.analysis) {
          setAnalysis(data.analysis);
        } else {
          setError(data?.error || "No analysis returned");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to generate analysis");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchAnalysis();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commLoading, politician.name]);

  return (
    <div className="space-y-8">
      {/* Bio */}
      {politician.bio && (
        <p className="font-body text-sm leading-relaxed text-secondary-custom">{politician.bio}</p>
      )}

      {/* Key issues */}
      {politician.keyIssues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {politician.keyIssues.map((issue) => (
            <span key={issue} className="rounded-lg bg-surface-elevated px-3 py-1.5 font-body text-xs font-medium text-muted-foreground">
              {issue}
            </span>
          ))}
        </div>
      )}

      {/* Committee Assignments */}
      {commLoading && (
        <div className="flex items-center gap-3 py-2">
          <Building2 className="h-4 w-4 text-muted-foreground/40" />
          <div className="h-4 w-48 animate-pulse rounded bg-surface-elevated" />
        </div>
      )}
      {!commLoading && legislatorCommittees.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold text-headline">Committee Assignments</h3>
            <span className="rounded-md bg-surface-elevated px-1.5 py-0.5 font-body text-[10px] text-muted-foreground">{legislatorCommittees.length}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {legislatorCommittees.map((name) => (
              <div key={name} className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="font-body text-xs leading-snug text-secondary-custom">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-px bg-border" />

      {/* AI Analysis */}
      <h2 className="font-display text-xl font-bold text-headline">Recent Activity & Analysis</h2>

      {isLoading && <AnalysisSkeleton />}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-body text-sm font-medium text-foreground">Couldn't load analysis</p>
            <p className="mt-1 font-body text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && analysis && (
        <article>
          <ReactMarkdown
            skipHtml
            components={{
              h2: ({ children }) => <h2 className="mb-3 mt-8 font-display text-xl font-bold text-headline first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-2 mt-6 font-display text-lg font-semibold text-headline">{children}</h3>,
              p: ({ children }) => <p className="mb-4 font-body text-sm leading-relaxed text-secondary-custom">{children}</p>,
              ul: ({ children }) => <ul className="mb-4 ml-4 list-disc space-y-2">{children}</ul>,
              li: ({ children }) => <li className="font-body text-sm leading-relaxed text-secondary-custom">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-crimson-glow">
                  {children}
                </a>
              ),
            }}
          >
            {analysis}
          </ReactMarkdown>
        </article>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  Bills Tab                                  */
/* ═══════════════════════════════════════════ */
function BillsTab({ politicianName, level, bills, isLoading, error }: { politicianName: string; jurisdiction?: string; level?: string; bills: Bill[]; isLoading: boolean; error: string | null }) {

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">Bills & Legislation</h2>
        {!isLoading && bills.length > 0 && <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-xs text-muted-foreground">{bills.length} found</span>}
      </div>

      {isLoading && <CardListSkeleton />}

      {error && <ErrorBox message={error} />}

      {!isLoading && bills.length === 0 && !error && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 font-body text-sm text-muted-foreground">
            {level === "federal"
              ? `No sponsored legislation found for ${politicianName}.`
              : `No bills found mentioning ${politicianName}.`}
          </p>
          <p className="mt-1 font-body text-xs text-muted-foreground/60">
            {level === "federal"
              ? "Data sourced from Congress.gov."
              : "Data sourced from OpenStates.org."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {bills.slice(0, 20).map((bill, idx) => (
          <motion.div
            key={bill.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03, duration: 0.25 }}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-surface-elevated cursor-pointer"
            onClick={() => window.open(bill.url, "_blank")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display text-sm font-bold text-headline">{bill.billNumber}</span>
                  <span className={`rounded px-1.5 py-0.5 font-body text-[10px] font-bold uppercase tracking-wider ${
                    bill.status.toLowerCase().includes("pass") || bill.status.toLowerCase().includes("enroll")
                      ? "bg-[hsl(142,71%,45%/0.15)] text-[hsl(142,71%,45%)]"
                      : bill.status.toLowerCase().includes("fail") || bill.status.toLowerCase().includes("dead")
                        ? "bg-[hsl(0,72%,51%/0.15)] text-[hsl(0,72%,51%)]"
                        : "bg-surface-elevated text-muted-foreground"
                  }`}>
                    {bill.status}
                  </span>
                  <span className="font-body text-[10px] text-muted-foreground">{bill.chamber}</span>
                </div>
                <p className="font-body text-sm text-secondary-custom line-clamp-2">{bill.title}</p>
                {bill.sponsors.length > 0 && (
                  <p className="mt-1 font-body text-xs text-muted-foreground">
                    Sponsors: {bill.sponsors.slice(0, 3).join(", ")}
                    {bill.sponsors.length > 3 && ` +${bill.sponsors.length - 3} more`}
                  </p>
                )}
              </div>
              <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  Committees Tab                             */
/* ═══════════════════════════════════════════ */
function CommitteesTab({ politicianName, chamber, jurisdiction, stateAbbr, level, bioguideId }: { politicianName: string; chamber?: string; jurisdiction?: string; stateAbbr?: string; level?: string; bioguideId?: string }) {
  const { data: committeesData, isLoading: commLoading, error: commError } = useCommittees(chamber, politicianName, jurisdiction, stateAbbr, level, bioguideId);
  const { data: reportsData, isLoading: reportsLoading } = useCongress("committee_reports", { congress: 119, limit: 10 });

  const committees = committeesData?.committees || [];
  const legislatorCommittees = committeesData?.legislatorCommittees || [];
  const recentBills = committeesData?.recentBills || [];
  const reports = reportsData?.items || [];

  const isLoading = commLoading;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Building2 className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">Committee Assignments</h2>
        {!isLoading && <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-xs text-muted-foreground">{legislatorCommittees.length} committees</span>}
      </div>

      {isLoading && <CommitteeSkeleton />}

      {commError && <ErrorBox message={commError instanceof Error ? commError.message : "Failed to load"} />}

      {/* Committees this rep serves on */}
      {!isLoading && legislatorCommittees.length > 0 && (
        <div className="space-y-3">
          {committees
            .filter((c) => legislatorCommittees.includes(c.name))
            .map((committee, idx) => (
              <motion.div
                key={committee.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-sm font-bold text-headline">{committee.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{committee.chamber}</Badge>
                      <span className="font-body text-xs text-muted-foreground">{committee.memberCount} members</span>
                    </div>
                    {committee.members.length > 0 && (
                      <p className="mt-2 font-body text-xs text-muted-foreground line-clamp-1">
                        Members: {committee.members.slice(0, 5).map((m) => m.name).join(", ")}
                        {committee.members.length > 5 && ` +${committee.members.length - 5} more`}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      )}

      {!isLoading && legislatorCommittees.length === 0 && !commError && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 font-body text-sm text-muted-foreground">No committee assignments found for this representative.</p>
          <p className="mt-1 font-body text-xs text-muted-foreground/60">Data sourced from OpenStates.org and Congress.gov.</p>
        </div>
      )}

      {/* Recent bills from their committees */}
      {!isLoading && recentBills.length > 0 && (
        <div>
          <h3 className="mb-3 font-display text-lg font-semibold text-headline">Recent Bills from Committees</h3>
          <div className="space-y-2">
            {recentBills.slice(0, 10).map((bill, idx) => (
              <motion.div
                key={bill.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display text-xs font-bold text-headline">{bill.identifier}</span>
                  <span className="font-body text-[10px] text-muted-foreground">{bill.chamber}</span>
                </div>
                <p className="font-body text-xs text-secondary-custom line-clamp-1">{bill.title}</p>
                {bill.lastAction && (
                  <p className="mt-1 font-body text-[10px] text-muted-foreground">Latest: {bill.lastAction}</p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Federal Committee Reports */}
      {!reportsLoading && reports.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-headline">
            <ScrollText className="h-4 w-4 text-primary" />
            Federal Committee Reports
          </h3>
          <div className="space-y-2">
            {reports.slice(0, 8).map((report: any, idx: number) => (
              <motion.div
                key={report.citation || report.number || `report-${report.updateDate}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px]">{report.chamber || "Congress"}</Badge>
                  {report.citation && <span className="font-body text-[10px] text-muted-foreground">{report.citation}</span>}
                </div>
                <p className="font-body text-xs text-secondary-custom line-clamp-2">{report.title || `Report ${report.number}`}</p>
                {report.updateDate && (
                  <p className="mt-1 font-body text-[10px] text-muted-foreground">Updated: {report.updateDate}</p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  Lobbying Tab                               */
/* ═══════════════════════════════════════════ */
function LobbyingTab({ politicianName }: { politicianName: string }) {
  const { data, isLoading, error } = useLobbying("filings", { search: politicianName });

  const filings = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Briefcase className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">Lobbying Connections</h2>
        {!isLoading && <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-xs text-muted-foreground">{data?.total ?? 0} filings</span>}
      </div>

      {isLoading && <CardListSkeleton />}

      {error && <ErrorBox message={error instanceof Error ? error.message : "Failed to load"} />}

      {!isLoading && filings.length === 0 && !error && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 font-body text-sm text-muted-foreground">No lobbying filings found related to this representative.</p>
          <p className="mt-1 font-body text-xs text-muted-foreground/60">Data sourced from the Senate Office of Public Records via Congress.gov.</p>
        </div>
      )}

      <div className="space-y-3">
        {filings.slice(0, 20).map((filing: any, idx: number) => (
          <motion.div
            key={filing.id || `${filing.registrant}-${filing.filingYear}-${filing.filingPeriod}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03, duration: 0.25 }}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-surface-elevated"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-headline">{filing.registrant || "Unknown Registrant"}</p>
                <p className="mt-0.5 font-body text-xs text-secondary-custom">
                  Client: {filing.client || "N/A"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {filing.filingYear && (
                    <span className="rounded bg-surface-elevated px-2 py-0.5 font-body text-[10px] text-muted-foreground">
                      {filing.filingYear} {filing.filingPeriod || ""}
                    </span>
                  )}
                  {filing.amount != null && (
                    <span className="rounded bg-[hsl(142,71%,45%/0.15)] px-2 py-0.5 font-body text-[10px] font-semibold text-[hsl(142,71%,45%)]">
                      ${Number(filing.amount).toLocaleString()}
                    </span>
                  )}
                </div>
                {filing.issues?.length > 0 && (
                  <p className="mt-1.5 font-body text-xs text-muted-foreground line-clamp-1">
                    Issues: {filing.issues.map((i: any) => i.generalIssue || i).join(", ")}
                  </p>
                )}
              </div>
              {filing.url && (
                <a href={filing.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                </a>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  Court Cases Tab                            */
/* ═══════════════════════════════════════════ */
function CourtCasesTab({ politicianName }: { politicianName: string }) {
  const { data, isLoading, error } = useCourtCases("opinions", politicianName);

  const cases = data?.cases || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Scale className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">Court Cases</h2>
        {!isLoading && <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-xs text-muted-foreground">{data?.total ?? 0} results</span>}
      </div>

      {isLoading && <CardListSkeleton />}

      {error && <ErrorBox message={error instanceof Error ? error.message : "Failed to load"} />}

      {!isLoading && cases.length === 0 && !error && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Scale className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 font-body text-sm text-muted-foreground">No court cases found mentioning this representative.</p>
          <p className="mt-1 font-body text-xs text-muted-foreground/60">Data sourced from CourtListener (Free Law Project).</p>
        </div>
      )}

      <div className="space-y-3">
        {cases.slice(0, 20).map((c, idx) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03, duration: 0.25 }}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-surface-elevated cursor-pointer"
            onClick={() => c.url && window.open(c.url, "_blank")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-headline">{c.caseName}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="font-body text-xs text-secondary-custom">{c.court}</span>
                  {c.dateFiled && (
                    <span className="font-body text-[10px] text-muted-foreground">Filed: {c.dateFiled}</span>
                  )}
                  {c.docketNumber && (
                    <span className="font-body text-[10px] text-muted-foreground">#{c.docketNumber}</span>
                  )}
                </div>
                {c.snippet && (
                  <p className="mt-1.5 font-body text-xs text-muted-foreground line-clamp-2">{c.snippet}</p>
                )}
              </div>
              {c.url && <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  Calendar Tab                               */
/* ═══════════════════════════════════════════ */
function CalendarTab({ politicianName, chamber, stateAbbr, jurisdiction }: { politicianName: string; chamber?: string; stateAbbr?: string; jurisdiction?: string }) {
  const { data, isLoading, error } = useLegislativeCalendar(stateAbbr?.toLowerCase(), jurisdiction);
  const events = (data?.events || []).filter(
    (e) =>
      !chamber ||
      e.chamber?.toLowerCase().includes(chamber.toLowerCase()) ||
      e.name?.toLowerCase().includes(politicianName.split(" ").pop()?.toLowerCase() || "___")
  );

  const typeColors: Record<string, string> = {
    hearing: "bg-[hsl(210,80%,55%/0.15)] text-[hsl(210,80%,55%)]",
    committee: "bg-[hsl(168,80%,55%/0.15)] text-[hsl(168,80%,55%)]",
    vote: "bg-[hsl(0,72%,51%/0.15)] text-[hsl(0,72%,51%)]",
    session: "bg-[hsl(250,85%,65%/0.15)] text-[hsl(250,85%,65%)]",
    other: "bg-surface-elevated text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">Legislative Calendar</h2>
        {!isLoading && <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-xs text-muted-foreground">{events.length} events</span>}
      </div>

      {isLoading && <CardListSkeleton count={4} />}

      {error && <ErrorBox message={error instanceof Error ? error.message : "Failed to load"} />}

      {!isLoading && events.length === 0 && !error && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 font-body text-sm text-muted-foreground">No upcoming calendar events found for this representative's chamber.</p>
          <p className="mt-1 font-body text-xs text-muted-foreground/60">Data sourced from OpenStates.org.</p>
        </div>
      )}

      <div className="space-y-3">
        {events.slice(0, 20).map((event, idx) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`rounded px-1.5 py-0.5 font-body text-[10px] font-bold uppercase tracking-wider ${typeColors[event.type] || typeColors.other}`}>
                {event.type}
              </span>
              <span className="font-body text-[10px] text-muted-foreground">{event.chamber}</span>
            </div>
            <p className="font-display text-sm font-bold text-headline">{event.name}</p>
            {event.description && (
              <p className="mt-1 font-body text-xs text-secondary-custom line-clamp-2">{event.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 font-body text-[10px] text-muted-foreground">
              <span>Start: {new Date(event.startDate).toLocaleDateString()}</span>
              {event.location && <span>📍 {event.location}</span>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  Federal Register Tab                       */
/* ═══════════════════════════════════════════ */
function FederalRegisterTab({ politicianName }: { politicianName: string }) {
  const { data, isLoading, error } = useFederalRegister("all", politicianName);
  const documents = data?.documents || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Landmark className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">Federal Register</h2>
        {!isLoading && <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-xs text-muted-foreground">{data?.total ?? 0} documents</span>}
      </div>

      {isLoading && <CardListSkeleton />}

      {error && <ErrorBox message={error instanceof Error ? error.message : "Failed to load"} />}

      {!isLoading && documents.length === 0 && !error && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Landmark className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 font-body text-sm text-muted-foreground">No federal register documents found mentioning this representative.</p>
          <p className="mt-1 font-body text-xs text-muted-foreground/60">Data sourced from the Federal Register (federalregister.gov).</p>
        </div>
      )}

      <div className="space-y-3">
        {documents.slice(0, 20).map((doc, idx) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-surface-elevated cursor-pointer"
            onClick={() => window.open(doc.url, "_blank")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px]">{doc.type}</Badge>
                  <span className="font-body text-[10px] text-muted-foreground">{doc.publicationDate}</span>
                </div>
                <p className="font-display text-sm font-bold text-headline line-clamp-2">{doc.title}</p>
                {doc.abstract && (
                  <p className="mt-1 font-body text-xs text-secondary-custom line-clamp-2">{doc.abstract}</p>
                )}
                {doc.agencies?.length > 0 && (
                  <p className="mt-1 font-body text-[10px] text-muted-foreground">
                    Agencies: {doc.agencies.slice(0, 3).join(", ")}
                  </p>
                )}
              </div>
              <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  News Tab                                   */
/* ═══════════════════════════════════════════ */
function NewsTab({ politicianName }: { politicianName: string }) {
  const [articles, setArticles] = useState<{ id: string; title: string; url: string; source: string; date: string; summary: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("fetch-politician-news", {
          body: { politicianName },
        });
        if (cancelled) return;
        if (fnError) throw new Error(fnError.message);
        if (!data?.success) throw new Error(data?.error || "Failed to fetch news");
        setArticles(data.articles || []);
      } catch (e) {
        if (cancelled) return;
        console.error("News fetch error:", e);
        setError(e instanceof Error ? e.message : "Failed to fetch news");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [politicianName]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Newspaper className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">News Coverage</h2>
        {!isLoading && <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-xs text-muted-foreground">{articles.length} articles</span>}
      </div>

      {isLoading && <NewsSkeleton />}

      {error && <ErrorBox message={error} />}

      {!isLoading && articles.length === 0 && !error && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Newspaper className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 font-body text-sm text-muted-foreground">No recent news articles found mentioning this representative.</p>
          <p className="mt-1 font-body text-xs text-muted-foreground/60">News sourced from Google News RSS.</p>
        </div>
      )}

      <div className="space-y-3">
        {articles.slice(0, 20).map((article, idx) => (
          <motion.div
            key={article.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-surface-elevated cursor-pointer"
            onClick={() => article.url && window.open(article.url, "_blank")}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-body text-[10px] text-muted-foreground">{article.source}</span>
                <span className="font-body text-[10px] text-muted-foreground">{article.date}</span>
              </div>
              <p className="font-display text-sm font-bold text-headline line-clamp-2">{article.title}</p>
              {article.summary && (
                <p className="mt-1 font-body text-xs text-secondary-custom line-clamp-2">{article.summary}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <p className="font-body text-[10px] text-muted-foreground/60 italic">
        News sourced from Google News RSS. Results may vary.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  Midterms Tab                               */
/* ═══════════════════════════════════════════ */
function MidtermsTab({ politician }: { politician: RepProfile }) {
  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const prompt = `${politician.name} is a ${politician.party} serving as ${politician.title} in ${politician.jurisdiction || politician.region || "the United States"}.`;
        const { data, error: fnError } = await supabase.functions.invoke("analyze-article", {
          body: {
            url: `https://www.google.com/search?q=${encodeURIComponent(politician.name + " 2026 midterm election")}`,
            title: `${politician.name} — 2026 Midterm Election Outlook`,
            summary: prompt,
            category: "election",
          },
        });
        if (cancelled) return;
        if (fnError) throw new Error(fnError.message);
        if (!data?.success) throw new Error(data?.error || "Failed to generate analysis");
        setAnalysis(data.analysis);
      } catch (e) {
        if (cancelled) return;
        console.error("Midterms analysis error:", e);
        setError(e instanceof Error ? e.message : "Failed to load election context");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [politician.name, politician.party, politician.title, politician.jurisdiction, politician.region]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Flag className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">2026 Midterm Elections</h2>
      </div>

      {isLoading && <AnalysisSkeleton />}

      {error && <ErrorBox message={error} />}

      {!isLoading && !error && analysis && (
        <article className="prose-sm max-w-none">
          <ReactMarkdown
            skipHtml
            components={{
              h2: ({ children }) => <h2 className="mb-3 mt-8 font-display text-xl font-bold text-headline first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-2 mt-6 font-display text-lg font-semibold text-headline">{children}</h3>,
              p: ({ children }) => <p className="mb-4 font-body text-sm leading-relaxed text-secondary-custom">{children}</p>,
              ul: ({ children }) => <ul className="mb-4 ml-5 list-disc space-y-1.5 font-body text-sm text-secondary-custom">{children}</ul>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-headline">{children}</strong>,
            }}
          >
            {analysis}
          </ReactMarkdown>
        </article>
      )}

      <p className="font-body text-[10px] text-muted-foreground/60 italic">
        Election outlook generated by AI analysis. Verify details with official sources.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  Shared components                          */
/* ═══════════════════════════════════════════ */
function ContactLink({ href, icon, label, external }: { href: string; icon: React.ReactNode; label: string; external?: boolean }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-2 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
    >
      {icon}
      {label}
      {external && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
    </a>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const isRateLimit = /rate.?limit/i.test(message);
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-5 ${isRateLimit ? 'border-amber-500/20 bg-amber-500/5' : 'border-primary/20 bg-primary/5'}`}>
      <AlertCircle className={`mt-0.5 h-5 w-5 shrink-0 ${isRateLimit ? 'text-amber-500' : 'text-primary'}`} />
      <div className="flex-1">
        <p className="font-body text-sm font-medium text-foreground">
          {isRateLimit ? 'API limit reached' : 'Couldn\'t load data'}
        </p>
        <p className="mt-1 font-body text-xs text-muted-foreground">
          {isRateLimit ? 'The daily API request limit has been reached. Please try again tomorrow.' : message}
        </p>
        {onRetry && !isRateLimit && (
          <button
            onClick={onRetry}
            className="mt-2 rounded-md bg-primary/10 px-3 py-1 font-body text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════ */
/*  Stock Trades Section (STOCK Act)           */
/* ═══════════════════════════════════════════ */
function StockTradesSection({ politicianName, chamber }: { politicianName: string; chamber?: "house" | "senate" }) {
  // Handle both "First Last" and "Last, First" name formats from different data sources
  const searchName = (() => {
    const name = politicianName.trim();
    if (name.includes(',')) {
      // "Last, First [Middle]" format — use the last name before the comma
      return name.split(',')[0].trim();
    }
    // "First [Middle] Last" format — use the last word
    const parts = name.split(/\s+/);
    return parts[parts.length - 1];
  })();

  const { data, isLoading, error } = useCongressTrades({
    politician: searchName,
    chamber,
    limit: 200,
  });

  // Build monthly volume chart data
  const chartData = useMemo(() => {
    if (!data?.trades.length) return [];
    const buckets: Record<string, { month: string; purchases: number; sales: number }> = {};
    for (const t of data.trades) {
      if (!t.transactionDate) continue;
      const d = new Date(t.transactionDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!buckets[key]) buckets[key] = { month: key, purchases: 0, sales: 0 };
      if (t.type?.toLowerCase().includes("purchase")) buckets[key].purchases++;
      else if (t.type?.toLowerCase().includes("sale")) buckets[key].sales++;
      else buckets[key].purchases++; // default bucket
    }
    return Object.values(buckets).sort((a, b) => a.month.localeCompare(b.month));
  }, [data]);

  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-bold text-headline flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        Stock Trades (STOCK Act)
      </h2>
      <p className="mb-4 font-body text-xs text-muted-foreground">
        Financial disclosures filed under the STOCK Act. Trades by {politicianName} or their spouse.
      </p>

      {isLoading && <StockTradesSkeleton />}

      {error && <ErrorBox message={error instanceof Error ? error.message : "Failed to load trades"} />}

      {data && !isLoading && (
        <>
          {data.trades.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="font-body text-sm text-muted-foreground">
                No recent STOCK Act disclosures found for {politicianName}.
              </p>
              <p className="font-body text-xs text-muted-foreground">
                This does not necessarily mean no trades were made — only the most recent
                ~100 disclosures per chamber are displayed. Many members have no reportable trades.
              </p>
              <p className="font-body text-xs text-muted-foreground">
                <a href="/congress-trades" className="text-primary hover:underline">
                  Browse all recent disclosures →
                </a>
                {" · "}
                <a
                  href={`https://efdsearch.senate.gov/search/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Senate EFD Search ↗
                </a>
                {" · "}
                <a
                  href={`https://disclosures-clerk.house.gov/FinancialDisclosure`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  House Disclosures ↗
                </a>
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-3">
                <span className="rounded-lg bg-surface-elevated px-3 py-1.5 font-mono text-xs font-medium text-muted-foreground">
                  {data.total} total trades
                </span>
                <span className="rounded-lg bg-[hsl(142,71%,45%)]/10 px-3 py-1.5 font-mono text-xs font-medium text-[hsl(142,71%,45%)]">
                  {data.purchaseCount} purchases
                </span>
                <span className="rounded-lg bg-destructive/10 px-3 py-1.5 font-mono text-xs font-medium text-destructive">
                  {data.saleCount} sales
                </span>
              </div>

              {/* Mini volume chart */}
              {chartData.length > 1 && (
                <TradeVolumeChart data={chartData} />
              )}

              <div className="space-y-2">
                {data.trades.slice(0, 20).map((trade, i) => (
                  <StockTradeRow key={`${trade.ticker}-${trade.transactionDate}-${i}`} trade={trade} />
                ))}
              </div>

              {data.total > 20 && (
                <p className="mt-3 text-center font-body text-xs text-muted-foreground">
                  Showing 20 of {data.total} trades.{" "}
                  <a href="/congress-trades" className="text-primary hover:underline">View all →</a>
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function StockTradeRow({ trade }: { trade: CongressTrade }) {
  const isPurchase = trade.type?.toLowerCase().includes("purchase");
  const isSale = trade.type?.toLowerCase().includes("sale");

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-surface-hover">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
        isPurchase ? "bg-[hsl(142,71%,45%)]/10" : isSale ? "bg-destructive/10" : "bg-surface-elevated"
      }`}>
        {isPurchase ? (
          <TrendingUp className="h-4 w-4 text-[hsl(142,71%,45%)]" />
        ) : isSale ? (
          <span className="font-mono text-xs font-bold text-destructive">S</span>
        ) : (
          <span className="font-mono text-xs font-bold text-muted-foreground">?</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {trade.ticker && trade.ticker !== "--" && (
            <span className="font-mono text-sm font-bold text-primary">${trade.ticker}</span>
          )}
          <span className="truncate font-body text-xs text-muted-foreground">{trade.assetDescription}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <span className={`font-body text-[11px] font-medium ${
            isPurchase ? "text-[hsl(142,71%,45%)]" : isSale ? "text-destructive" : "text-muted-foreground"
          }`}>
            {trade.type}
          </span>
          <span className="font-body text-[11px] text-muted-foreground">{trade.amount}</span>
          {trade.transactionDate && (
            <span className="font-body text-[11px] text-muted-foreground">
              {new Date(trade.transactionDate).toLocaleDateString()}
            </span>
          )}
          {trade.owner && trade.owner !== "--" && (
            <span className="font-body text-[11px] text-muted-foreground">({trade.owner})</span>
          )}
        </div>
      </div>
    </div>
  );
}

function TradeVolumeChart({ data }: { data: { month: string; purchases: number; sales: number }[] }) {
  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4">
      <p className="mb-3 font-body text-xs font-medium text-muted-foreground">Trade Volume by Month</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barGap={1}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => {
              const [y, m] = v.split("-");
              return `${m}/${y.slice(2)}`;
            }}
          />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={24} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v: string) => {
              const [y, m] = v.split("-");
              return `${m}/${y}`;
            }}
          />
          <Bar dataKey="purchases" stackId="a" fill="hsl(142,71%,45%)" radius={[0, 0, 0, 0]} name="Purchases" />
          <Bar dataKey="sales" stackId="a" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} name="Sales" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PoliticianDetail;
