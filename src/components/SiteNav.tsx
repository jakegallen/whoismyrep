import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

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
        <ThemeToggle />
      </div>
    </nav>
  );
}
