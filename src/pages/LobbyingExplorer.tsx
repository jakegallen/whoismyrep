import { useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase, ExternalLink, Search, Loader2, FileText, Users, Building2, DollarSign, ChevronDown, ChevronUp,
} from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import SiteNav from "@/components/SiteNav";
import { useLobbying, type LobbyingEndpoint, type LobbyingFiling } from "@/hooks/useLobbying";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const tabs: { value: LobbyingEndpoint; label: string; icon: React.ElementType }[] = [
  { value: "filings", label: "Lobbying Filings", icon: FileText },
  { value: "clients", label: "Clients", icon: Building2 },
  { value: "registrants", label: "Registrants", icon: Briefcase },
  { value: "lobbyists", label: "Lobbyists", icon: Users },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

function formatAmount(amount: number | null) {
  if (!amount) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

const LobbyingExplorer = () => {
  const [activeTab, setActiveTab] = useState<LobbyingEndpoint>("filings");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, error } = useLobbying(activeTab, {
    search: search || undefined,
    page,
    filing_year: selectedYear,
    client_name: activeTab === "filings" && search ? search : undefined,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleTabChange = (tab: LobbyingEndpoint) => {
    setActiveTab(tab);
    setPage(1);
    setSearch("");
    setSearchInput("");
  };

  const items = data?.items || [];

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="h-8 w-8 text-primary" />
            <h2 className="font-display text-3xl font-bold text-headline">Lobbying Explorer</h2>
          </div>
          <p className="font-body text-sm text-tertiary">
            Federal lobbying filings, registrants, and clients — sourced from the Senate Lobbying Disclosure Act database
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

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3 items-end">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={activeTab === "filings" ? "Search by client name..." : "Search..."}
              className="font-body text-sm"
            />
            <Button type="submit" size="sm" className="gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Search
            </Button>
          </form>

          {activeTab === "filings" && (
            <div className="flex gap-1.5">
              <button
                onClick={() => { setSelectedYear(undefined); setPage(1); }}
                className={`rounded-lg px-2.5 py-2 font-body text-xs font-medium transition-colors ${
                  !selectedYear ? "bg-primary text-primary-foreground" : "bg-surface-elevated text-foreground hover:bg-surface-hover"
                }`}
              >
                All Years
              </button>
              {years.map((yr) => (
                <button
                  key={yr}
                  onClick={() => { setSelectedYear(yr); setPage(1); }}
                  className={`rounded-lg px-2.5 py-2 font-body text-xs font-medium transition-colors ${
                    selectedYear === yr ? "bg-primary text-primary-foreground" : "bg-surface-elevated text-foreground hover:bg-surface-hover"
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 font-body text-sm text-destructive">
            Failed to load lobbying data. Please try again.
          </div>
        )}

        {/* Filings */}
        {activeTab === "filings" && !isLoading && (
          <div className="space-y-3">
            {items.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <p className="font-body text-muted-foreground">No filings found.</p>
              </div>
            )}
            {(items as LobbyingFiling[]).map((filing, i) => {
              const isExpanded = expandedId === filing.id;
              return (
                <motion.div
                  key={filing.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : filing.id)}
                    className="w-full text-left p-5 transition-colors hover:bg-accent"
                  >
                    <div className="flex flex-wrap items-start gap-2 mb-2">
                      <Badge className="bg-primary text-primary-foreground">{filing.filingType}</Badge>
                      {filing.amount && (
                        <Badge className="bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))]">
                          <DollarSign className="h-3 w-3 mr-0.5" />
                          {formatAmount(filing.amount)}
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        {filing.filingYear} {filing.filingPeriod}
                      </Badge>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-display text-base font-semibold text-headline leading-snug">
                          {filing.client || "Unknown Client"}
                        </h3>
                        <p className="font-body text-xs text-secondary-custom mt-0.5">
                          Registrant: {filing.registrant}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border bg-surface-elevated px-5 py-4 space-y-3">
                      {filing.clientDescription && (
                        <div>
                          <span className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Client</span>
                          <p className="font-body text-xs text-foreground mt-0.5">{filing.clientDescription}</p>
                        </div>
                      )}

                      {filing.issues.length > 0 && (
                        <div>
                          <span className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Issues</span>
                          <div className="mt-1 space-y-1.5">
                            {filing.issues.map((issue, j) => (
                              <div key={j}>
                                <Badge variant="outline" className="text-[10px] border-border text-muted-foreground mb-0.5">
                                  {issue.generalIssue}
                                </Badge>
                                {issue.description && (
                                  <p className="font-body text-xs text-foreground">{issue.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {filing.lobbyists.length > 0 && (
                        <div>
                          <span className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Lobbyists</span>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {filing.lobbyists.map((l, j) => (
                              <span key={j} className="font-body text-xs text-foreground">
                                {l.name}{l.coveredPosition ? ` (${l.coveredPosition})` : ""}{j < filing.lobbyists.length - 1 ? "," : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <a
                        href={filing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-card px-3 py-1.5 font-body text-xs font-medium text-foreground hover:bg-surface-hover transition-colors border border-border"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Filing
                      </a>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Clients */}
        {activeTab === "clients" && !isLoading && (
          <div className="space-y-3">
            {items.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <p className="font-body text-muted-foreground">No clients found.</p>
              </div>
            )}
            {items.map((client: any, i: number) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card p-5 shadow-card"
              >
                <h3 className="font-display text-base font-semibold text-headline">{client.name}</h3>
                {client.description && (
                  <p className="font-body text-xs text-secondary-custom mt-1 line-clamp-2">{client.description}</p>
                )}
                <div className="flex gap-3 mt-2 text-xs font-body text-tertiary">
                  {client.state && <span>{client.state}</span>}
                  {client.country && <span>{client.country}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Registrants */}
        {activeTab === "registrants" && !isLoading && (
          <div className="space-y-3">
            {items.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <p className="font-body text-muted-foreground">No registrants found.</p>
              </div>
            )}
            {items.map((reg: any, i: number) => (
              <motion.div
                key={reg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card p-5 shadow-card"
              >
                <h3 className="font-display text-base font-semibold text-headline">{reg.name}</h3>
                {reg.description && (
                  <p className="font-body text-xs text-secondary-custom mt-1 line-clamp-2">{reg.description}</p>
                )}
                <div className="flex gap-3 mt-2 text-xs font-body text-tertiary">
                  {reg.state && <span>{reg.state}</span>}
                  {reg.country && <span>{reg.country}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Lobbyists */}
        {activeTab === "lobbyists" && !isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.length === 0 && (
              <div className="col-span-full flex items-center justify-center py-20">
                <p className="font-body text-muted-foreground">No lobbyists found.</p>
              </div>
            )}
            {items.map((lob: any, i: number) => (
              <motion.div
                key={lob.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card p-4 shadow-card"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-display text-sm font-semibold text-headline">
                    {lob.prefix} {lob.name} {lob.suffix}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="font-body text-sm text-muted-foreground">
              Page {data.page} of {data.totalPages} ({data.total.toLocaleString()} results)
            </span>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default LobbyingExplorer;
