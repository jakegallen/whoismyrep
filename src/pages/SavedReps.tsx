import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heart,
  Trash2,
  ChevronRight,
  ArrowLeft,
  Landmark,
  Building2,
  Building,
  Home,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SEO from "@/components/SEO";
import { SocialIcons } from "@/components/SocialIcons";
import { SaveRepButton } from "@/components/SaveRepButton";
import { Button } from "@/components/ui/button";
import { useSavedReps } from "@/hooks/useSavedReps";
import type { SavedRep } from "@/hooks/useSavedReps";

// ── Shared styling maps ──

const levelIcons: Record<string, typeof Landmark> = {
  federal: Landmark,
  state: Building2,
  county: Building,
  local: Home,
};

const levelStyles: Record<string, { bg: string; text: string; border: string }> = {
  federal: { bg: "bg-[hsl(217,72%,42%/0.12)]", text: "text-[hsl(217,72%,42%)]", border: "border-[hsl(217,72%,42%/0.25)]" },
  state: { bg: "bg-[hsl(0,68%,48%/0.12)]", text: "text-[hsl(0,68%,48%)]", border: "border-[hsl(0,68%,48%/0.25)]" },
  county: { bg: "bg-[hsl(220,20%,45%/0.12)]", text: "text-[hsl(220,20%,45%)]", border: "border-[hsl(220,20%,45%/0.25)]" },
  local: { bg: "bg-[hsl(43,90%,48%/0.12)]", text: "text-[hsl(43,90%,48%)]", border: "border-[hsl(43,90%,48%/0.25)]" },
};

const partyPillColors: Record<string, { bg: string; text: string }> = {
  Democrat: { bg: "bg-[hsl(217,72%,48%/0.12)]", text: "text-[hsl(217,72%,48%)]" },
  Democratic: { bg: "bg-[hsl(217,72%,48%/0.12)]", text: "text-[hsl(217,72%,48%)]" },
  Republican: { bg: "bg-[hsl(0,68%,48%/0.12)]", text: "text-[hsl(0,68%,48%)]" },
  Independent: { bg: "bg-[hsl(43,90%,48%/0.12)]", text: "text-[hsl(43,90%,48%)]" },
  Nonpartisan: { bg: "bg-muted/40", text: "text-muted-foreground" },
};

// ── Page ──

const SavedReps = () => {
  const navigate = useNavigate();
  const { savedReps, clearAll, count } = useSavedReps();

  useEffect(() => {
    document.title = "Saved Representatives — WhoIsMyRep.us";
  }, []);

  // Group saved reps by level
  const grouped = savedReps.reduce<Record<string, SavedRep[]>>((acc, rep) => {
    const level = rep.level || "local";
    if (!acc[level]) acc[level] = [];
    acc[level].push(rep);
    return acc;
  }, {});

  const levelOrder = ["federal", "state", "county", "local"] as const;
  const levelLabels: Record<string, string> = {
    federal: "Federal",
    state: "State",
    county: "County",
    local: "Local",
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Saved Representatives"
        description="Your saved elected officials — federal, state, and local representatives you're tracking."
        path="/saved"
      />
      <SiteNav />

      <main id="main-content" className="container mx-auto px-4 py-8 pb-20">
        <div className="mx-auto max-w-4xl">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6 -ml-2 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Button>

          {/* Page header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-headline md:text-3xl">
                <Heart className="mr-2 inline-block h-6 w-6 text-red-500" fill="currentColor" />
                Saved Representatives
              </h1>
              <p className="mt-1 font-body text-xs text-muted-foreground">
                {count === 0
                  ? "No representatives saved yet"
                  : `${count} representative${count !== 1 ? "s" : ""} saved`}
              </p>
              <p className="mt-0.5 font-body text-[10px] text-muted-foreground/60">
                Saved locally on this device — no sign-in required
              </p>
            </div>
            {count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Clear All
              </Button>
            )}
          </div>

          {/* Empty state */}
          {count === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/40">
                <Heart className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="font-display text-lg font-bold text-headline">No saved representatives</h2>
              <p className="mt-1.5 max-w-sm font-body text-sm text-muted-foreground">
                Search for your address to find your representatives, then tap the heart icon to save them here for quick access — even offline.
              </p>
              <Button
                onClick={() => navigate("/")}
                className="mt-6 gradient-brand font-display font-semibold text-white shadow-glow hover:opacity-90 transition-opacity"
              >
                Find Your Reps
              </Button>
            </motion.div>
          )}

          {/* Grouped rep cards */}
          {count > 0 && (
            <div className="space-y-8">
              {levelOrder
                .filter((level) => grouped[level]?.length)
                .map((level, gi) => {
                  const style = levelStyles[level];
                  const Icon = levelIcons[level] || Landmark;
                  const reps = grouped[level];

                  return (
                    <motion.div
                      key={level}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: gi * 0.1 }}
                    >
                      {/* Level header */}
                      <div className="mb-3 flex items-center gap-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${style.bg}`}>
                          <Icon className={`h-4 w-4 ${style.text}`} />
                        </div>
                        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-headline">
                          {levelLabels[level]}
                        </h3>
                        <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {reps.length}
                        </span>
                      </div>

                      {/* Rep cards */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {reps.map((rep, ri) => {
                          const pill = partyPillColors[rep.party] || partyPillColors.Nonpartisan;
                          const lvl = levelStyles[rep.level] || levelStyles.local;

                          return (
                            <motion.div
                              key={`${rep.name}-${rep.office}`}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: gi * 0.1 + ri * 0.05 }}
                              className={`group relative cursor-pointer rounded-xl border ${style.border} bg-card p-4 transition-colors hover:bg-surface-hover`}
                              onClick={() => {
                                const repId = rep.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
                                navigate(`/politicians/${repId}`, { state: { civicRep: rep } });
                              }}
                            >
                              <div className="flex items-start gap-3">
                                {/* Photo or initials */}
                                {rep.photoUrl ? (
                                  <img
                                    src={rep.photoUrl}
                                    alt={rep.name}
                                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${style.bg}`}>
                                    <span className={`font-display text-sm font-bold ${style.text}`}>
                                      {rep.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                    </span>
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <h4 className="font-display text-sm font-bold text-headline">
                                    {rep.name}
                                  </h4>
                                  <p className="font-body text-xs text-muted-foreground">{rep.office}</p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${pill.bg} ${pill.text}`}>
                                      {rep.party}
                                    </span>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${lvl.bg} ${lvl.text} border ${lvl.border}`}>
                                      {rep.level.charAt(0).toUpperCase() + rep.level.slice(1)}
                                    </span>
                                  </div>
                                  <SocialIcons
                                    socialHandles={{
                                      ...(rep.website ? { website: rep.website } : {}),
                                      ...(rep.email ? { email: rep.email } : {}),
                                      ...(rep.socialHandles || {}),
                                    }}
                                    size="sm"
                                    className="mt-1.5"
                                  />
                                </div>

                                {/* Save/unsave + chevron */}
                                <div className="flex shrink-0 flex-col items-center gap-1">
                                  <SaveRepButton rep={rep} size="sm" />
                                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
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

export default SavedReps;
