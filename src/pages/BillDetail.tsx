import { useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  Loader2,
  Landmark,
  Building2,
  AlertCircle,
  Sparkles,
  Vote,
  ScrollText,
  FileCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useBillDetail,
  useBillOpenStatesDetail,
  type Bill,
  type RollCallVote,
  type BillAction,
} from "@/hooks/useBills";
import ReactMarkdown from "react-markdown";

const BillDetail = () => {
  const { id, "*": rest } = useParams();
  const fullId = rest ? `${id}/${rest}` : id;
  const location = useLocation();
  const navigate = useNavigate();
  const bill = (location.state as { bill?: Bill })?.bill || null;
  const { summary, sponsors, status, isLoading, error } = useBillDetail(bill);
  const { data: detail, isLoading: detailLoading, error: detailError } = useBillOpenStatesDetail(bill);

  if (!bill) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <FileText className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 font-body text-muted-foreground">
          Bill not found. Go back and select a bill.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/bills")}>
          Back to Bills
        </Button>
      </div>
    );
  }

  const ChamberIcon = bill.chamber === "Senate" ? Landmark : Building2;

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-hero border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-4">
              <button
                onClick={() => navigate("/bills")}
                className="flex items-center gap-1.5 font-body text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Bills
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <ChamberIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-headline md:text-3xl">
                  {bill.billNumber}
                </h1>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{bill.chamber}</Badge>
                  <Badge variant="outline" className="text-xs">{bill.type}</Badge>
                  <Badge variant="secondary" className="text-xs">{status || bill.status}</Badge>
                </div>
              </div>
            </div>
            <p className="mt-3 max-w-2xl font-body text-sm text-secondary-custom">{bill.title}</p>
            <div className="mt-3">
              <a
                href={bill.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-body text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View on OpenStates
              </a>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content area */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="summary" className="space-y-6">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="summary" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Summary
                </TabsTrigger>
                <TabsTrigger value="votes" className="gap-1.5">
                  <Vote className="h-3.5 w-3.5" /> Roll Calls
                  {detail && detail.rollCalls.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[10px]">{detail.rollCalls.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="amendments" className="gap-1.5">
                  <ScrollText className="h-3.5 w-3.5" /> Actions
                  {detail && detail.actions.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[10px]">{detail.actions.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="text" className="gap-1.5">
                  <FileCheck className="h-3.5 w-3.5" /> Bill Text
                </TabsTrigger>
              </TabsList>

              {/* AI Summary Tab */}
              <TabsContent value="summary">
                <div className="rounded-lg border border-border bg-card p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-lg font-bold text-headline">AI Analysis</h2>
                  </div>
                  {isLoading && (
                    <div className="flex flex-col items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="mt-3 font-body text-sm text-muted-foreground">Analyzing bill content with AI…</p>
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                      <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                      <div>
                        <p className="font-body text-sm font-medium text-foreground">Analysis failed</p>
                        <p className="font-body text-xs text-muted-foreground">{error}</p>
                      </div>
                    </div>
                  )}
                  {summary && !isLoading && (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-display prose-headings:text-headline prose-p:text-secondary-custom prose-p:font-body prose-li:text-secondary-custom prose-li:font-body">
                      <ReactMarkdown>{summary}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Roll Calls Tab */}
              <TabsContent value="votes">
                <RollCallsSection rollCalls={detail?.rollCalls || []} isLoading={detailLoading} error={detailError} />
              </TabsContent>

              {/* Actions & Amendments Tab */}
              <TabsContent value="amendments">
                <ActionsSection
                  actions={detail?.actions || []}
                  amendments={detail?.amendments || []}
                  isLoading={detailLoading}
                  error={detailError}
                />
              </TabsContent>

              {/* Bill Text Tab */}
              <TabsContent value="text">
                <BillTextSection
                  versions={detail?.versions || []}
                  documents={detail?.documents || []}
                  isLoading={detailLoading}
                  error={detailError}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="mb-3 font-display text-sm font-bold text-headline">Bill Information</h3>
              <dl className="space-y-2.5 font-body text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Bill Number</dt>
                  <dd className="font-medium text-foreground">{bill.billNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Chamber</dt>
                  <dd className="text-foreground">{bill.chamber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Type</dt>
                  <dd className="text-foreground">{bill.type}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Session</dt>
                  <dd className="text-foreground">{bill.session || "Current Session"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd className="text-foreground">{status || bill.status}</dd>
                </div>
                {detail?.subject && detail.subject.length > 0 && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Subjects</dt>
                    <dd className="mt-1 flex flex-wrap gap-1">
                      {detail.subject.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Sponsors - enhanced with primary/cosponsor distinction */}
            <SponsorsSection
              detailSponsors={detail?.sponsors || []}
              fallbackSponsors={sponsors.length > 0 ? sponsors : bill.sponsors}
              isLoading={detailLoading}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

// --- Roll Calls Section ---
function RollCallsSection({ rollCalls, isLoading, error }: { rollCalls: RollCallVote[]; isLoading: boolean; error: string | null }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-12 justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="font-body text-sm text-muted-foreground">Loading roll call votes from OpenStates…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
        <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
        <p className="font-body text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (rollCalls.length === 0) {
    return (
      <div className="flex flex-col items-center py-12">
        <Vote className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 font-body text-sm text-muted-foreground">No roll call votes recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-body text-xs text-muted-foreground">{rollCalls.length} roll call vote{rollCalls.length !== 1 ? "s" : ""} recorded</p>
      {rollCalls.map((rc, idx) => {
        const expanded = expandedId === rc.id;
        return (
          <motion.div
            key={rc.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-lg border border-border bg-card overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(expanded ? null : rc.id)}
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-surface-hover transition-colors"
            >
              {rc.result === "Passed" ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[hsl(142,71%,45%)]" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-[hsl(0,72%,51%)]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-sm font-bold text-headline">{rc.motion}</span>
                  <Badge variant={rc.result === "Passed" ? "default" : "destructive"} className="text-[10px]">
                    {rc.result}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{rc.chamber}</Badge>
                </div>
                <div className="mt-1 flex items-center gap-3 font-body text-xs text-muted-foreground">
                  <span>{rc.date}</span>
                  <span className="text-[hsl(142,71%,45%)]">{rc.yesCount} Yes</span>
                  <span className="text-[hsl(0,72%,51%)]">{rc.noCount} No</span>
                  {rc.otherCount > 0 && <span>{rc.otherCount} Other</span>}
                </div>
              </div>
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {expanded && (
              <div className="border-t border-border p-4 space-y-4">
                {/* Vote breakdown bar */}
                <div className="flex h-3 overflow-hidden rounded-full">
                  <div className="bg-[hsl(142,71%,45%)]" style={{ width: `${(rc.yesCount / (rc.yesCount + rc.noCount + rc.otherCount || 1)) * 100}%` }} />
                  <div className="bg-[hsl(0,72%,51%)]" style={{ width: `${(rc.noCount / (rc.yesCount + rc.noCount + rc.otherCount || 1)) * 100}%` }} />
                  <div className="bg-muted" style={{ width: `${(rc.otherCount / (rc.yesCount + rc.noCount + rc.otherCount || 1)) * 100}%` }} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {rc.yesVoters.length > 0 && (
                    <VoterList label="Yes" voters={rc.yesVoters} color="hsl(142,71%,45%)" />
                  )}
                  {rc.noVoters.length > 0 && (
                    <VoterList label="No" voters={rc.noVoters} color="hsl(0,72%,51%)" />
                  )}
                </div>
                {rc.otherVoters.length > 0 && (
                  <VoterList label="Other" voters={rc.otherVoters} color="hsl(var(--muted-foreground))" />
                )}
              </div>
            )}
          </motion.div>
        );
      })}
      <p className="font-body text-[10px] text-muted-foreground/60 italic">
        Roll call data sourced from OpenStates.org
      </p>
    </div>
  );
}

function VoterList({ label, voters, color }: { label: string; voters: string[]; color: string }) {
  return (
    <div>
      <p className="mb-1.5 font-display text-xs font-bold" style={{ color }}>
        {label} ({voters.length})
      </p>
      <div className="flex flex-wrap gap-1">
        {voters.map((v, i) => (
          <span key={i} className="rounded-md border border-border bg-background px-2 py-0.5 font-body text-[10px] text-foreground">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Actions & Amendments Section ---
function ActionsSection({ actions, amendments, isLoading, error }: {
  actions: BillAction[];
  amendments: BillAction[];
  isLoading: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-12 justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="font-body text-sm text-muted-foreground">Loading legislative actions…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
        <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
        <p className="font-body text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="flex flex-col items-center py-12">
        <ScrollText className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 font-body text-sm text-muted-foreground">No actions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {amendments.length > 0 && (
        <div className="rounded-lg border border-accent bg-accent/10 p-4">
          <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-headline">
            <ScrollText className="h-4 w-4 text-primary" />
            Amendments ({amendments.length})
          </h3>
          <div className="space-y-2">
            {amendments.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 font-body text-[10px] text-muted-foreground">{a.date}</span>
                <p className="font-body text-xs text-foreground">{a.description}</p>
                <Badge variant="outline" className="shrink-0 text-[9px]">{a.chamber}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 font-display text-sm font-bold text-headline">
          Full Legislative Timeline ({actions.length} actions)
        </h3>
        <div className="relative space-y-0">
          {actions.map((a, idx) => {
            const isAmendment = a.classification.some((c) => c.includes("amendment")) || a.description.toLowerCase().includes("amend");
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                className="relative flex gap-3 pb-4 last:pb-0"
              >
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${isAmendment ? "bg-primary" : "bg-muted-foreground/40"}`} />
                  {idx < actions.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className="min-w-0 flex-1 -mt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body text-[10px] text-muted-foreground">{a.date}</span>
                    <Badge variant="outline" className="text-[9px]">{a.chamber}</Badge>
                    {isAmendment && <Badge className="text-[9px] bg-primary/20 text-primary">Amendment</Badge>}
                  </div>
                  <p className="mt-0.5 font-body text-xs text-foreground">{a.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      <p className="font-body text-[10px] text-muted-foreground/60 italic">
        Action data sourced from OpenStates.org
      </p>
    </div>
  );
}

// --- Bill Text Section ---
function BillTextSection({ versions, documents, isLoading, error }: {
  versions: { note: string; date: string; links: { url: string; mediaType: string }[] }[];
  documents: { note: string; date: string; links: { url: string; mediaType: string }[] }[];
  isLoading: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-12 justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="font-body text-sm text-muted-foreground">Loading bill text versions…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
        <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
        <p className="font-body text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const hasContent = versions.length > 0 || documents.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center py-12">
        <FileCheck className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 font-body text-sm text-muted-foreground">No bill text versions available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {versions.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold text-headline">
            <FileText className="h-4 w-4 text-primary" />
            Bill Text Versions ({versions.length})
          </h3>
          <div className="space-y-3">
            {versions.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-display text-sm font-medium text-headline">{v.note}</p>
                  {v.date && <p className="font-body text-[10px] text-muted-foreground">{v.date}</p>}
                </div>
                <div className="flex gap-2">
                  {v.links.map((l, li) => (
                    <a
                      key={li}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 font-body text-xs text-primary transition-colors hover:bg-surface-hover"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {l.mediaType.includes("pdf") ? "PDF" : "View"}
                    </a>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {documents.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold text-headline">
            <FileCheck className="h-4 w-4 text-primary" />
            Supporting Documents ({documents.length})
          </h3>
          <div className="space-y-3">
            {documents.map((d, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="font-display text-sm font-medium text-headline">{d.note}</p>
                  {d.date && <p className="font-body text-[10px] text-muted-foreground">{d.date}</p>}
                </div>
                <div className="flex gap-2">
                  {d.links.map((l, li) => (
                    <a
                      key={li}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 font-body text-xs text-primary transition-colors hover:bg-surface-hover"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {l.mediaType.includes("pdf") ? "PDF" : "View"}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="font-body text-[10px] text-muted-foreground/60 italic">
        Documents sourced from OpenStates.org
      </p>
    </div>
  );
}

// --- Sponsors Section ---
function SponsorsSection({ detailSponsors, fallbackSponsors, isLoading }: {
  detailSponsors: { name: string; classification: string; primary: boolean }[];
  fallbackSponsors: string[];
  isLoading: boolean;
}) {
  const hasDetail = detailSponsors.length > 0;
  const primarySponsors = detailSponsors.filter((s) => s.primary);
  const cosponsors = detailSponsors.filter((s) => !s.primary);

  if (!hasDetail && fallbackSponsors.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-headline">
        <Users className="h-4 w-4 text-primary" />
        Sponsors
      </h3>
      {hasDetail ? (
        <div className="space-y-3">
          {primarySponsors.length > 0 && (
            <div>
              <p className="mb-1 font-body text-[10px] uppercase tracking-wider text-muted-foreground">Primary</p>
              {primarySponsors.map((s, i) => (
                <p key={i} className="font-body text-sm font-medium text-foreground">{s.name}</p>
              ))}
            </div>
          )}
          {cosponsors.length > 0 && (
            <div>
              <p className="mb-1 font-body text-[10px] uppercase tracking-wider text-muted-foreground">Cosponsors</p>
              <ul className="space-y-0.5">
                {cosponsors.map((s, i) => (
                  <li key={i} className="font-body text-sm text-secondary-custom">{s.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {fallbackSponsors.map((s, i) => (
            <li key={i} className="font-body text-sm text-secondary-custom">{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default BillDetail;
