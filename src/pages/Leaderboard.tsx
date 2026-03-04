import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, Flame, Trophy, Medal, LogIn } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  current_streak: number;
  achievement_count: number;
  xp_rank: number;
  streak_rank: number;
}

type SortMode = "xp" | "streak";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted font-mono text-xs font-bold text-muted-foreground">
      {rank}
    </span>
  );
}

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sort, setSort] = useState<SortMode>("xp");

  useEffect(() => {
    document.title = "Leaderboard — WhoIsMyRep.us";
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", sort, user?.id],
    queryFn: async () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL || "https://dnfdlxiggyucaclebyjh.supabase.co"}/functions/v1/get-leaderboard?sort=${sort}&limit=50${user ? `&userId=${user.id}` : ""}`;
      const res = await fetch(url, {
        headers: {
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json() as Promise<{ leaders: LeaderboardEntry[]; userRank: LeaderboardEntry | null }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const leaders = data?.leaders ?? [];
  const userRank = data?.userRank;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Leaderboard"
        description="See top civic engagement leaders on WhoIsMyRep.us"
        path="/leaderboard"
      />
      <SiteNav />

      <main id="main-content" className="container mx-auto px-4 py-8 pb-20">
        <div className="mx-auto max-w-2xl">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 -ml-2 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15">
                <Crown className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-headline">Leaderboard</h1>
                <p className="font-body text-sm text-muted-foreground">
                  Top civic engagement leaders
                </p>
              </div>
            </div>
          </motion.div>

          <Tabs value={sort} onValueChange={(v) => setSort(v as SortMode)} className="mb-6">
            <TabsList className="w-full">
              <TabsTrigger value="xp" className="flex-1 gap-1.5">
                <Trophy className="h-3.5 w-3.5" /> XP
              </TabsTrigger>
              <TabsTrigger value="streak" className="flex-1 gap-1.5">
                <Flame className="h-3.5 w-3.5" /> Streak
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* User rank highlight */}
          {userRank && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 flex items-center gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-3"
            >
              <RankBadge rank={sort === "streak" ? Number(userRank.streak_rank) : Number(userRank.xp_rank)} />
              <div className="flex-1 min-w-0">
                <p className="truncate font-display text-sm font-bold text-headline">
                  {userRank.display_name ?? "You"} (You)
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  Level {userRank.level} · {userRank.xp.toLocaleString()} XP ·
                  {userRank.current_streak}d streak · {userRank.achievement_count} badges
                </p>
              </div>
            </motion.div>
          )}

          {!user && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-dashed border-border bg-card/50 p-4">
              <p className="font-body text-sm text-muted-foreground">
                Sign in to see your rank
              </p>
              <Button size="sm" onClick={() => navigate("/auth")} className="gap-1.5">
                <LogIn className="h-3.5 w-3.5" /> Sign In
              </Button>
            </div>
          )}

          {/* Leaders list */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl bg-muted/50"
                />
              ))}
            </div>
          ) : leaders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
              <Trophy className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-body text-sm text-muted-foreground">
                No leaders yet — be the first!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaders.map((entry, i) => {
                const rank = sort === "streak" ? Number(entry.streak_rank) : Number(entry.xp_rank);
                const isYou = user?.id === entry.user_id;
                return (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                      isYou
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card/60 hover:bg-card"
                    }`}
                  >
                    <RankBadge rank={rank} />
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 font-display text-xs font-bold text-white">
                      {(entry.display_name ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-display text-sm font-semibold text-headline">
                        {entry.display_name ?? "Anonymous"}
                        {isYou && <span className="ml-1 text-primary">(You)</span>}
                      </p>
                      <p className="font-body text-[11px] text-muted-foreground">
                        Lv.{entry.level} · {entry.achievement_count} badges
                      </p>
                    </div>
                    <div className="text-right">
                      {sort === "xp" ? (
                        <p className="font-mono text-sm font-bold text-primary">
                          {entry.xp.toLocaleString()} XP
                        </p>
                      ) : (
                        <p className="flex items-center gap-1 font-mono text-sm font-bold text-orange-500">
                          <Flame className="h-3.5 w-3.5" />
                          {entry.current_streak}d
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LeaderboardPage;
