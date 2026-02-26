import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { to: "/#states", label: "States" },
  { to: "/bills", label: "Bills" },
  { to: "/district-map", label: "Map" },
];

export default function SiteNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="WhoIsMyRep.us logo" className="h-8 w-8 rounded-lg" />
          <span className="font-display text-lg font-bold text-headline">
            WhoIsMyRep
            <span className="text-gradient-brand">.us</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg px-3 py-2 font-body text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <div className="ml-1">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
