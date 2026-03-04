import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogIn, LogOut, Heart, Calendar, Trophy, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import { XPBar } from "./XPBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useSavedReps } from "@/hooks/useSavedReps";
import { useSavedBills } from "@/hooks/useSavedBills";
import { useHomeState } from "@/hooks/useHomeState";

const navLinks = [
  { to: "/#states", label: "States" },
  { to: "/politicians", label: "Politicians" },
  { to: "/bills", label: "Bills" },
  { to: "/district-map", label: "Map" },
  { to: "/congress-trades", label: "Stock Tracker" },
  { to: "/committees", label: "Committees" },
  { to: "/lobbying", label: "Lobbying" },
  { to: "/federal-register", label: "Fed Register" },
];

export default function SiteNav() {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { count: savedRepCount } = useSavedReps();
  const { count: savedBillCount } = useSavedBills();
  const totalSavedCount = savedRepCount + savedBillCount;
  const { homeState, homeDistrict } = useHomeState();
  const { pathname } = useLocation();
  const isActive = (to: string) =>
    to === "/#states" ? pathname === "/" : pathname.startsWith(to);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
          <img src="/logo.png" alt="WhoIsMyRep.us logo" className="h-8 w-8 rounded-lg" />
          <span className="font-display text-lg font-bold text-headline">
            WhoIsMyRep
            <span className="text-gradient-brand">.us</span>
          </span>
        </Link>

        {/* Desktop nav */}
        {!isMobile && (
          <div className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive(link.to) ? "page" : undefined}
                className={`rounded-lg px-3 py-2 font-body text-sm font-medium transition-colors hover:bg-surface-hover hover:text-foreground ${
                  isActive(link.to)
                    ? "bg-surface-hover text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/saved"
              className={`relative flex items-center gap-1 rounded-lg px-3 py-2 font-body text-sm font-medium transition-colors hover:bg-surface-hover hover:text-foreground ${
                isActive("/saved")
                  ? "bg-surface-hover text-foreground"
                  : "text-muted-foreground"
              }`}
              aria-label={`Saved items${totalSavedCount > 0 ? ` (${totalSavedCount})` : ""}`}
            >
              <Heart className="h-4 w-4" fill={totalSavedCount > 0 ? "currentColor" : "none"} />
              {homeState && (
                <span className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[9px] font-bold text-primary">
                  {homeState}{homeDistrict ? `-${homeDistrict}` : ""}
                </span>
              )}
              {totalSavedCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-bold text-white">
                  {totalSavedCount > 99 ? "99+" : totalSavedCount}
                </span>
              )}
            </Link>
            <XPBar />
            <div className="ml-1">
              <ThemeToggle />
            </div>
            {user ? (
              <button
                onClick={() => signOut()}
                className="ml-1 flex items-center gap-1.5 rounded-lg px-3 py-2 font-body text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            ) : (
              <Link
                to="/auth"
                className="ml-1 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 font-body text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            )}
          </div>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <div className="flex items-center gap-1">
            <XPBar />
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        )}
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {isMobile && menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border bg-background"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive(link.to) ? "page" : undefined}
                  className={`rounded-lg px-3 py-2.5 font-body text-sm font-medium transition-colors hover:bg-surface-hover hover:text-foreground ${
                    isActive(link.to)
                      ? "bg-surface-hover text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user && (
                <>
                  <Link
                    to="/today"
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive("/today") ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 font-body text-sm font-medium transition-colors hover:bg-surface-hover hover:text-foreground ${
                      isActive("/today")
                        ? "bg-surface-hover text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                    Today
                  </Link>
                  <Link
                    to="/achievements"
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive("/achievements") ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 font-body text-sm font-medium transition-colors hover:bg-surface-hover hover:text-foreground ${
                      isActive("/achievements")
                        ? "bg-surface-hover text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Trophy className="h-4 w-4" />
                    Achievements
                  </Link>
                  <Link
                    to="/leaderboard"
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive("/leaderboard") ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 font-body text-sm font-medium transition-colors hover:bg-surface-hover hover:text-foreground ${
                      isActive("/leaderboard")
                        ? "bg-surface-hover text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Crown className="h-4 w-4" />
                    Leaderboard
                  </Link>
                </>
              )}
              <Link
                to="/saved"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 font-body text-sm font-medium transition-colors hover:bg-surface-hover hover:text-foreground ${
                  isActive("/saved")
                    ? "bg-surface-hover text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <Heart className="h-4 w-4" fill={totalSavedCount > 0 ? "currentColor" : "none"} />
                Saved{totalSavedCount > 0 ? ` (${totalSavedCount})` : ""}

                {homeState && (
                  <span className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[9px] font-bold text-primary">
                    {homeState}{homeDistrict ? `-${homeDistrict}` : ""}
                  </span>
                )}
              </Link>
              {user ? (
                <button
                  onClick={() => { signOut(); setMenuOpen(false); }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 font-body text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 font-body text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
