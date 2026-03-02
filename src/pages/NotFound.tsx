import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPinOff, Home, Search, Building, Newspaper } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const suggestions = [
  { label: "Home", to: "/", icon: Home },
  { label: "Find Your Rep", to: "/", icon: Search },
  { label: "Congress Explorer", to: "/congress", icon: Building },
  { label: "News", to: "/news", icon: Newspaper },
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    document.title = "Page Not Found — WhoIsMyRep.us";
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Page Not Found" description="The page you're looking for doesn't exist." />
      <SiteNav />

      <main id="main-content" className="container mx-auto flex flex-col items-center justify-center px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10"
        >
          <MapPinOff className="h-10 w-10 text-primary" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-display text-6xl font-bold tracking-tight text-headline"
        >
          404
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-3 max-w-md font-body text-lg text-muted-foreground"
        >
          The page <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground">{location.pathname}</code> doesn't exist.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          {suggestions.map((s) => {
            const Icon = s.icon;
            return (
              <Button key={s.to + s.label} variant="outline" size="sm" asChild>
                <Link to={s.to} className="gap-1.5">
                  <Icon className="h-4 w-4" />
                  {s.label}
                </Link>
              </Button>
            );
          })}
        </motion.div>
      </main>
    </div>
  );
};

export default NotFound;
