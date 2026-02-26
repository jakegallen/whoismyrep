import { useState } from "react";
import { motion } from "framer-motion";
import { Building, ExternalLink, Search, Loader2, FileText, Users, ScrollText, Award } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import { useCongress, type CongressEndpoint } from "@/hooks/useCongress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const tabs: { value: CongressEndpoint; label: string; icon: React.ElementType }[] = [
  { value: "bills", label: "Federal Bills", icon: FileText },
  { value: "members", label: "NV Delegation", icon: Users },
  { value: "committee_reports", label: "Committee Reports", icon: ScrollText },
  { value: "nominations", label: "Nominations", icon: Award },
];

const chamberColors: Record<string, string> = {
  House: "bg-[hsl(var(--badge-law))] text-[hsl(var(--badge-law-foreground))]",
  Senate: "bg-[hsl(var(--badge-policy))] text-[hsl(var(--badge-policy-foreground))]",
};

const CongressExplorer = () => {
  const [activeTab, setActiveTab] = useState<CongressEndpoint>("bills");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useCongress(activeTab, {
    congress: 119,
    limit: 20,
    offset: page * 20,
  });

  const handleTabChange = (tab: CongressEndpoint) => {
    setActiveTab(tab);
    setPage(0);
  };

  const items = data?.items || [];
  const hasMore = data?.pagination?.next;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building className="h-8 w-8 text-primary" />
            <h2 className="font-display text-3xl font-bold text-headline">Congress Explorer</h2>
          </div>
          <p className="font-body text-sm text-tertiary">
            Federal bills, Nevada's congressional delegation, committee reports, and nominations — powered by Congress.gov
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-body text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-elevated text-foreground hover:bg-surface-hover"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 font-body text-sm text-destructive">
            Failed to load data. Please try again.
          </div>
        )}

        {/* Bills */}
        {activeTab === "bills" && !isLoading && (
          <div className="space-y-4">
            {items.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <p className="font-body text-muted-foreground">No bills found.</p>
              </div>
            )}
            {items.map((bill: any, i: number) => (
              <motion.div
                key={`${bill.type}${bill.number}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card p-5 shadow-card transition-colors hover:bg-accent"
              >
                <div className="flex flex-wrap items-start gap-2 mb-2">
                  <Badge className={chamberColors[bill.originChamber] || "bg-muted text-muted-foreground"}>
                    {bill.originChamber || "Congress"}
                  </Badge>
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {bill.type} {bill.number}
                  </Badge>
                </div>
                <h3 className="font-display text-lg font-semibold text-headline mb-1 leading-snug line-clamp-2">
                  {bill.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs font-body text-tertiary">
                  {bill.introducedDate && <span>Introduced: {bill.introducedDate}</span>}
                  {bill.latestAction?.text && (
                    <span className="truncate max-w-md">Latest: {bill.latestAction.text}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Members */}
        {activeTab === "members" && !isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.length === 0 && (
              <div className="col-span-full flex items-center justify-center py-20">
                <p className="font-body text-muted-foreground">No members found.</p>
              </div>
            )}
            {items.map((member: any, i: number) => (
              <motion.div
                key={member.bioguideId || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5 shadow-card flex gap-4 items-start"
              >
                {member.depiction?.imageUrl && (
                  <img
                    src={member.depiction.imageUrl}
                    alt={member.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-base font-semibold text-headline">{member.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge className={member.party === "Republican" ? "bg-primary text-primary-foreground" : "bg-[hsl(var(--badge-law))] text-[hsl(var(--badge-law-foreground))]"}>
                      {member.party}
                    </Badge>
                    {member.district && (
                      <span className="font-body text-xs text-tertiary">District {member.district}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Committee Reports */}
        {activeTab === "committee_reports" && !isLoading && (
          <div className="space-y-4">
            {items.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <p className="font-body text-muted-foreground">No reports found.</p>
              </div>
            )}
            {items.map((report: any, i: number) => (
              <motion.div
                key={`${report.citation}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card p-5 shadow-card transition-colors hover:bg-accent"
              >
                <div className="flex flex-wrap items-start gap-2 mb-2">
                  <Badge className={chamberColors[report.chamber] || "bg-muted text-muted-foreground"}>
                    {report.chamber || "Congress"}
                  </Badge>
                  {report.citation && (
                    <span className="font-body text-xs text-tertiary">{report.citation}</span>
                  )}
                </div>
                <h3 className="font-display text-lg font-semibold text-headline mb-1 leading-snug line-clamp-2">
                  {report.title || `Report ${report.number}`}
                </h3>
                {report.updateDate && (
                  <span className="font-body text-xs text-tertiary">Updated: {report.updateDate}</span>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Nominations */}
        {activeTab === "nominations" && !isLoading && (
          <div className="space-y-4">
            {items.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <p className="font-body text-muted-foreground">No nominations found.</p>
              </div>
            )}
            {items.map((nom: any, i: number) => (
              <motion.div
                key={`${nom.number}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card p-5 shadow-card transition-colors hover:bg-accent"
              >
                <Badge variant="outline" className="mb-2 border-[hsl(var(--gold))] text-[hsl(var(--gold))]">
                  PN{nom.number}
                </Badge>
                <h3 className="font-display text-lg font-semibold text-headline mb-1 leading-snug line-clamp-2">
                  {nom.description || `Nomination ${nom.number}`}
                </h3>
                <div className="flex flex-wrap gap-3 text-xs font-body text-tertiary">
                  {nom.receivedDate && <span>Received: {nom.receivedDate}</span>}
                  {nom.latestAction?.text && (
                    <span className="truncate max-w-md">Latest: {nom.latestAction.text}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="font-body text-sm text-muted-foreground">Page {page + 1}</span>
          <Button variant="outline" size="sm" disabled={!hasMore && items.length < 20} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CongressExplorer;
