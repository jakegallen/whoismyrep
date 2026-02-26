import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, ExternalLink, Download, Search, Loader2, Landmark, Scale, ScrollText, Bell } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import { useFederalRegister, type FederalDocType } from "@/hooks/useFederalRegister";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const docTypes: { value: FederalDocType; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: FileText },
  { value: "executive_orders", label: "Executive Orders", icon: Landmark },
  { value: "rules", label: "Final Rules", icon: Scale },
  { value: "proposed_rules", label: "Proposed Rules", icon: ScrollText },
  { value: "notices", label: "Notices", icon: Bell },
];

const typeColors: Record<string, string> = {
  "Executive Order": "bg-primary text-primary-foreground",
  "Final Rule": "bg-[hsl(var(--badge-law))] text-[hsl(var(--badge-law-foreground))]",
  "Proposed Rule": "bg-[hsl(var(--badge-policy))] text-[hsl(var(--badge-policy-foreground))]",
  "Notice": "bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))]",
};

const FederalRegister = () => {
  const [activeType, setActiveType] = useState<FederalDocType>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useFederalRegister(activeType, search || undefined, page);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleTypeChange = (type: FederalDocType) => {
    setActiveType(type);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h2 className="font-display text-3xl font-bold text-headline mb-2">Federal Register</h2>
          <p className="font-body text-sm text-tertiary">
            Executive orders, regulations, and federal notices affecting Nevada
          </p>
        </motion.div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3 items-center">
          {docTypes.map((dt) => {
            const Icon = dt.icon;
            const isActive = activeType === dt.value;
            return (
              <button
                key={dt.value}
                onClick={() => handleTypeChange(dt.value)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-body text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-elevated text-foreground hover:bg-surface-hover"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {dt.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6 flex gap-2 max-w-lg">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search Nevada regulations..."
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
            Failed to load documents. Please try again.
          </div>
        )}

        {data?.documents && (
          <div className="space-y-4">
            {data.documents.length === 0 && !isLoading && (
              <div className="flex items-center justify-center py-20">
                <p className="font-body text-muted-foreground">No documents found.</p>
              </div>
            )}

            {data.documents.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card p-5 shadow-card transition-colors hover:bg-accent"
              >
                <div className="flex flex-wrap items-start gap-2 mb-2">
                  <Badge className={typeColors[doc.type] || "bg-muted text-muted-foreground"}>
                    {doc.type}
                  </Badge>
                  {doc.significantDocument && (
                    <Badge variant="outline" className="border-[hsl(var(--gold))] text-[hsl(var(--gold))]">
                      Significant
                    </Badge>
                  )}
                  {doc.citation && (
                    <span className="font-body text-xs text-tertiary">{doc.citation}</span>
                  )}
                </div>

                <h3 className="font-display text-lg font-semibold text-headline mb-1 leading-snug">
                  {doc.title}
                </h3>

                {doc.abstract && (
                  <p className="font-body text-sm text-secondary-custom mb-3 line-clamp-3">
                    {doc.abstract}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs font-body text-tertiary">
                  {doc.publicationDate && <span>Published: {doc.publicationDate}</span>}
                  {doc.agencies.length > 0 && (
                    <span className="truncate max-w-xs">{doc.agencies.join(", ")}</span>
                  )}
                  {doc.president && <span>President: {doc.president}</span>}
                </div>

                <div className="mt-3 flex gap-2">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-md bg-surface-elevated px-3 py-1.5 font-body text-xs font-medium text-foreground hover:bg-surface-hover transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Read
                  </a>
                  {doc.pdfUrl && (
                    <a
                      href={doc.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-md bg-surface-elevated px-3 py-1.5 font-body text-xs font-medium text-foreground hover:bg-surface-hover transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="font-body text-sm text-muted-foreground">
              Page {data.page} of {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default FederalRegister;
