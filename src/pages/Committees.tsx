import { useState } from "react";
import SiteNav from "@/components/SiteNav";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, FileText, Calendar, Users, Loader2, AlertCircle, ChevronDown, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import DashboardHeader from "@/components/DashboardHeader";
import { useCommittees } from "@/hooks/useCommittees";
import type { Committee, CommitteeBill } from "@/hooks/useCommittees";
import { Skeleton } from "@/components/ui/skeleton";

type ChamberFilter = "All" | "Senate" | "Assembly" | "Joint";

const Committees = () => {
  const navigate = useNavigate();
  const [chamberFilter, setChamberFilter] = useState<ChamberFilter>("All");
  const chamberParam = chamberFilter === "All" ? undefined : chamberFilter;
  const { data, isLoading, error } = useCommittees(chamberParam);

  const chambers: ChamberFilter[] = ["All", "Senate", "Assembly", "Joint"];

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <main className="container mx-auto max-w-5xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
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
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-7 w-7 text-primary" />
            <h1 className="font-display text-3xl font-bold text-headline">
              Committee Tracker
            </h1>
          </div>
          <p className="font-body text-sm text-tertiary mb-6">
            Track Nevada legislative committees, their members, and bills under consideration.
            {data?.session && (
              <span className="ml-1 text-muted-foreground">Session: {data.session}</span>
            )}
          </p>

          {/* Chamber filter */}
          <div className="flex gap-2 mb-8">
            {chambers.map((c) => (
              <button
                key={c}
                onClick={() => setChamberFilter(c)}
                className={`rounded-lg px-4 py-2 font-body text-sm font-medium transition-colors ${
                  chamberFilter === c
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-elevated text-foreground hover:bg-surface-hover"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {isLoading && <CommitteesSkeleton />}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-body text-sm font-medium text-foreground">
                  Couldn't load committee data
                </p>
                <p className="mt-1 font-body text-xs text-muted-foreground">
                  {error instanceof Error ? error.message : "Unknown error"}
                </p>
              </div>
            </div>
          )}

          {data && !isLoading && (
            <div className="space-y-10">
              {/* Committees list */}
              <section>
                <h2 className="font-display text-xl font-bold text-headline mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  Committees ({data.committees.length})
                </h2>

                {data.committees.length === 0 ? (
                  <p className="font-body text-sm text-muted-foreground py-8 text-center">
                    No committees found for this filter.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.committees.map((committee) => (
                      <CommitteeCard key={committee.id} committee={committee} />
                    ))}
                  </div>
                )}
              </section>

              {/* Recent bills with committee activity */}
              <section>
                <h2 className="font-display text-xl font-bold text-headline mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  Recent Bills in Committee ({data.recentBills.length})
                </h2>

                {data.recentBills.length === 0 ? (
                  <p className="font-body text-sm text-muted-foreground py-8 text-center">
                    No recent committee activity found.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.recentBills.map((bill) => (
                      <BillRow key={bill.id} bill={bill} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

function CommitteeCard({ committee }: { committee: Committee }) {
  const [expanded, setExpanded] = useState(false);
  const chamberColor =
    committee.chamber === "Senate"
      ? "text-[hsl(210,80%,55%)]"
      : committee.chamber === "Assembly"
        ? "text-[hsl(142,71%,45%)]"
        : "text-[hsl(43,90%,55%)]";

  return (
    <div
      className="rounded-xl border border-border bg-card transition-colors hover:bg-surface-elevated cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-headline leading-snug">
              {committee.name}
            </h3>
            <div className="mt-1.5 flex items-center gap-2">
              <span className={`font-body text-xs font-medium ${chamberColor}`}>
                {committee.chamber}
              </span>
              {committee.memberCount > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="font-body text-xs text-muted-foreground">
                    {committee.memberCount} members
                  </span>
                </>
              )}
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground mt-0.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>
      <AnimatePresence>
        {expanded && committee.members.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="px-4 py-3 space-y-1">
              {committee.members.map((m, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="font-body text-xs text-foreground">{m.name}</span>
                  <span className="font-body text-[10px] text-muted-foreground capitalize">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BillRow({ bill }: { bill: CommitteeBill }) {
  const formattedDate = bill.lastActionDate
    ? new Date(bill.lastActionDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-surface-elevated">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display text-sm font-bold text-primary">
              {bill.identifier}
            </span>
            <span className="rounded bg-surface-elevated px-2 py-0.5 font-body text-[10px] font-medium text-muted-foreground">
              {bill.chamber}
            </span>
          </div>
          <p className="font-body text-sm text-foreground leading-snug line-clamp-2">
            {bill.title}
          </p>
          {bill.committeeRef && (
            <p className="mt-1.5 font-body text-xs text-muted-foreground line-clamp-1">
              {bill.committeeRef}
            </p>
          )}
          {!bill.committeeRef && bill.lastAction && (
            <p className="mt-1.5 font-body text-xs text-muted-foreground line-clamp-1">
              {bill.lastAction}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {formattedDate && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="font-body text-xs">{formattedDate}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommitteesSkeleton() {
  return (
    <div className="space-y-10">
      <section>
        <Skeleton className="h-7 w-48 mb-4" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </section>
      <section>
        <Skeleton className="h-7 w-64 mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl mb-3" />
        ))}
      </section>
    </div>
  );
}

export default Committees;
