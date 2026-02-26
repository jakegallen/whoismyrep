import { motion } from "framer-motion";
import {
  ClipboardCheck,
  CalendarClock,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface Deadline {
  date: string;
  label: string;
  description: string;
  urgent?: boolean;
  passed?: boolean;
}

const deadlines: Deadline[] = [
  {
    date: "Ongoing",
    label: "Online Registration",
    description: "Register or update your registration anytime at RegisterToVoteNV.gov.",
  },
  {
    date: "Oct 7, 2026",
    label: "Mail Registration Deadline",
    description: "Last day to register by mail or online for the 2026 General Election.",
    urgent: true,
  },
  {
    date: "Oct 20, 2026",
    label: "Early Voting Begins",
    description: "Early in-person voting opens statewide for the General Election.",
  },
  {
    date: "Nov 3, 2026",
    label: "Election Day",
    description: "Polls open 7 AM – 7 PM. Same-day registration available at polling places.",
    urgent: true,
  },
  {
    date: "Jun 9, 2026",
    label: "Primary Election",
    description: "Nevada primary election for federal, state, and local races.",
  },
  {
    date: "May 19, 2026",
    label: "Primary Registration Deadline",
    description: "Last day to register by mail or online for the 2026 Primary Election.",
  },
];

const quickLinks = [
  {
    label: "Register to Vote",
    href: "https://www.registertovotenv.gov",
    description: "Online voter registration portal",
  },
  {
    label: "Check Registration",
    href: "https://www.nvsos.gov/votersearch/",
    description: "Verify your voter registration status",
  },
  {
    label: "Find Polling Place",
    href: "https://www.nvsos.gov/electionresources/",
    description: "Locate your polling place or drop-off site",
  },
  {
    label: "Sample Ballot",
    href: "https://www.nvsos.gov/votersearch/",
    description: "Preview your ballot before Election Day",
  },
];

const VoterRegistration = () => {
  // Sort deadlines chronologically, ongoing first
  const sorted = [...deadlines].sort((a, b) => {
    if (a.date === "Ongoing") return -1;
    if (b.date === "Ongoing") return 1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <ClipboardCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-base font-bold text-headline">
            Voter Registration
          </h3>
          <p className="font-body text-xs text-secondary-custom">
            Nevada 2026 Election Deadlines & Resources
          </p>
        </div>
      </div>

      {/* Key Dates */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-1.5 mb-1">
          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Key Dates
          </span>
        </div>
        {sorted.map((d, i) => (
          <motion.div
            key={d.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
            className={`flex items-start gap-2.5 rounded-lg px-3 py-2 ${
              d.urgent
                ? "border border-primary/20 bg-primary/5"
                : "bg-surface-elevated"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {d.passed ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
              ) : d.urgent ? (
                <AlertTriangle className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-body text-xs font-semibold text-headline">
                  {d.label}
                </span>
                <span className="font-body text-[10px] text-muted-foreground">
                  {d.date}
                </span>
              </div>
              <p className="font-body text-[11px] leading-snug text-secondary-custom">
                {d.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="space-y-1.5">
        <span className="font-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Links
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {quickLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-lg bg-surface-elevated px-3 py-2 transition-colors hover:bg-surface-hover"
            >
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary" />
              <div className="min-w-0">
                <p className="truncate font-body text-xs font-medium text-headline group-hover:text-primary">
                  {link.label}
                </p>
                <p className="truncate font-body text-[10px] text-muted-foreground">
                  {link.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="mt-3 font-body text-[10px] italic text-muted-foreground/60">
        Data from{" "}
        <a
          href="https://www.nvsos.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Nevada Secretary of State
        </a>
        . Dates subject to change.
      </p>
    </motion.section>
  );
};

export default VoterRegistration;
