import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Menu,
  X,
  FileText,
  Scale,
  Briefcase,
  Landmark,
  Newspaper,
  MapPin,
  DollarSign,
  CalendarDays,
  Building2,
  Building,
  Flag,
  Users,
  ChevronDown,
  Map as MapIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

const exploreGroups = [
  {
    label: "Legislation",
    items: [
      { to: "/bills", icon: FileText, label: "Bills" },
      { to: "/calendar", icon: CalendarDays, label: "Calendar" },
      { to: "/committees", icon: Building2, label: "Committees" },
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
      { to: "/news", icon: Newspaper, label: "News" },
    ],
  },
  {
    label: "Elections",
    items: [
      { to: "/midterms", icon: Flag, label: "2026 Midterms" },
      { to: "/politicians", icon: Users, label: "All Politicians" },
    ],
  },
];

export default function SiteNav() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-lg font-bold text-headline">
            WhoIsMyRep
            <span className="text-gradient-brand">.ai</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-body text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
              Explore
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50 w-52 bg-popover">
              {exploreGroups.map((group, gi) => (
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
          className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-hover"
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
            className="overflow-hidden border-t border-border md:hidden bg-background"
          >
            <div className="container mx-auto flex flex-col gap-1 px-4 py-3">
              {exploreGroups.map((group, gi) => (
                <div key={group.label} className={gi > 0 ? "mt-2" : ""}>
                  <p className="mb-1 px-3 font-display text-[10px] uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  {group.items.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm text-foreground hover:bg-surface-hover"
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
    </nav>
  );
}
