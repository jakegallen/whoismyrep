import { useState, useMemo } from "react";
import SiteNav from "@/components/SiteNav";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Search,
  X,
  Landmark,
  Building2,
  Loader2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBills, type Bill } from "@/hooks/useBills";
import BillPipeline, { categorizeBill, type PipelineStage } from "@/components/BillPipeline";
import { US_STATES } from "@/lib/usStates";

const chamberConfig = {
  Assembly: { icon: Building2, color: "bg-blue-500/20 text-blue-400" },
  Senate: { icon: Landmark, color: "bg-amber-500/20 text-amber-400" },
} as const;

const Bills = () => {
  const navigate = useNavigate();
  const [selectedState, setSelectedState] = useState("NV");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [chamberFilter, setChamberFilter] = useState<"all" | "Assembly" | "Senate">("all");
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("all");

  const jurisdiction = US_STATES.find((s) => s.abbr === selectedState)?.jurisdiction || "Nevada";
  const stateName = US_STATES.find((s) => s.abbr === selectedState)?.name || "Nevada";

  // Debounce search for edge function
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (value: string) => {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => setDebouncedSearch(value), 500);
    setDebounceTimer(timer);
  };

  const { bills, total, isLoading, error, refetch } = useBills(debouncedSearch || undefined, jurisdiction);

  const filtered = useMemo(() => {
    let result = bills;
    if (chamberFilter !== "all") {
      result = result.filter((b) => b.chamber === chamberFilter);
    }
    if (pipelineStage !== "all") {
      result = result.filter((b) => categorizeBill(b) === pipelineStage);
    }
    return result;
  }, [bills, chamberFilter, pipelineStage]);

  const assemblyCt = bills.filter((b) => b.chamber === "Assembly").length;
  const senateCt = bills.filter((b) => b.chamber === "Senate").length;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <header className="gradient-hero border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4">
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-1.5 font-body text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-headline">
                Bill Tracker
              </h1>
            </div>
            <p className="mt-2 max-w-xl font-body text-sm text-tertiary">
              Track {stateName} legislature bills in real-time via OpenStates. Click any bill for an AI-powered plain-English summary.
            </p>

            {/* State selector */}
            <div className="mt-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {US_STATES.map((s) => (
                    <SelectItem key={s.abbr} value={s.abbr}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Chamber filter tabs */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
          {(["all", "Assembly", "Senate"] as const).map((tab) => {
            const count =
              tab === "all" ? bills.length : tab === "Assembly" ? assemblyCt : senateCt;
            const Icon =
              tab === "all"
                ? FileText
                : tab === "Assembly"
                ? Building2
                : Landmark;
            return (
              <button
                key={tab}
                onClick={() => setChamberFilter(tab)}
                className={`relative flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 font-body text-sm font-medium transition-colors ${
                  chamberFilter === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab === "all" ? "All" : tab} ({count})
              </button>
            );
          })}

          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              disabled={isLoading}
              className="gap-1.5 text-muted-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by bill number, title, or sponsor…"
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Pipeline dashboard */}
        {!isLoading && bills.length > 0 && (
          <BillPipeline
            bills={chamberFilter === "all" ? bills : bills.filter((b) => b.chamber === chamberFilter)}
            activeStage={pipelineStage}
            onStageChange={setPipelineStage}
          />
        )}

        {/* Error state */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-body text-sm font-medium text-foreground">Failed to load bills</p>
              <p className="font-body text-xs text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={refetch}>
              Retry
            </Button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 font-body text-sm text-muted-foreground">
              Loading {stateName} legislation…
            </p>
          </div>
        )}

        {/* Bills list */}
        {!isLoading && !error && (
          <>
            <p className="mb-4 font-body text-xs text-muted-foreground">
              Showing {filtered.length} of {total} bills
            </p>
            <div className="grid gap-3">
              {filtered.map((bill) => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  onClick={() =>
                    navigate(`/bills/${bill.id}`, { state: { bill } })
                  }
                />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center py-16">
                <FileText className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 font-body text-sm text-muted-foreground">
                  No bills found matching your search.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

function BillRow({ bill, onClick }: { bill: Bill; onClick: () => void }) {
  const config = chamberConfig[bill.chamber];
  const Icon = config.icon;

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex w-full items-start gap-4 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-surface-hover"
    >
      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-bold text-headline">
            {bill.billNumber}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {bill.type}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {bill.status}
          </Badge>
        </div>
        <p className="mt-1 line-clamp-2 font-body text-sm text-secondary-custom">
          {bill.title}
        </p>
        {bill.sponsors.length > 0 && (
          <p className="mt-1 font-body text-xs text-muted-foreground">
            Sponsors: {bill.sponsors.join(", ")}
          </p>
        )}
      </div>
      <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.button>
  );
}

export default Bills;
