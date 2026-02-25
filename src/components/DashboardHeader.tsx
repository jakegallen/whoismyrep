import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, Users, FileText, MapPin, Flag, Menu, X } from "lucide-react";

const navLinks = [
  { to: "/bills", icon: FileText, label: "Bills" },
  { to: "/politicians", icon: Users, label: "Politicians" },
  { to: "/midterms", icon: Flag, label: "2026 Midterms" },
  { to: "/district-lookup", icon: MapPin, label: "Find My Reps", primary: true },
];

const DashboardHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
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

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 font-body text-sm font-medium transition-colors ${
                    link.primary
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-surface-elevated text-foreground hover:bg-surface-hover"
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex md:hidden h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated text-foreground transition-colors hover:bg-surface-hover"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile nav dropdown */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden md:hidden"
              >
                <div className="flex flex-col gap-2 pt-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 font-body text-sm font-medium transition-colors ${
                        link.primary
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-surface-elevated text-foreground hover:bg-surface-hover"
                      }`}
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
