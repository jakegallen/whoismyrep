import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Loader2 } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import CategoryTabs from "@/components/CategoryTabs";
import NewsCard from "@/components/NewsCard";
import TrendingSidebar from "@/components/TrendingSidebar";
import NewsCharts from "@/components/NewsCharts";
import { useNevadaNews } from "@/hooks/useNevadaNews";
import type { NewsCategory } from "@/lib/mockNews";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<NewsCategory | "all">("all");
  const { news, trending, trendingIndividuals, isLoading, error, refetch, lastUpdated } = useNevadaNews();

  const filtered =
    activeCategory === "all"
      ? news
      : news.filter((n) => n.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <CategoryTabs active={activeCategory} onChange={setActiveCategory} />

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="font-body text-xs text-tertiary">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            {error && (
              <span className="font-body text-xs text-primary">
                Using cached data
              </span>
            )}
            <button
              onClick={refetch}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-2 font-body text-xs font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </button>
          </div>
        </div>

        {/* Analytics charts */}
        {!isLoading && news.length > 0 && <NewsCharts news={news} />}

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {isLoading && news.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-border bg-card p-5"
                >
                  <div className="mb-3 h-4 w-20 rounded bg-muted" />
                  <div className="mb-2 h-6 w-3/4 rounded bg-muted" />
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="mt-2 h-4 w-2/3 rounded bg-muted" />
                </div>
              ))
            ) : (
              filtered.map((item, i) => (
                <NewsCard key={item.id} item={item} index={i} />
              ))
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="col-span-full flex items-center justify-center py-20">
                <p className="font-body text-muted-foreground">
                  No stories in this category right now.
                </p>
              </div>
            )}
          </motion.div>

          <div className="hidden lg:block">
            <div className="sticky top-8">
              <TrendingSidebar topics={trending} individuals={trendingIndividuals} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
