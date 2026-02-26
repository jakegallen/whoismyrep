import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Newspaper, Users, FileText, MapPin, Flag, Building2, DollarSign,
  Menu, X, ChevronDown, Home, CalendarDays, Map as MapIcon, Landmark,
  Scale, Building, Briefcase, Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

const navGroups = [
  {
    label: "Home",
    items: [
      { to: "/", icon: Home, label: "News Dashboard" },
      { to: "/politicians", icon: Users, label: "Politicians" },
      { to: "/midterms", icon: Flag, label: "2026 Midterms" },
    ],
  },
  {
    label: "Legislation",
    items: [
      { to: "/bills", icon: FileText, label: "Bills" },
      { to: "/calendar", icon: CalendarDays, label: "Calendar" },
      { to: "/committees", icon: Building2, label: "Committees" },
      { to: "/congress", icon: Building, label: "Congress" },
    ],
  },
  {
    label: "Finance & Oversight",
    items: [
      { to: "/campaign-finance", icon: DollarSign, label: "Campaign Finance" },
      { to: "/lobbying", icon: Briefcase, label: "Lobbying" },
      { to: "/court-cases", icon: Scale, label: "Court Cases" },
    ],
  },
  {
    label: "Maps & Data",
    items: [
      { to: "/district-lookup", icon: MapPin, label: "Find My Reps" },
      { to: "/district-map", icon: MapIcon, label: "District Map" },
      { to: "/federal-register", icon: Landmark, label: "Federal Register" },
    ],
  },
];

const DashboardHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [address, setAddress] = useState("");
  const navigate = useNavigate();
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

            {/* Desktop dropdown */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => navigate("/search")}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                aria-label="Search everything"
              >
                <Search className="h-4 w-4" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-body text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                  Explore
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50 w-52 bg-popover">
                  {navGroups.map((group, gi) => (
                    <div key={group.label}>
                      {gi > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </DropdownMenuLabel>
                      {group.items.map((link) => (
                        <DropdownMenuItem
                          key={link.to}
                          onClick={() => navigate(link.to)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <link.icon className="h-4 w-4 text-muted-foreground" />
                          {link.label}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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

          {/* Mobile nav */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden md:hidden"
              >
                <div className="flex flex-col gap-1 pt-2">
                  {navGroups.map((group, gi) => (
                    <div key={group.label} className={gi > 0 ? "mt-3" : ""}>
                      <p className="mb-1 px-4 font-display text-[10px] uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </p>
                      {group.items.map((link) => (
                        <Link
                          key={link.to}
                          to={link.to}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-4 py-2.5 font-body text-sm font-medium bg-surface-elevated text-foreground hover:bg-surface-hover transition-colors"
                        >
                          <link.icon className="h-4 w-4 text-muted-foreground" />
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-4">
            <p className="font-body text-sm text-secondary-custom">{today}</p>
            <span className="text-tertiary">•</span>
            <p className="font-body text-sm text-secondary-custom">
              U.S. Political News
            </p>
          </div>
          <p className="mt-1 max-w-2xl font-body text-sm text-tertiary">
            Real-time aggregation of political news, legislation, policy changes, and social media discourse across the United States.
          </p>

          {/* Address autocomplete for quick rep lookup */}
          <div className="mt-4 flex max-w-xl gap-2">
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              onSelect={(addr) => navigate(`/district-lookup?address=${encodeURIComponent(addr)}`)}
              placeholder="Find your reps — enter your address"
            />
            <Button
              size="sm"
              onClick={() => {
                if (address.trim()) {
                  navigate(`/district-lookup?address=${encodeURIComponent(address)}`);
                }
              }}
              disabled={!address.trim()}
            >
              <MapPin className="mr-1.5 h-4 w-4" />
              Find Reps
            </Button>
          </div>
        </motion.div>
      </div>
    </header>
  );
};

export default DashboardHeader;
