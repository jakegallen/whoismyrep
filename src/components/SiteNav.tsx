import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function SiteNav() {
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
        <ThemeToggle />
      </div>
    </nav>
  );
}
