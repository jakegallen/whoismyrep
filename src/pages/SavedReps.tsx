import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  GraduationCap,
  Scale,
  Layers,
  MapPin,
  X,
  Bookmark,
  FileText,
  Activity,
  Map,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SEO from "@/components/SEO";
import { SocialIcons } from "@/components/SocialIcons";
import { SaveRepButton } from "@/components/SaveRepButton";
import { SaveBillButton } from "@/components/SaveBillButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSavedReps } from "@/hooks/useSavedReps";
import { useSavedBills } from "@/hooks/useSavedBills";
import { useHomeState } from "@/hooks/useHomeState";
import { StreakBanner } from "@/components/StreakBanner";
import { DiscoveryPrompts } from "@/components/DiscoveryPrompts";
import { US_STATES } from "@/lib/usStates";
import { categorizeBill } from "@/components/BillPipeline";
import { ActivityFeed } from "@/components/ActivityFeed";
import type { SavedRep } from "@/hooks/useSavedReps";

// ── Shared styling maps ──

const levelIcons: Record<string, typeof Landmark> = {
  federal: Landmark,
  state: Building2,
  county: Building,
  judicial: Scale,
  special_district: Layers,
  school_board: GraduationCap,
  local: Home,
};

const levelStyles: Record<string, { bg: string; text: string; border: string }> = {
  federal: { bg: "bg-[hsl(217,72%,42%/0.12)]", text: "text-[hsl(217,72%,42%)]", border: "border-[hsl(217,72%,42%/0.25)]" },
  state: { bg: "bg-[hsl(0,68%,48%/0.12)]", text: "text-[hsl(0,68%,48%)]", border: "border-[hsl(0,68%,48%/0.25)]" },
  county: { bg: "bg-[hsl(220,20%,45%/0.12)]", text: "text-[hsl(220,20%,45%)]", border: "border-[hsl(220,20%,45%/0.25)]" },
  judicial: { bg: "bg-[hsl(262,50%,50%/0.12)]", text: "text-[hsl(262,50%,50%)]", border: "border-[hsl(262,50%,50%/0.25)]" },
  special_district: { bg: "bg-[hsl(16,75%,52%/0.12)]", text: "text-[hsl(16,75%,52%)]", border: "border-[hsl(16,75%,52%/0.25)]" },
  school_board: { bg: "bg-[hsl(174,60%,40%/0.12)]", text: "text-[hsl(174,60%,40%)]", border: "border-[hsl(174,60%,40%/0.25)]" },
  local: { bg: "bg-[hsl(43,90%,48%/0.12)]", text: "text-[hsl(43,90%,48%)]", border: "border-[hsl(43,90%,48%/0.25)]" },
};

const partyPillColors: Record<string, { bg: string; text: string }> = {
  Democrat: { bg: "bg-[hsl(217,72%,48%/0.12)]", text: "text-[hsl(217,72%,48%)]" },
  Democratic: { bg: "bg-[hsl(217,72%,48%/0.12)]", text: "text-[hsl(217,72%,48%)]" },
  Republican: { bg: "bg-[hsl(0,68%,48%/0.12)]", text: "text-[hsl(0,68%,48%)]" },
  Independent: { bg: "bg-[hsl(43,90%,48%/0.12)]", text: "text-[hsl(43,90%,48%)]" },
  Nonpartisan: { bg: "bg-muted/40", text: "text-muted-foreground" },
};

const chamberColors: Record<string, string> = {
  Senate: "bg-amber-500/20 text-amber-400",
  Assembly: "bg-blue-500/20 text-blue-400",
};

const stageLabels: Record<string, string> = {
  introduced: "Introduced",
  committee: "In Committee",
  floor: "Floor Vote",
  passed: "Passed",
  signed: "Signed/Law",
  dead: "Dead/Vetoed",
};

// ── Page ──

const SavedReps = () => {
  const navigate = useNavigate();
  const { savedReps, clearAll: clearAllReps, count: repCount } = useSavedReps();
  const { savedBills, clearAll: clearAllBills, count: billCount } = useSavedBills();
  const {
    homeState, setHomeState, clearHomeState, stateName,
    homeDistrict, setHomeDistrict, clearHomeDistrict,
  } = useHomeState();

  useEffect(() => {
    document.title = "My Saved — WhoIsMyRep.us";
  }, []);

  // Group saved reps by level
  const grouped = savedReps.reduce<Record<string, SavedRep[]>>((acc, rep) => {
    const level = rep.level || "local";
    if (!acc[level]) acc[level] = [];
    acc[level].push(rep);
    return acc;
  }, {});

  const levelOrder = ["federal", "state", "county", "judicial", "special_district", "school_board", "local"] as const;
  const levelLabels: Record<string, string> = {
    federal: "Federal",
    state: "State",
    county: "County",
    judicial: "Judicial",
    special_district: "Special District",
    school_board: "School Board",
    local: "Local",
  };

  const totalCount = repCount + billCount;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="My Saved"
        description="Your personalized dashboard — saved representatives, bills, and activity feed."
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
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-headline md:text-3xl">
              <Heart className="mr-2 inline-block h-6 w-6 text-red-500" fill="currentColor" />
              My Saved
            </h1>
            <p className="mt-1 font-body text-xs text-muted-foreground">
              {totalCount === 0
                ? "No items saved yet"
                : `${repCount} rep${repCount !== 1 ? "s" : ""}, ${billCount} bill${billCount !== 1 ? "s" : ""} saved`}
            </p>
            <p className="mt-0.5 font-body text-[10px] text-muted-foreground/60">
              Saved locally on this device — no sign-in required
            </p>
          </div>

          {/* Streak banner */}
          <StreakBanner />

          {/* Preferences card */}
          <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-display text-sm font-bold text-headline">Preferences</span>
            </div>
            <p className="font-body text-[11px] text-muted-foreground mb-3">
              Set your home state and district to personalize Bills, Politicians, and other pages.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {/* Home state selector */}
              <div className="flex items-center gap-2">
                <Select
                  value={homeState || ""}
                  onValueChange={(val) => setHomeState(val)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select home state" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {US_STATES.map((s) => (
                      <SelectItem key={s.abbr} value={s.abbr}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {homeState && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHomeState}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* District picker (conditional on home state) */}
              {homeState && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={homeDistrict || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || val === "0") {
                        clearHomeDistrict();
                      } else {
                        setHomeDistrict(val);
                      }
                    }}
                    placeholder="District #"
                    className="w-[100px]"
                  />
                  {homeDistrict && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHomeDistrict}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Status text */}
            {homeState && (
              <div className="mt-2 flex items-center gap-2">
                <p className="font-body text-xs text-primary">
                  {stateName}{homeDistrict ? `, District ${homeDistrict}` : ""} — personalizes Bills and Politicians pages.
                </p>
                {homeState && !homeDistrict && (
                  <Link
                    to="/district-map"
                    className="inline-flex items-center gap-1 font-body text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <Map className="h-3 w-3" />
                    Find your district
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="reps">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="reps" className="gap-1.5">
                <Heart className="h-3.5 w-3.5" />
                My Reps{repCount > 0 ? ` (${repCount})` : ""}
              </TabsTrigger>
              <TabsTrigger value="bills" className="gap-1.5">
                <Bookmark className="h-3.5 w-3.5" />
                My Bills{billCount > 0 ? ` (${billCount})` : ""}
              </TabsTrigger>
              <TabsTrigger value="feed" className="gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Activity
              </TabsTrigger>
            </TabsList>

            {/* ── My Reps tab ── */}
            <TabsContent value="reps">
              {repCount > 0 && (
                <div className="mb-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllReps}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Clear All Reps
                  </Button>
                </div>
              )}

              {repCount === 0 && (
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
                    Search for your address to find your representatives, then tap the heart icon to save them here.
                  </p>
                  <Button
                    onClick={() => navigate("/")}
                    className="mt-6 gradient-brand font-display font-semibold text-white shadow-glow hover:opacity-90 transition-opacity"
                  >
                    Find Your Reps
                  </Button>
                  <div className="mt-6 w-full">
                    <DiscoveryPrompts context="saved-empty" />
                  </div>
                </motion.div>
              )}

              {repCount > 0 && (
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
                                          {rep.level === "school_board" ? "School Board" : rep.level === "judicial" ? "Judicial" : rep.level.charAt(0).toUpperCase() + rep.level.slice(1)}
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
            </TabsContent>

            {/* ── My Bills tab ── */}
            <TabsContent value="bills">
              {billCount > 0 && (
                <div className="mb-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllBills}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Clear All Bills
                  </Button>
                </div>
              )}

              {billCount === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center"
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/40">
                    <Bookmark className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h2 className="font-display text-lg font-bold text-headline">No saved bills</h2>
                  <p className="mt-1.5 max-w-sm font-body text-sm text-muted-foreground">
                    Browse the Bill Tracker to find and save bills you want to follow through the legislative pipeline.
                  </p>
                  <Button
                    onClick={() => navigate("/bills")}
                    className="mt-6 gradient-brand font-display font-semibold text-white shadow-glow hover:opacity-90 transition-opacity"
                  >
                    Browse Bills
                  </Button>
                </motion.div>
              )}

              {billCount > 0 && (
                <div className="grid gap-3">
                  {savedBills.map((bill, i) => {
                    const stage = categorizeBill(bill);
                    const chamberColor = chamberColors[bill.chamber] || "bg-muted text-muted-foreground";

                    return (
                      <motion.div
                        key={bill.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group cursor-pointer rounded-xl border border-border bg-card p-4 transition-colors hover:bg-surface-hover"
                        onClick={() => {
                          navigate(`/bills/${bill.id}`, { state: { bill, jurisdiction: bill.jurisdiction } });
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${chamberColor}`}>
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display text-sm font-bold text-headline">
                                {bill.billNumber}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {bill.chamber}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                {stageLabels[stage] || bill.status}
                              </Badge>
                            </div>
                            <p className="mt-1 line-clamp-2 font-body text-sm text-secondary-custom">
                              {bill.title}
                            </p>
                            {bill.sponsors.length > 0 && (
                              <p className="mt-1 font-body text-xs text-muted-foreground">
                                Sponsors: {bill.sponsors.slice(0, 3).join(", ")}
                                {bill.sponsors.length > 3 && ` +${bill.sponsors.length - 3} more`}
                              </p>
                            )}
                            <p className="mt-1 font-body text-[10px] text-muted-foreground/60">
                              Saved {new Date(bill.savedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-center gap-1">
                            <SaveBillButton bill={bill} jurisdiction={bill.jurisdiction} size="sm" />
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── Activity Feed tab ── */}
            <TabsContent value="feed">
              <ActivityFeed savedReps={savedReps} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default SavedReps;
