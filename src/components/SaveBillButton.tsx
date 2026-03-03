import { Bookmark } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trackEvent } from "@/lib/analytics";
import { useSavedBills } from "@/hooks/useSavedBills";
import type { Bill } from "@/hooks/useBills";
import { cn } from "@/lib/utils";

interface SaveBillButtonProps {
  bill: Bill;
  jurisdiction: string;
  /** "sm" for list rows, "md" for detail pages */
  size?: "sm" | "md";
  className?: string;
}

export function SaveBillButton({ bill, jurisdiction, size = "sm", className }: SaveBillButtonProps) {
  const { isSaved, toggleSaved } = useSavedBills();
  const saved = isSaved(bill);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't trigger row navigation
    e.preventDefault();
    toggleSaved(bill, jurisdiction);
    trackEvent(saved ? "Unsave Bill" : "Save Bill", { id: bill.id, billNumber: bill.billNumber });
  };

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  const btnSize = size === "sm" ? "h-7 w-7" : "h-9 w-9";

  return (
    <button
      onClick={handleClick}
      aria-label={saved ? `Remove ${bill.billNumber} from saved` : `Save ${bill.billNumber}`}
      title={saved ? "Remove from saved bills" : "Save bill"}
      className={cn(
        "relative flex items-center justify-center rounded-full transition-all",
        saved
          ? "bg-primary/15 text-primary hover:bg-primary/25"
          : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-primary",
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
          <Bookmark
            className={iconSize}
            fill={saved ? "currentColor" : "none"}
            strokeWidth={saved ? 0 : 2}
          />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
