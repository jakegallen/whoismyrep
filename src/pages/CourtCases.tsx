import { useState } from "react";
import { motion } from "framer-motion";
import { Scale, ExternalLink, Search, Loader2, Gavel, FileText, Mic } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import SiteNav from "@/components/SiteNav";
import { useCourtCases, type CourtCaseType } from "@/hooks/useCourtCases";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const caseTypes: { value: CourtCaseType; label: string; icon: React.ElementType }[] = [
  { value: "opinions", label: "Opinions", icon: Gavel },
  { value: "dockets", label: "Dockets", icon: FileText },
  { value: "oral_arguments", label: "Oral Arguments", icon: Mic },
];

const caseTypeColors: Record<string, string> = {
  "Opinion": "bg-primary text-primary-foreground",
  "Docket": "bg-[hsl(var(--badge-law))] text-[hsl(var(--badge-law-foreground))]",
  "Oral Argument": "bg-[hsl(var(--badge-policy))] text-[hsl(var(--badge-policy-foreground))]",
};

const CourtCases = () => {
  const [activeType, setActiveType] = useState<CourtCaseType>("opinions");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useCourtCases(activeType, search || undefined, page);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleTypeChange = (type: CourtCaseType) => {
    setActiveType(type);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Scale className="h-8 w-8 text-primary" />
            <h2 className="font-display text-3xl font-bold text-headline">Court Cases</h2>
          </div>
          <p className="font-body text-sm text-tertiary">
            Federal and state court opinions, dockets, and oral arguments from Nevada courts
          </p>
        </motion.div>

        {/* Type filters */}
        <div className="mb-6 flex flex-wrap gap-3 items-center">
          {caseTypes.map((ct) => {
            const Icon = ct.icon;
            const isActive = activeType === ct.value;
            return (
              <button
                key={ct.value}
                onClick={() => handleTypeChange(ct.value)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-body text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-elevated text-foreground hover:bg-surface-hover"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {ct.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6 flex gap-2 max-w-lg">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search Nevada court cases..."
            className="font-body text-sm"
          />
          <Button type="submit" size="sm" className="gap-1.5">
            <Search className="h-3.5 w-3.5" />
            Search
          </Button>
        </form>

        {/* Results */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 font-body text-sm text-destructive">
            Failed to load court cases. Please try again.
          </div>
        )}

        {data?.cases && (
          <div className="space-y-4">
            {data.cases.length === 0 && !isLoading && (
              <div className="flex items-center justify-center py-20">
                <p className="font-body text-muted-foreground">No court cases found.</p>
              </div>
            )}

            {data.cases.map((c, i) => (
              <motion.div
                key={`${c.id}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card p-5 shadow-card transition-colors hover:bg-accent"
              >
                <div className="flex flex-wrap items-start gap-2 mb-2">
                  <Badge className={caseTypeColors[c.caseType] || "bg-muted text-muted-foreground"}>
                    {c.caseType}
                  </Badge>
                  {c.court && (
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      {c.court}
                    </Badge>
                  )}
                  {c.docketNumber && (
                    <span className="font-body text-xs text-tertiary">#{c.docketNumber}</span>
                  )}
                </div>

                <h3 className="font-display text-lg font-semibold text-headline mb-1 leading-snug">
                  {c.caseName || "Untitled Case"}
                </h3>

                {c.snippet && (
                  <p
                    className="font-body text-sm text-secondary-custom mb-3 line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: c.snippet }}
                  />
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs font-body text-tertiary">
                  {c.dateFiled && <span>Filed: {c.dateFiled}</span>}
                  {c.dateArgued && <span>Argued: {c.dateArgued}</span>}
                  {c.judge && <span>Judge: {c.judge}</span>}
                  {c.status && <span>Status: {c.status}</span>}
                  {c.citation && <span>{c.citation}</span>}
                </div>

                {c.url && (
                  <div className="mt-3">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 w-fit rounded-md bg-surface-elevated px-3 py-1.5 font-body text-xs font-medium text-foreground hover:bg-surface-hover transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View on CourtListener
                    </a>
                  </div>
                )}
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
              Page {data.page} of {data.totalPages}
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

export default CourtCases;
