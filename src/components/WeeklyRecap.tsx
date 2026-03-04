import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ArrowUp, BarChart3, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const RECAP_SHOWN_KEY = "whoismyrep-weekly-recap-shown";

interface WeekStats {
  xpEarned: number;
  billsRead: number;
  repsViewed: number;
  quizCorrect: number;
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(now.setDate(diff)).toISOString().split("T")[0];
}

function getPreviousWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));

  const prevMonday = new Date(thisMonday);
  prevMonday.setDate(thisMonday.getDate() - 7);
  const prevSunday = new Date(thisMonday);
  prevSunday.setDate(thisMonday.getDate() - 1);

  return {
    start: prevMonday.toISOString().split("T")[0],
    end: prevSunday.toISOString().split("T")[0],
  };
}

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  if (current > previous) return <ArrowUp className="h-3 w-3 text-green-500" />;
  if (current < previous) return <ArrowDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

export function WeeklyRecap() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const weekStart = getWeekStart();

  // Check if we already showed recap this week
  useEffect(() => {
    if (!user) return;
    const shown = localStorage.getItem(RECAP_SHOWN_KEY);
    if (shown === weekStart) return; // already shown

    // Only show on Monday (or first visit of the week)
    const day = new Date().getDay();
    if (day !== 1 && shown) return; // Only auto-show on Monday unless never shown

    // Delay opening slightly for better UX
    const t = setTimeout(() => setOpen(true), 2000);
    return () => clearTimeout(t);
  }, [user, weekStart]);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem(RECAP_SHOWN_KEY, weekStart);
  };

  const prevWeek = getPreviousWeekRange();

  // Fetch last week's stats
  const { data } = useQuery({
    queryKey: ["weekly-recap", user?.id, prevWeek.start],
    queryFn: async (): Promise<{ thisWeek: WeekStats; lastWeek: WeekStats }> => {
      if (!user) return { thisWeek: emptyStats(), lastWeek: emptyStats() };

      const twoWeeksAgo = new Date(prevWeek.start);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);

      const { data: events } = await supabase
        .from("xp_events")
        .select("action, xp_earned, created_at")
        .eq("user_id", user.id)
        .gte("created_at", twoWeeksAgo.toISOString())
        .order("created_at", { ascending: false });

      if (!events) return { thisWeek: emptyStats(), lastWeek: emptyStats() };

      const lastWeekEvents = events.filter(
        (e) => e.created_at >= prevWeek.start && e.created_at <= prevWeek.end + "T23:59:59Z",
      );
      const twoWeeksAgoStr = twoWeeksAgo.toISOString().split("T")[0];
      const prevPrevEnd = new Date(prevWeek.start);
      prevPrevEnd.setDate(prevPrevEnd.getDate() - 1);
      const prevPrevEvents = events.filter(
        (e) => e.created_at >= twoWeeksAgoStr && e.created_at <= prevPrevEnd.toISOString().split("T")[0] + "T23:59:59Z",
      );

      return {
        thisWeek: computeStats(lastWeekEvents),
        lastWeek: computeStats(prevPrevEvents),
      };
    },
    enabled: !!user && open,
    staleTime: 60 * 60 * 1000,
  });

  if (!user) return null;

  const thisWeek = data?.thisWeek ?? emptyStats();
  const lastWeek = data?.lastWeek ?? emptyStats();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <BarChart3 className="h-4 w-4" />
            Weekly Recap
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <StatRow label="XP Earned" value={thisWeek.xpEarned} prev={lastWeek.xpEarned} suffix=" XP" />
          <StatRow label="Bills Read" value={thisWeek.billsRead} prev={lastWeek.billsRead} />
          <StatRow label="Reps Viewed" value={thisWeek.repsViewed} prev={lastWeek.repsViewed} />
          <StatRow label="Quiz Correct" value={thisWeek.quizCorrect} prev={lastWeek.quizCorrect} />
        </div>

        <Button onClick={handleClose} className="mt-2 w-full">
          Got it!
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function StatRow({
  label,
  value,
  prev,
  suffix = "",
}: {
  label: string;
  value: number;
  prev: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-3">
      <span className="font-body text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-bold text-headline">
          {value.toLocaleString()}{suffix}
        </span>
        <TrendArrow current={value} previous={prev} />
      </div>
    </div>
  );
}

function emptyStats(): WeekStats {
  return { xpEarned: 0, billsRead: 0, repsViewed: 0, quizCorrect: 0 };
}

function computeStats(
  events: Array<{ action: string; xp_earned: number }>,
): WeekStats {
  return {
    xpEarned: events.reduce((s, e) => s + e.xp_earned, 0),
    billsRead: events.filter((e) => e.action === "read_bill").length,
    repsViewed: events.filter((e) => e.action === "read_politician").length,
    quizCorrect: events.filter((e) => e.action === "quiz_correct").length,
  };
}
