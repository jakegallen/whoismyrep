import { motion } from "framer-motion";
import { BarChart3, CheckCircle2, XCircle, MinusCircle, Clock } from "lucide-react";
import { getVotingRecord, gradeColor, gradeFromScore, type VotingRecord, type KeyVote } from "@/lib/votingRecords";

interface VotingScorecardProps {
  politicianId: string;
  keyIssues: string[];
  party: string;
}

const voteIcons: Record<KeyVote["vote"], { icon: typeof CheckCircle2; className: string }> = {
  Yes: { icon: CheckCircle2, className: "text-[hsl(142,71%,45%)]" },
  No: { icon: XCircle, className: "text-[hsl(0,72%,51%)]" },
  Abstain: { icon: MinusCircle, className: "text-[hsl(43,90%,55%)]" },
  "Not Voting": { icon: Clock, className: "text-muted-foreground" },
};

const VotingScorecard = ({ politicianId, keyIssues, party }: VotingScorecardProps) => {
  const record = getVotingRecord(politicianId, keyIssues, party);

  return (
    <div className="space-y-6">
      {/* Header with overall score */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-headline">
          Voting Scorecard
        </h2>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Overall Score"
          value={gradeFromScore(record.overallScore)}
          subvalue={`${record.overallScore}%`}
          color={gradeColor(gradeFromScore(record.overallScore))}
        />
        <StatCard
          label="Total Votes"
          value={String(record.totalVotes)}
          subvalue="this session"
        />
        <StatCard
          label="Attendance"
          value={`${record.attendance}%`}
          subvalue="vote participation"
        />
      </div>

      {/* Issue grades */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 font-display text-sm font-bold text-headline">
          Issue Area Grades
        </h3>
        <div className="space-y-3">
          {record.issueGrades.map((ig, idx) => (
            <motion.div
              key={ig.issue}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3 }}
              className="group"
            >
              <div className="flex items-center justify-between">
                <span className="font-body text-sm text-secondary-custom">{ig.issue}</span>
                <div className="flex items-center gap-2">
                  <span className="font-body text-[10px] text-muted-foreground">
                    {ig.votesFor}Y / {ig.votesAgainst}N
                    {ig.votesAbstain > 0 ? ` / ${ig.votesAbstain}A` : ""}
                  </span>
                  <span
                    className="inline-flex h-7 w-9 items-center justify-center rounded-md font-display text-xs font-bold"
                    style={{
                      backgroundColor: `${gradeColor(ig.grade)}20`,
                      color: gradeColor(ig.grade),
                    }}
                  >
                    {ig.grade}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: gradeColor(ig.grade) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${ig.score}%` }}
                  transition={{ delay: idx * 0.04 + 0.2, duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Key votes */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 font-display text-sm font-bold text-headline">
          Key Votes — 83rd Session
        </h3>
        <div className="divide-y divide-border">
          {record.keyVotes.map((kv, idx) => {
            const VoteIcon = voteIcons[kv.vote].icon;
            const iconClass = voteIcons[kv.vote].className;
            return (
              <motion.div
                key={kv.billNumber}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03, duration: 0.3 }}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <VoteIcon className={`h-4 w-4 shrink-0 ${iconClass}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold text-headline">
                      {kv.billNumber}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-body text-[9px] font-bold uppercase tracking-wider ${
                        kv.result === "Passed"
                          ? "bg-[hsl(142,71%,45%/0.15)] text-[hsl(142,71%,45%)]"
                          : kv.result === "Failed"
                          ? "bg-[hsl(0,72%,51%/0.15)] text-[hsl(0,72%,51%)]"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {kv.result}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 font-body text-xs text-muted-foreground">
                    {kv.title}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`font-body text-xs font-semibold ${iconClass}`}>
                    {kv.vote}
                  </span>
                  <p className="font-body text-[10px] text-muted-foreground">{kv.date}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <p className="font-body text-[10px] text-muted-foreground/60 italic">
        Scorecard data is illustrative and based on 83rd Session (2025) voting patterns. Grades reflect alignment with issue-area legislation.
      </p>
    </div>
  );
};

function StatCard({
  label,
  value,
  subvalue,
  color,
}: {
  label: string;
  value: string;
  subvalue: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-center">
      <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className="mt-1 font-display text-2xl font-bold"
        style={{ color: color || "hsl(var(--foreground))" }}
      >
        {value}
      </p>
      <p className="font-body text-[10px] text-muted-foreground">{subvalue}</p>
    </div>
  );
}

export default VotingScorecard;
