import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, X, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface DiscoveryPrompt {
  id: string;
  message: string;
  linkTo: string;
  linkLabel: string;
}

const DISMISSED_KEY = "whoismyrep-dismissed-prompts";

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function dismiss(id: string) {
  const set = getDismissed();
  set.add(id);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
}

/**
 * Contextual discovery prompts for existing pages.
 * Pass `context` to show page-relevant nudges.
 */
export function DiscoveryPrompts({
  context,
}: {
  context: "politicians" | "bills" | "home" | "saved-empty";
}) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => getDismissed());

  const prompts: DiscoveryPrompt[] = [];

  if (context === "politicians") {
    prompts.push({
      id: "explore-stock-trades",
      message: "See what stocks members of Congress are trading.",
      linkTo: "/congress-trades",
      linkLabel: "View stock trades",
    });
    prompts.push({
      id: "explore-lobbying",
      message: "Follow the money — see who's lobbying your representatives.",
      linkTo: "/lobbying",
      linkLabel: "Explore lobbying",
    });
  }

  if (context === "bills") {
    prompts.push({
      id: "explore-committees",
      message: "Bills go through committees first — see which committees matter most.",
      linkTo: "/committees",
      linkLabel: "Browse committees",
    });
    prompts.push({
      id: "explore-calendar",
      message: "Check what's happening in Congress this week.",
      linkTo: "/calendar",
      linkLabel: "Legislative calendar",
    });
  }

  if (context === "home" && user) {
    prompts.push({
      id: "try-quiz",
      message: "Test your civics knowledge and earn XP!",
      linkTo: "/quiz",
      linkLabel: "Take a quiz",
    });
    prompts.push({
      id: "daily-briefing",
      message: "Start your day with a personalized political briefing.",
      linkTo: "/today",
      linkLabel: "Today's briefing",
    });
  }

  if (context === "saved-empty") {
    prompts.push({
      id: "onboard-save",
      message: "Save representatives and bills to track their activity.",
      linkTo: "/politicians",
      linkLabel: "Find representatives",
    });
  }

  // Filter out dismissed
  const visible = prompts.filter((p) => !dismissed.has(p.id));

  if (visible.length === 0) return null;

  // Show only one prompt at a time
  const prompt = visible[0];

  const handleDismiss = () => {
    dismiss(prompt.id);
    setDismissed((s) => new Set([...s, prompt.id]));
  };

  return (
    <AnimatePresence>
      <motion.div
        key={prompt.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3"
      >
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm text-foreground">{prompt.message}</p>
          <Link
            to={prompt.linkTo}
            className="mt-1 inline-block font-display text-xs font-semibold text-primary hover:underline"
          >
            {prompt.linkLabel} &rarr;
          </Link>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
