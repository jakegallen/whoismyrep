import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  ExternalLink,
  Loader2,
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
  Clock,
  User,
  Building2,
  ScrollText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import SiteNav from "@/components/SiteNav";
import VotingScorecard from "@/components/VotingScorecard";
import CampaignFinance from "@/components/CampaignFinance";
import AccountabilityTimeline from "@/components/AccountabilityTimeline";
import { useBills, type Bill } from "@/hooks/useBills";
import { useLobbying } from "@/hooks/useLobbying";
import { useCourtCases } from "@/hooks/useCourtCases";
import { useCommittees } from "@/hooks/useCommittees";
import { useCongress } from "@/hooks/useCongress";
import { Badge } from "@/components/ui/badge";
import type { Politician } from "@/lib/politicians";

const tabs = [
  { id: "overview", label: "Overview", icon: User },
  { id: "voting", label: "Voting Record", icon: BarChart3 },
  { id: "bills", label: "Bills", icon: FileText },
  { id: "committees", label: "Committees", icon: Building2 },
  { id: "finance", label: "Campaign Finance", icon: DollarSign },
  { id: "lobbying", label: "Lobbying", icon: Briefcase },
  { id: "court", label: "Court Cases", icon: Scale },
  { id: "timeline", label: "Timeline", icon: Clock },
] as const;

type TabId = (typeof tabs)[number]["id"];

const PoliticianDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const politician = location.state?.politician as Politician | undefined;
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!politician) {
      navigate("/politicians");
      return;
    }

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("analyze-article", {
          body: {
            url: politician.socialHandles?.x
              ? `https://x.com/${politician.socialHandles.x}`
              : `https://www.google.com/search?q=${encodeURIComponent(politician.name + " Nevada politics")}`,
            title: `${politician.name} — ${politician.title}`,
            summary: politician.bio,
            category: "politician",
          },
        });
        if (fnError) throw new Error(fnError.message);
        if (!data?.success) throw new Error(data?.error || "Failed to generate profile");
        setAnalysis(data.analysis);
      } catch (e) {
        console.error("Profile error:", e);
        setError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [politician, navigate]);

  if (!politician) return null;

  const partyColor =
    politician.party === "Democrat"
      ? "text-[hsl(210,80%,55%)]"
      : politician.party === "Republican"
        ? "text-primary"
        : "text-[hsl(43,90%,55%)]";

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <main className="container mx-auto max-w-4xl px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-2 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Profile header */}
          <div className="flex items-start gap-5">
            {politician.imageUrl ? (
              <img
                src={politician.imageUrl}
                alt={politician.name}
                className="h-20 w-20 shrink-0 rounded-full object-cover bg-surface-elevated"
                loading="lazy"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-surface-elevated font-display text-2xl font-bold text-muted-foreground">
                {politician.name.split(" ").map((n) => n[0]).join("")}
              </div>
            )}
            <div>
              <h1 className="font-display text-3xl font-bold text-headline">{politician.name}</h1>
              <p className={`font-body text-base font-semibold ${partyColor}`}>
                {politician.title} · {politician.party}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-tertiary" />
                <span className="font-body text-sm text-tertiary">{politician.region}</span>
              </div>
            </div>
          </div>

          {/* Contact links row */}
          <div className="mt-5 flex flex-wrap gap-2">
            {politician.website && (
              <ContactLink href={politician.website} icon={<Globe className="h-4 w-4 text-primary" />} label="Website" external />
            )}
            {politician.phone && (
              <ContactLink href={`tel:${politician.phone}`} icon={<Phone className="h-4 w-4 text-[hsl(142,71%,45%)]" />} label={politician.phone} />
            )}
            {politician.email && (
              <ContactLink href={`mailto:${politician.email}`} icon={<Mail className="h-4 w-4 text-[hsl(210,80%,55%)]" />} label="Email" />
            )}
            {politician.contactForm && (
              <ContactLink href={politician.contactForm} icon={<MessageSquare className="h-4 w-4 text-[hsl(280,60%,55%)]" />} label="Contact Form" external />
            )}
          </div>

          {/* Social links */}
          {politician.socialHandles && Object.keys(politician.socialHandles).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {politician.socialHandles.x && (
                <SocialLink href={`https://x.com/${politician.socialHandles.x}`} icon="𝕏" label={`@${politician.socialHandles.x}`} />
              )}
              {politician.socialHandles.facebook && (
                <SocialLink href={`https://facebook.com/${politician.socialHandles.facebook}`} icon="f" label="Facebook" color="hsl(210,80%,55%)" />
              )}
              {politician.socialHandles.instagram && (
                <SocialLink href={`https://instagram.com/${politician.socialHandles.instagram}`} icon="📷" label="Instagram" color="hsl(330,70%,55%)" />
              )}
              {politician.socialHandles.youtube && (
                <SocialLink href={`https://youtube.com/@${politician.socialHandles.youtube}`} icon="▶" label="YouTube" color="hsl(0,72%,51%)" />
              )}
            </div>
          )}

          {/* ═══════ TABS ═══════ */}
          <div className="mt-8 border-b border-border">
            <nav className="-mb-px flex gap-1 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 font-body text-sm font-medium transition-colors ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* ═══════ TAB CONTENT ═══════ */}
          <div className="mt-8">
            {activeTab === "overview" && (
              <OverviewTab politician={politician} analysis={analysis} isLoading={isLoading} error={error} />
            )}
            {activeTab === "voting" && (
              <VotingScorecard
                politicianId={politician.id}
                politicianName={politician.name}
                keyIssues={politician.keyIssues}
                party={politician.party}
                level={politician.level}
                chamber={politician.office.includes("Senate") ? "Senate" : politician.office.includes("Assembly") ? "Assembly" : undefined}
              />
            )}
            {activeTab === "bills" && <BillsTab politicianName={politician.name} />}
            {activeTab === "committees" && <CommitteesTab politicianName={politician.name} chamber={politician.office.includes("Senate") ? "Senate" : politician.office.includes("Assembly") ? "Assembly" : undefined} />}
            {activeTab === "finance" && (
              <CampaignFinance politicianId={politician.id} party={politician.party} level={politician.level} />
            )}
            {activeTab === "lobbying" && <LobbyingTab politicianName={politician.name} />}
            {activeTab === "court" && <CourtCasesTab politicianName={politician.name} />}
            {activeTab === "timeline" && (
              <AccountabilityTimeline
                politicianName={politician.name}
                chamber={politician.office.includes("Senate") ? "Senate" : politician.office.includes("Assembly") ? "Assembly" : undefined}
                twitterHandle={politician.socialHandles?.x}
              />
            )}
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
  analysis,
  isLoading,
  error,
}: {
  politician: Politician;
  analysis: string;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-8">
      {/* Bio */}
      <p className="font-body text-sm leading-relaxed text-secondary-custom">{politician.bio}</p>

      {/* Key issues */}
      <div className="flex flex-wrap gap-2">
        {politician.keyIssues.map((issue) => (
          <span key={issue} className="rounded-lg bg-surface-elevated px-3 py-1.5 font-body text-xs font-medium text-muted-foreground">
            {issue}
          </span>
        ))}
      </div>

      <div className="h-px bg-border" />

      {/* AI Analysis */}
      <h2 className="font-display text-xl font-bold text-headline">Recent Activity & Analysis</h2>

      {isLoading && (
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="font-body text-sm text-muted-foreground">Researching recent activity...</p>
        </div>
      )}

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
function BillsTab({ politicianName }: { politicianName: string }) {
  const { bills, isLoading, error } = useBills(politicianName);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">Bills & Legislation</h2>
        {!isLoading && <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-xs text-muted-foreground">{bills.length} found</span>}
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-body text-sm text-muted-foreground">Searching bills...</span>
        </div>
      )}

      {error && <ErrorBox message={error} />}

      {!isLoading && bills.length === 0 && !error && (
        <p className="py-8 text-center font-body text-sm text-muted-foreground">No bills found mentioning this representative.</p>
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
function CommitteesTab({ politicianName, chamber }: { politicianName: string; chamber?: string }) {
  const { data: committeesData, isLoading: commLoading, error: commError } = useCommittees(chamber, politicianName);
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

      {isLoading && (
        <div className="flex items-center gap-3 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-body text-sm text-muted-foreground">Loading committee data...</span>
        </div>
      )}

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
        <p className="py-6 text-center font-body text-sm text-muted-foreground">No committee assignments found for this representative.</p>
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
                key={`${report.citation}-${idx}`}
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

      {isLoading && (
        <div className="flex items-center gap-3 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-body text-sm text-muted-foreground">Searching lobbying filings...</span>
        </div>
      )}

      {error && <ErrorBox message={error instanceof Error ? error.message : "Failed to load"} />}

      {!isLoading && filings.length === 0 && !error && (
        <p className="py-8 text-center font-body text-sm text-muted-foreground">No lobbying filings found related to this representative.</p>
      )}

      <div className="space-y-3">
        {filings.slice(0, 20).map((filing: any, idx: number) => (
          <motion.div
            key={filing.id || idx}
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

      {isLoading && (
        <div className="flex items-center gap-3 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-body text-sm text-muted-foreground">Searching court records...</span>
        </div>
      )}

      {error && <ErrorBox message={error instanceof Error ? error.message : "Failed to load"} />}

      {!isLoading && cases.length === 0 && !error && (
        <p className="py-8 text-center font-body text-sm text-muted-foreground">No court cases found mentioning this representative.</p>
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

function SocialLink({ href, icon, label, color }: { href: string; icon: string; label: string; color?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-body text-xs font-medium text-secondary-custom transition-colors hover:bg-surface-elevated"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold" style={{ color: color || "hsl(var(--foreground))" }}>
        {icon}
      </span>
      {label}
      <ExternalLink className="h-3 w-3 text-muted-foreground" />
    </a>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <p className="font-body text-sm font-medium text-foreground">Couldn't load data</p>
        <p className="mt-1 font-body text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default PoliticianDetail;
