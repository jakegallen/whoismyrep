import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin,
  Landmark,
  Building2,
  Building,
  Home,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { SocialIcons } from "@/components/SocialIcons";
import DistrictDashboard from "@/components/DistrictDashboard";
import { Button } from "@/components/ui/button";
import { type CivicGroup, type ElectionInfo, type VoterInfo } from "@/hooks/useCivicReps";

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

const partyDot: Record<string, string> = {
  Democrat: "bg-[hsl(217,72%,48%)]",
  Democratic: "bg-[hsl(217,72%,48%)]",
  Republican: "bg-[hsl(0,68%,48%)]",
  Independent: "bg-[hsl(43,90%,48%)]",
  Nonpartisan: "bg-muted-foreground",
};

interface RepResultsState {
  groups: CivicGroup[];
  normalizedAddress: string;
  elections?: ElectionInfo[];
  voterInfo?: VoterInfo | null;
}

const RepResults = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { groups, normalizedAddress, voterInfo } = ((state as RepResultsState) || {});

  useEffect(() => {
    if (!groups) navigate("/", { replace: true });
  }, [groups, navigate]);

  useEffect(() => {
    if (normalizedAddress) {
      document.title = `Representatives for ${normalizedAddress} — WhoIsMyRep.us`;
    } else {
      document.title = "Your Representatives — WhoIsMyRep.us";
    }
  }, [normalizedAddress]);

  if (!groups) return null;

  const totalReps = groups.reduce((a, g) => a + g.representatives.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <div className="container mx-auto px-4 py-8 pb-20">
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
          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-headline md:text-3xl">
              Your Representatives
            </h1>
            {normalizedAddress && (
              <div className="mt-2 flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <p className="font-body text-sm">{normalizedAddress}</p>
              </div>
            )}
            <p className="mt-1 font-body text-xs text-muted-foreground">
              {totalReps} representative{totalReps !== 1 ? "s" : ""} found at{" "}
              {groups.length} level{groups.length !== 1 ? "s" : ""} of government
            </p>
          </div>

          {/* Grouped rep cards */}
          <div className="space-y-8">
            {groups.map((group, gi) => {
              const style = levelStyles[group.level] || levelStyles.federal;
              const Icon = levelIcons[group.level] || Landmark;

              return (
                <motion.div
                  key={group.level}
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
                      {group.label}
                    </h3>
                    <span className="rounded-md bg-surface-elevated px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {group.representatives.length}
                    </span>
                  </div>

                  {/* Rep cards */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.representatives.map((rep, ri) => {
                      const dot = partyDot[rep.party] || partyDot.Nonpartisan;

                      return (
                        <motion.div
                          key={`${rep.name}-${ri}`}
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
                                className="h-12 w-12 rounded-lg object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${style.bg}`}>
                                <Icon className={`h-5 w-5 ${style.text}`} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-display text-sm font-bold text-headline">
                                  {rep.name}
                                </h4>
                                <div className={`h-2 w-2 rounded-full ${dot}`} title={rep.party} />
                              </div>
                              <p className="font-body text-xs text-muted-foreground">{rep.office}</p>
                              <p className="mt-0.5 font-body text-[10px] text-muted-foreground/60">{rep.party}</p>
                              <SocialIcons socialHandles={rep.socialHandles} size="sm" className="mt-1" />
                            </div>
                            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* District Dashboard */}
          <DistrictDashboard address={normalizedAddress} voterInfo={voterInfo ?? null} />
        </div>
      </div>
    </div>
  );
};

export default RepResults;
