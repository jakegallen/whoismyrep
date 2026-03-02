import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trackEvent } from "@/lib/analytics";
import { useSavedReps } from "@/hooks/useSavedReps";
import type { CivicRep } from "@/hooks/useCivicReps";
import { cn } from "@/lib/utils";

interface SaveRepButtonProps {
  rep: CivicRep;
  /** "sm" for card corners, "md" for detail pages */
  size?: "sm" | "md";
  className?: string;
}

export function SaveRepButton({ rep, size = "sm", className }: SaveRepButtonProps) {
  const { isSaved, toggleSaved } = useSavedReps();
  const saved = isSaved(rep);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't trigger card navigation
    e.preventDefault();
    toggleSaved(rep);
    trackEvent(saved ? "Unsave Rep" : "Save Rep", { name: rep.name, office: rep.office });
  };

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  const btnSize = size === "sm" ? "h-7 w-7" : "h-9 w-9";

  return (
    <button
      onClick={handleClick}
      aria-label={saved ? `Remove ${rep.name} from saved` : `Save ${rep.name}`}
      title={saved ? "Remove from saved" : "Save representative"}
      className={cn(
        "relative flex items-center justify-center rounded-full transition-all",
        saved
          ? "bg-red-500/15 text-red-500 hover:bg-red-500/25"
          : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-red-400",
        btnSize,
        className,
      )}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={saved ? "saved" : "unsaved"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
        >
          <Heart
            className={iconSize}
            fill={saved ? "currentColor" : "none"}
            strokeWidth={saved ? 0 : 2}
          />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
