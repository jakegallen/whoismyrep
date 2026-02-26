import { motion } from "framer-motion";
import { BarChart3, CheckCircle2, XCircle, MinusCircle, Clock, Loader2, AlertCircle, TrendingUp, Users } from "lucide-react";
import { useVotingRecords, type VoteDetail, type VotingSummary } from "@/hooks/useVotingRecords";
import { getVotingRecord, gradeColor, gradeFromScore, type KeyVote } from "@/lib/votingRecords";

interface VotingScorecardProps {
  politicianId: string;
  politicianName: string;
  keyIssues: string[];
  party: string;
  level: string;
  chamber?: string;
  jurisdiction?: string;
}

const voteIcons: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  Yes: { icon: CheckCircle2, className: "text-[hsl(142,71%,45%)]" },
  No: { icon: XCircle, className: "text-[hsl(0,72%,51%)]" },
  Abstain: { icon: MinusCircle, className: "text-[hsl(43,90%,55%)]" },
  "Not Voting": { icon: Clock, className: "text-muted-foreground" },
};

const VotingScorecard = ({ politicianId, politicianName, keyIssues, party, level, chamber, jurisdiction }: VotingScorecardProps) => {
  // Fetch live data for state legislators (any state)
  const isStateLegislator = level === "state" && (chamber === "Senate" || chamber === "Assembly" || !chamber);
  const { data, isLoading, error } = useVotingRecords(
    isStateLegislator ? politicianName : undefined,
    chamber,
    isStateLegislator ? jurisdiction : undefined
  );

  const hasLiveData = data?.legislatorFound && data.votes.length > 0;

  // Fall back to mock data for non-state or when no live data
  if (!isStateLegislator || (!isLoading && !hasLiveData)) {
    return <MockScorecard politicianId={politicianId} keyIssues={keyIssues} party={party} jurisdiction={jurisdiction} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold text-headline">Voting Record</h2>
        </div>
        <div className="flex items-center gap-3 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-body text-sm text-muted-foreground">Loading voting records from OpenStates…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <MockScorecard politicianId={politicianId} keyIssues={keyIssues} party={party} jurisdiction={jurisdiction} />;
  }

  const summary = data!.summary;
  const votes = data!.votes;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">Voting Record</h2>
        <span className="rounded-md bg-[hsl(142,71%,45%/0.15)] px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-wider text-[hsl(142,71%,45%)]">
          Live Data
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Votes" value={String(summary.totalVotes)} subvalue={`${summary.session} session`} />
        <StatCard
          label="Yes Votes"
          value={String(summary.yesVotes)}
          subvalue={`${summary.totalVotes > 0 ? Math.round((summary.yesVotes / summary.totalVotes) * 100) : 0}% of votes`}
          color="hsl(142, 71%, 45%)"
        />
        <StatCard
          label="No Votes"
          value={String(summary.noVotes)}
          subvalue={`${summary.totalVotes > 0 ? Math.round((summary.noVotes / summary.totalVotes) * 100) : 0}% of votes`}
          color="hsl(0, 72%, 51%)"
        />
        <StatCard
          label="Party-Line Rate"
          value={`${summary.partyLineRate}%`}
          subvalue="majority alignment"
          color="hsl(210, 80%, 55%)"
        />
      </div>

      {/* Vote breakdown bar */}
      {summary.totalVotes > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 font-display text-sm font-bold text-headline">Vote Breakdown</h3>
          <div className="flex h-4 overflow-hidden rounded-full">
            <div
              className="bg-[hsl(142,71%,45%)] transition-all"
              style={{ width: `${(summary.yesVotes / summary.totalVotes) * 100}%` }}
              title={`Yes: ${summary.yesVotes}`}
            />
            <div
              className="bg-[hsl(0,72%,51%)] transition-all"
              style={{ width: `${(summary.noVotes / summary.totalVotes) * 100}%` }}
              title={`No: ${summary.noVotes}`}
            />
            <div
              className="bg-[hsl(43,90%,55%)] transition-all"
              style={{ width: `${(summary.abstainVotes / summary.totalVotes) * 100}%` }}
              title={`Abstain: ${summary.abstainVotes}`}
            />
            <div
              className="bg-muted transition-all"
              style={{ width: `${(summary.notVoting / summary.totalVotes) * 100}%` }}
              title={`Not Voting: ${summary.notVoting}`}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-4">
            <Legend color="hsl(142,71%,45%)" label="Yes" count={summary.yesVotes} />
            <Legend color="hsl(0,72%,51%)" label="No" count={summary.noVotes} />
            {summary.abstainVotes > 0 && <Legend color="hsl(43,90%,55%)" label="Abstain" count={summary.abstainVotes} />}
            {summary.notVoting > 0 && <Legend color="hsl(var(--muted))" label="Not Voting" count={summary.notVoting} />}
          </div>
        </div>
      )}

      {/* Recent votes */}
      {votes.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 font-display text-sm font-bold text-headline">
            Recent Roll Call Votes — {summary.session} Session
          </h3>
          <div className="divide-y divide-border">
            {votes.slice(0, 15).map((v, idx) => {
              const VoteIcon = voteIcons[v.vote]?.icon || MinusCircle;
              const iconClass = voteIcons[v.vote]?.className || "text-muted-foreground";
              return (
                <motion.div
                  key={`${v.billNumber}-${v.date}-${idx}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03, duration: 0.3 }}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <VoteIcon className={`h-4 w-4 shrink-0 ${iconClass}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xs font-bold text-headline">
                        {v.billNumber}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 font-body text-[9px] font-bold uppercase tracking-wider ${
                          v.result === "Passed"
                            ? "bg-[hsl(142,71%,45%/0.15)] text-[hsl(142,71%,45%)]"
                            : "bg-[hsl(0,72%,51%/0.15)] text-[hsl(0,72%,51%)]"
                        }`}
                      >
                        {v.result}
                      </span>
                      <span className="font-body text-[9px] text-muted-foreground">
                        {v.yesCount}Y / {v.noCount}N
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 font-body text-xs text-muted-foreground">
                      {v.billTitle}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`font-body text-xs font-semibold ${iconClass}`}>
                      {v.vote}
                    </span>
                    <p className="font-body text-[10px] text-muted-foreground">{v.date}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <p className="font-body text-[10px] text-muted-foreground/60 italic">
        Live data sourced from OpenStates.org. Showing {summary.session} Legislative Session roll call votes.
      </p>
    </div>
  );
};

/** Fallback mock scorecard for non-state legislators */
function MockScorecard({ politicianId, keyIssues, party, jurisdiction }: { politicianId: string; keyIssues: string[]; party: string; jurisdiction?: string }) {
  const record = getVotingRecord(politicianId, keyIssues, party);
  const sessionLabel = jurisdiction ? `${jurisdiction} Legislative Session` : "Current Session";
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">Voting Scorecard</h2>
        <span className="rounded-md bg-muted px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Estimated
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Overall Score" value={gradeFromScore(record.overallScore)} subvalue={`${record.overallScore}%`} color={gradeColor(gradeFromScore(record.overallScore))} />
        <StatCard label="Total Votes" value={String(record.totalVotes)} subvalue="this session" />
        <StatCard label="Attendance" value={`${record.attendance}%`} subvalue="vote participation" />
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 font-display text-sm font-bold text-headline">Issue Area Grades</h3>
        <div className="space-y-3">
          {record.issueGrades.map((ig, idx) => (
            <motion.div key={ig.issue} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04, duration: 0.3 }}>
              <div className="flex items-center justify-between">
                <span className="font-body text-sm text-secondary-custom">{ig.issue}</span>
                <div className="flex items-center gap-2">
                  <span className="font-body text-[10px] text-muted-foreground">{ig.votesFor}Y / {ig.votesAgainst}N{ig.votesAbstain > 0 ? ` / ${ig.votesAbstain}A` : ""}</span>
                  <span className="inline-flex h-7 w-9 items-center justify-center rounded-md font-display text-xs font-bold" style={{ backgroundColor: `${gradeColor(ig.grade)}20`, color: gradeColor(ig.grade) }}>{ig.grade}</span>
                </div>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: gradeColor(ig.grade) }} initial={{ width: 0 }} animate={{ width: `${ig.score}%` }} transition={{ delay: idx * 0.04 + 0.2, duration: 0.5, ease: "easeOut" }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 font-display text-sm font-bold text-headline">Key Votes — {sessionLabel}</h3>
        <div className="divide-y divide-border">
          {record.keyVotes.map((kv, idx) => {
            const VoteIcon = voteIcons[kv.vote].icon;
            const iconClass = voteIcons[kv.vote].className;
            return (
              <motion.div key={kv.billNumber} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03, duration: 0.3 }} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <VoteIcon className={`h-4 w-4 shrink-0 ${iconClass}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold text-headline">{kv.billNumber}</span>
                    <span className={`rounded px-1.5 py-0.5 font-body text-[9px] font-bold uppercase tracking-wider ${kv.result === "Passed" ? "bg-[hsl(142,71%,45%/0.15)] text-[hsl(142,71%,45%)]" : kv.result === "Failed" ? "bg-[hsl(0,72%,51%/0.15)] text-[hsl(0,72%,51%)]" : "bg-muted text-muted-foreground"}`}>{kv.result}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 font-body text-xs text-muted-foreground">{kv.title}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`font-body text-xs font-semibold ${iconClass}`}>{kv.vote}</span>
                  <p className="font-body text-[10px] text-muted-foreground">{kv.date}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      <p className="font-body text-[10px] text-muted-foreground/60 italic">
        Estimated scorecard based on legislative voting patterns. Live data sourced from OpenStates when available.
      </p>
    </div>
  );
}

function StatCard({ label, value, subvalue, color }: { label: string; value: string; subvalue: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-center">
      <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold" style={{ color: color || "hsl(var(--foreground))" }}>{value}</p>
      <p className="font-body text-[10px] text-muted-foreground">{subvalue}</p>
    </div>
  );
}

function Legend({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-body text-[10px] text-muted-foreground">{label}: {count}</span>
    </div>
  );
}

export default VotingScorecard;
