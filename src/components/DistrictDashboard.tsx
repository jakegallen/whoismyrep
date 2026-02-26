import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Vote,
  Newspaper,
  CalendarDays,
  MapPin,
  ExternalLink,
  Loader2,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { VoterInfo } from "@/hooks/useCivicReps";

interface DistrictBill {
  id: string;
  billNumber: string;
  title: string;
  status: string;
  chamber: string;
  latestActionDate?: string;
  url: string;
}

interface DistrictNewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  pubDate?: string;
}

interface Props {
  address: string;
  voterInfo: VoterInfo | null;
}

export default function DistrictDashboard({ address, voterInfo }: Props) {
  const navigate = useNavigate();
  const [bills, setBills] = useState<DistrictBill[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [news, setNews] = useState<DistrictNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  // Extract city/region from address for contextual searches
  const regionKeyword = extractRegion(address);

  useEffect(() => {
    let cancelled = false;

    async function fetchDistrictData() {
      // Fetch bills and news in parallel
      const [billsResult, newsResult] = await Promise.allSettled([
        supabase.functions.invoke("fetch-bills", {
          body: { search: "Nevada", per_page: 6 },
        }),
        supabase.functions.invoke("fetch-nevada-news", {
          body: { search: regionKeyword },
        }),
      ]);

      if (cancelled) return;

      if (billsResult.status === "fulfilled" && billsResult.value.data?.bills) {
        setBills(billsResult.value.data.bills.slice(0, 5));
      }
      setBillsLoading(false);

      if (newsResult.status === "fulfilled" && newsResult.value.data?.news) {
        setNews(newsResult.value.data.news.slice(0, 4));
      } else if (newsResult.status === "fulfilled" && newsResult.value.data?.articles) {
        setNews(newsResult.value.data.articles.slice(0, 4));
      }
      setNewsLoading(false);
    }

    fetchDistrictData();
    return () => { cancelled = true; };
  }, [address, regionKeyword]);

  const election = voterInfo?.election;
  const pollingLocations = voterInfo?.pollingLocations || [];
  const contests = voterInfo?.contests || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mx-auto mt-12 max-w-4xl"
    >
      <div className="mb-6 text-center">
        <h2 className="font-display text-2xl font-bold text-headline md:text-3xl">
          What's Happening in Your District
        </h2>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          Bills, elections, and news relevant to your area
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Bills */}
        <DashboardCard
          icon={FileText}
          title="Active Bills"
          subtitle="Recent legislation in Nevada"
          accentClass="text-[hsl(var(--electric))]"
          bgClass="bg-[hsl(var(--electric)/0.1)]"
        >
          {billsLoading ? (
            <LoadingState label="Loading bills…" />
          ) : bills.length === 0 ? (
            <EmptyState label="No bills found" />
          ) : (
            <div className="space-y-2">
              {bills.map((bill) => (
                <button
                  key={bill.id}
                  onClick={() => navigate(`/bills/${encodeURIComponent(bill.id)}`, { state: { bill } })}
                  className="group flex w-full items-start gap-2 rounded-lg border border-border bg-background p-2.5 text-left transition-colors hover:bg-surface-hover"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-xs font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      <span className="font-mono text-[10px] text-muted-foreground">{bill.billNumber}</span>{" "}
                      {bill.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded bg-surface-elevated px-1.5 py-0.5 font-body text-[10px] text-muted-foreground">
                        {bill.chamber}
                      </span>
                      {bill.latestActionDate && (
                        <span className="font-body text-[10px] text-muted-foreground">
                          {new Date(bill.latestActionDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
              <button
                onClick={() => navigate("/bills")}
                className="flex w-full items-center justify-center gap-1 rounded-lg py-2 font-body text-xs font-medium text-primary transition-colors hover:bg-surface-hover"
              >
                View all bills <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </DashboardCard>

        {/* Elections & Voting */}
        <DashboardCard
          icon={Vote}
          title="Elections & Voting"
          subtitle={election ? election.name : "Upcoming election info"}
          accentClass="text-[hsl(var(--neon))]"
          bgClass="bg-[hsl(var(--neon)/0.1)]"
        >
          {election ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[hsl(var(--neon))]" />
                  <div>
                    <p className="font-body text-xs font-medium text-foreground">{election.name}</p>
                    <p className="font-body text-[10px] text-muted-foreground">
                      Election Day: {new Date(election.electionDay).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>

              {pollingLocations.length > 0 && (
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="font-body text-[11px] font-medium text-foreground">Your Polling Location</p>
                  </div>
                  <p className="font-body text-xs text-muted-foreground">{pollingLocations[0].name}</p>
                  <p className="font-body text-[10px] text-muted-foreground">{pollingLocations[0].address}</p>
                  {pollingLocations[0].hours && (
                    <p className="mt-1 font-body text-[10px] text-muted-foreground/70">{pollingLocations[0].hours}</p>
                  )}
                </div>
              )}

              {contests.length > 0 && (
                <div>
                  <p className="mb-1.5 font-body text-[11px] font-medium text-foreground">
                    {contests.length} contest{contests.length !== 1 ? "s" : ""} on your ballot
                  </p>
                  <div className="space-y-1.5">
                    {contests.slice(0, 3).map((c, i) => (
                      <div key={i} className="rounded-lg border border-border bg-background px-3 py-2">
                        <p className="font-body text-xs font-medium text-foreground">
                          {c.office || c.referendumTitle || c.type}
                        </p>
                        {c.candidates.length > 0 && (
                          <p className="font-body text-[10px] text-muted-foreground">
                            {c.candidates.map((cd) => cd.name).join(" vs ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {voterInfo?.stateElectionInfoUrl && (
                <a
                  href={voterInfo.stateElectionInfoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-body text-xs text-primary hover:underline"
                >
                  State election info <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <p className="font-body text-xs text-muted-foreground">
                No upcoming elections found for your district
              </p>
              <a
                href="https://www.nvsos.gov/sos/elections/voters"
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-xs text-primary hover:underline"
              >
                Check NV Secretary of State
              </a>
            </div>
          )}
        </DashboardCard>

        {/* District News */}
        <DashboardCard
          icon={Newspaper}
          title="Local News"
          subtitle={`News related to ${regionKeyword}`}
          accentClass="text-[hsl(var(--gold))]"
          bgClass="bg-[hsl(var(--gold)/0.1)]"
          className="md:col-span-2"
        >
          {newsLoading ? (
            <LoadingState label="Loading news…" />
          ) : news.length === 0 ? (
            <EmptyState label="No local news found" />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {news.map((item) => (
                <a
                  key={item.id || item.url}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-surface-hover"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-xs font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="font-body text-[10px] text-muted-foreground">
                        {item.source}
                      </span>
                      {item.pubDate && (
                        <span className="font-body text-[10px] text-muted-foreground/60">
                          {new Date(item.pubDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
    </motion.div>
  );
}

/* ── Sub-components ── */

function DashboardCard({
  icon: Icon,
  title,
  subtitle,
  accentClass,
  bgClass,
  className = "",
  children,
}: {
  icon: typeof FileText;
  title: string;
  subtitle: string;
  accentClass: string;
  bgClass: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <div className="mb-4 flex items-center gap-2.5">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgClass}`}>
          <Icon className={`h-4 w-4 ${accentClass}`} />
        </div>
        <div>
          <h3 className="font-display text-sm font-bold text-headline">{title}</h3>
          <p className="font-body text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      <span className="font-body text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <span className="font-body text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function extractRegion(address: string): string {
  const a = address.toLowerCase();
  if (a.includes("reno")) return "Reno";
  if (a.includes("sparks")) return "Sparks";
  if (a.includes("carson city")) return "Carson City";
  if (a.includes("henderson")) return "Henderson";
  if (a.includes("north las vegas")) return "North Las Vegas";
  if (a.includes("las vegas")) return "Las Vegas";
  if (a.includes("elko")) return "Elko";
  if (a.includes("pahrump")) return "Pahrump";
  if (a.includes("mesquite")) return "Mesquite";
  return "Nevada";
}
