import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Newspaper, Users, FileText, MapPin, Flag, ArrowLeftRight } from "lucide-react";

const DashboardHeader = () => {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="gradient-hero border-b border-border">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Newspaper className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-headline md:text-4xl">
                Nevada Political Pulse
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/bills"
                className="flex items-center gap-2 rounded-lg bg-surface-elevated px-4 py-2.5 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Bills</span>
              </Link>
              <Link
                to="/politicians"
                className="flex items-center gap-2 rounded-lg bg-surface-elevated px-4 py-2.5 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Politicians</span>
              </Link>
              <Link
                to="/compare"
                className="flex items-center gap-2 rounded-lg bg-surface-elevated px-4 py-2.5 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span className="hidden sm:inline">Compare</span>
              </Link>
              <Link
                to="/midterms"
                className="flex items-center gap-2 rounded-lg bg-surface-elevated px-4 py-2.5 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                <Flag className="h-4 w-4" />
                <span className="hidden sm:inline">2026 Midterms</span>
              </Link>
              <Link
                to="/district-lookup"
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-body text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Find My Reps</span>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="font-body text-sm text-secondary-custom">{today}</p>
            <span className="text-tertiary">•</span>
            <p className="font-body text-sm text-secondary-custom">
              Las Vegas & State of Nevada
            </p>
          </div>
          <p className="mt-1 max-w-2xl font-body text-sm text-tertiary">
            Real-time aggregation of political news, legislation, policy changes, and social media discourse across Nevada.
          </p>
        </motion.div>
      </div>
    </header>
  );
};

export default DashboardHeader;
