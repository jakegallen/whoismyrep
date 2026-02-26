import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Users,
  Vote,
  CheckCircle2,
  Pen,
  XCircle,
  ArrowRight,
} from "lucide-react";
import type { Bill } from "@/hooks/useBills";

export type PipelineStage =
  | "all"
  | "introduced"
  | "committee"
  | "floor"
  | "passed"
  | "signed"
  | "dead";

interface StageConfig {
  id: PipelineStage;
  label: string;
  icon: typeof FileText;
  color: string;        // bg token
  textColor: string;    // text token
  keywords: string[];   // patterns to match in bill.status
}

const stages: StageConfig[] = [
  {
    id: "introduced",
    label: "Introduced",
    icon: FileText,
    color: "bg-[hsl(210,80%,55%/0.15)]",
    textColor: "text-[hsl(210,80%,55%)]",
    keywords: [
      "introduced",
      "prefiled",
      "first reading",
      "read first time",
      "referred to committee",
    ],
  },
  {
    id: "committee",
    label: "In Committee",
    icon: Users,
    color: "bg-[hsl(43,90%,55%/0.15)]",
    textColor: "text-[hsl(43,90%,55%)]",
    keywords: [
      "committee",
      "hearing",
      "amend, and do pass",
      "do pass",
      "reported",
      "rereferred",
      "subcommittee",
    ],
  },
  {
    id: "floor",
    label: "Floor Vote",
    icon: Vote,
    color: "bg-[hsl(280,60%,55%/0.15)]",
    textColor: "text-[hsl(280,60%,55%)]",
    keywords: [
      "second reading",
      "third reading",
      "floor",
      "passed assembly",
      "passed senate",
      "read third time",
      "ordered to",
      "to enrollment",
    ],
  },
  {
    id: "passed",
    label: "Passed",
    icon: CheckCircle2,
    color: "bg-[hsl(142,71%,45%/0.15)]",
    textColor: "text-[hsl(142,71%,45%)]",
    keywords: [
      "enrolled",
      "to governor",
      "delivered to governor",
      "passed both",
    ],
  },
  {
    id: "signed",
    label: "Signed / Law",
    icon: Pen,
    color: "bg-primary/15",
    textColor: "text-primary",
    keywords: [
      "approved by governor",
      "signed by governor",
      "chaptered",
      "effective",
      "became law",
    ],
  },
  {
    id: "dead",
    label: "Dead / Vetoed",
    icon: XCircle,
    color: "bg-destructive/15",
    textColor: "text-destructive",
    keywords: [
      "vetoed",
      "failed",
      "indefinitely postponed",
      "withdrawn",
      "tabled",
      "died",
      "no action",
    ],
  },
];

export function categorizeBill(bill: Bill): PipelineStage {
  const status = bill.status.toLowerCase();
  // Check stages in reverse priority order (later stages win)
  for (let i = stages.length - 1; i >= 0; i--) {
    if (stages[i].keywords.some((kw) => status.includes(kw))) {
      return stages[i].id;
    }
  }
  return "introduced"; // default
}

interface BillPipelineProps {
  bills: Bill[];
  activeStage: PipelineStage;
  onStageChange: (stage: PipelineStage) => void;
}

const BillPipeline = ({ bills, activeStage, onStageChange }: BillPipelineProps) => {
  const counts = useMemo(() => {
    const map: Record<PipelineStage, number> = {
      all: bills.length,
      introduced: 0,
      committee: 0,
      floor: 0,
      passed: 0,
      signed: 0,
      dead: 0,
    };
    for (const bill of bills) {
      map[categorizeBill(bill)]++;
    }
    return map;
  }, [bills]);

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-headline">
          Bill Status Pipeline
        </h3>
        <button
          onClick={() => onStageChange("all")}
          className={`font-body text-xs transition-colors ${
            activeStage === "all"
              ? "font-semibold text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({counts.all})
        </button>
      </div>

      {/* Pipeline stages */}
      <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
        {stages.map((stage, i) => {
          const isActive = activeStage === stage.id;
          const count = counts[stage.id];
          const Icon = stage.icon;

          return (
            <div key={stage.id} className="flex items-center">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onStageChange(isActive ? "all" : stage.id)}
                className={`relative flex min-w-[100px] flex-1 flex-col items-center gap-1.5 rounded-lg px-3 py-3 transition-all ${
                  isActive
                    ? `${stage.color} ring-2 ring-current ${stage.textColor}`
                    : "bg-surface-elevated text-muted-foreground hover:bg-surface-hover"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-body text-[11px] font-medium leading-tight text-center">
                  {stage.label}
                </span>
                <span
                  className={`font-display text-lg font-bold ${
                    isActive ? stage.textColor : "text-headline"
                  }`}
                >
                  {count}
                </span>

                {/* Percentage bar */}
                {bills.length > 0 && (
                  <div className="h-1 w-full rounded-full bg-border">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(count / bills.length) * 100}%`,
                      }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className={`h-full rounded-full ${
                        isActive
                          ? "bg-current"
                          : "bg-muted-foreground/40"
                      }`}
                    />
                  </div>
                )}
              </motion.button>

              {/* Arrow between stages (except last) */}
              {i < stages.length - 1 && (
                <ArrowRight className="mx-0.5 h-3 w-3 shrink-0 text-muted-foreground/30" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BillPipeline;
