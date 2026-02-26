import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";

export interface ApprovalRating {
  politicianId: string;
  name: string;
  party: "Democrat" | "Republican" | "Independent";
  title: string;
  approve: number;
  disapprove: number;
  unsure: number;
  source: string;
  date: string;
  trend: "up" | "down" | "stable";
}

export interface RacePolling {
  raceId: string;
  raceLabel: string;
  candidates: {
    name: string;
    party: "Democrat" | "Republican" | "Independent" | "Nonpartisan";
    polling: number;
  }[];
  source: string;
  date: string;
  margin: number;
  sampleSize?: number;
}

const partyColor = (p: string) =>
  p === "Democrat"
    ? "hsl(210,80%,55%)"
    : p === "Republican"
      ? "hsl(0,72%,51%)"
      : "hsl(43,90%,55%)";

const partyBg = (p: string) =>
  p === "Democrat"
    ? "bg-[hsl(210,80%,55%)]/15 text-[hsl(210,80%,55%)]"
    : p === "Republican"
      ? "bg-[hsl(0,72%,51%)]/15 text-[hsl(0,72%,51%)]"
      : "bg-[hsl(43,90%,55%)]/15 text-[hsl(43,90%,55%)]";

const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-[hsl(142,71%,45%)]" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-[hsl(0,72%,51%)]" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

export function ApprovalRatingCard({ rating, index = 0 }: { rating: ApprovalRating; index?: number }) {
  const total = rating.approve + rating.disapprove + rating.unsure;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-xl border border-border bg-card p-4 shadow-card"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h4 className="font-display text-sm font-bold text-headline truncate">{rating.name}</h4>
          <p className="font-body text-xs text-muted-foreground">{rating.title}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <TrendIcon trend={rating.trend} />
          <span className={`rounded-full px-2 py-0.5 font-body text-[10px] font-bold ${partyBg(rating.party)}`}>
            {rating.party.charAt(0)}
          </span>
        </div>
      </div>

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted mb-2">
        <div className="h-full transition-all" style={{ width: `${(rating.approve / total) * 100}%`, backgroundColor: "hsl(142,71%,45%)" }} />
        <div className="h-full transition-all" style={{ width: `${(rating.disapprove / total) * 100}%`, backgroundColor: "hsl(0,72%,51%)" }} />
        <div className="h-full transition-all" style={{ width: `${(rating.unsure / total) * 100}%`, backgroundColor: "hsl(0,0%,70%)" }} />
      </div>

      <div className="flex justify-between font-body text-xs">
        <span className="text-[hsl(142,71%,45%)] font-semibold">{rating.approve}% Approve</span>
        <span className="text-[hsl(0,72%,51%)] font-semibold">{rating.disapprove}% Disapprove</span>
        <span className="text-muted-foreground">{rating.unsure}% Unsure</span>
      </div>

      <p className="mt-2 font-body text-[10px] text-tertiary">
        {rating.source} · {new Date(rating.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
    </motion.div>
  );
}

export function RacePollingCard({ race, index = 0 }: { race: RacePolling; index?: number }) {
  const [a, b] = race.candidates;
  const total = (a?.polling || 0) + (b?.polling || 0);
  const leader = race.margin > 0 ? a : b;
  const absMargin = Math.abs(race.margin);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-xl border border-border bg-card p-4 shadow-card"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-display text-sm font-bold text-headline">{race.raceLabel}</h4>
        <span className={`rounded-full px-2 py-0.5 font-body text-[10px] font-bold ${
          absMargin <= 3 ? "bg-[hsl(43,90%,55%)]/15 text-[hsl(43,90%,55%)]" : partyBg(leader?.party || "")
        }`}>
          {absMargin <= 3 ? "Toss-up" : `${leader?.name?.split(" ").pop()} +${absMargin}`}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        {race.candidates.map((c) => (
          <div key={c.name} className="flex items-center gap-2">
            <div className="w-24 min-w-0">
              <span className="font-body text-xs font-medium text-foreground truncate block">{c.name}</span>
            </div>
            <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${total ? (c.polling / total) * 100 : 50}%`, backgroundColor: partyColor(c.party) }}
              />
            </div>
            <span className="font-body text-xs font-bold text-foreground w-10 text-right">{c.polling}%</span>
          </div>
        ))}
      </div>

      <p className="font-body text-[10px] text-tertiary">
        {race.source} · {new Date(race.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        {race.sampleSize && ` · n=${race.sampleSize}`}
      </p>
    </motion.div>
  );
}

export function PollingSection({
  approvalRatings,
  racePolling: races,
}: {
  approvalRatings: ApprovalRating[];
  racePolling: RacePolling[];
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">Polling & Approval Ratings</h2>
      </div>
      <p className="font-body text-xs text-tertiary mb-5">
        Curated from public polls. Data is illustrative — check cited sources for methodology.
      </p>

      {approvalRatings.length > 0 && (
        <div className="mb-6">
          <h3 className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Approval Ratings
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {approvalRatings.map((r, i) => (
              <ApprovalRatingCard key={r.politicianId} rating={r} index={i} />
            ))}
          </div>
        </div>
      )}

      {races.length > 0 && (
        <div>
          <h3 className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Race Polling
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {races.map((r, i) => (
              <RacePollingCard key={r.raceId} race={r} index={i} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
