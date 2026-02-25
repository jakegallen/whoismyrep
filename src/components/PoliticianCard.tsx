import { motion } from "framer-motion";
import { MapPin, ExternalLink, ChevronRight } from "lucide-react";
import type { Politician } from "@/lib/politicians";

const partyColors: Record<string, string> = {
  Democrat: "bg-[hsl(210_80%_55%/0.15)] text-[hsl(210,80%,55%)]",
  Republican: "bg-[hsl(0_72%_51%/0.15)] text-[hsl(0,72%,51%)]",
  Independent: "bg-[hsl(43_90%_55%/0.15)] text-[hsl(43,90%,55%)]",
};

interface PoliticianCardProps {
  politician: Politician;
  mentionCount?: number;
  onClick: () => void;
}

const PoliticianCard = ({ politician, mentionCount, onClick }: PoliticianCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/30 hover:shadow-glow"
    >
      <div className="flex items-start gap-4">
        {/* Avatar placeholder */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-elevated font-display text-lg font-bold text-muted-foreground">
          {politician.name.split(" ").map((n) => n[0]).join("")}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-bold text-headline transition-colors group-hover:text-primary">
              {politician.name}
            </h3>
            <span className={`inline-flex rounded-md px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-wider ${partyColors[politician.party]}`}>
              {politician.party.charAt(0)}
            </span>
          </div>

          <p className="font-body text-sm text-secondary-custom">{politician.title}</p>

          <div className="mt-1 flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-tertiary" />
            <span className="font-body text-xs text-tertiary">{politician.region}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {politician.keyIssues.slice(0, 3).map((issue) => (
              <span
                key={issue}
                className="rounded-md bg-surface-elevated px-2 py-0.5 font-body text-[10px] font-medium text-muted-foreground"
              >
                {issue}
              </span>
            ))}
          </div>
        </div>

        <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-tertiary transition-colors group-hover:text-primary" />
      </div>

      {mentionCount !== undefined && (
        <div className="mt-3 border-t border-border pt-3">
          <span className="font-body text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{mentionCount}</span> recent mentions
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default PoliticianCard;
