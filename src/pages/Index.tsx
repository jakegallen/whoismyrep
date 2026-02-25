import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Loader2 } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import CategoryTabs from "@/components/CategoryTabs";
import type { TabKey } from "@/components/CategoryTabs";
import NewsCard from "@/components/NewsCard";
import PodcastCard from "@/components/PodcastCard";
import TrendingSidebar from "@/components/TrendingSidebar";
import NewsCharts from "@/components/NewsCharts";
import { useNevadaNews } from "@/hooks/useNevadaNews";
import { usePodcasts } from "@/hooks/usePodcasts";
import type { NewsCategory } from "@/lib/mockNews";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<TabKey>("all");
  const { news, trending, trendingIndividuals, isLoading, error, refetch, lastUpdated } = useNevadaNews();
  const { episodes, isLoading: podcastsLoading, refetch: refetchPodcasts } = usePodcasts();

  const isPodcastTab = activeCategory === "podcasts";

  const filtered = isPodcastTab
    ? []
    : activeCategory === "all"
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
              onClick={() => { refetch(); refetchPodcasts(); }}
              disabled={isLoading || podcastsLoading}
              className="flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-2 font-body text-xs font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              {(isLoading || podcastsLoading) ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </button>
          </div>
        </div>

        {/* Analytics charts */}
        {!isLoading && !isPodcastTab && news.length > 0 && <NewsCharts news={news} />}

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className={`grid gap-4 ${isPodcastTab ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}
          >
            {isPodcastTab ? (
              <>
                {podcastsLoading && episodes.length === 0 ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-xl border border-border bg-card p-5"
                    >
                      <div className="flex gap-4">
                        <div className="h-16 w-16 rounded-lg bg-muted" />
                        <div className="flex-1">
                          <div className="mb-2 h-4 w-24 rounded bg-muted" />
                          <div className="mb-2 h-5 w-3/4 rounded bg-muted" />
                          <div className="h-4 w-full rounded bg-muted" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  episodes.map((ep, i) => (
                    <PodcastCard key={ep.id} episode={ep} index={i} />
                  ))
                )}
                {!podcastsLoading && episodes.length === 0 && (
                  <div className="col-span-full flex items-center justify-center py-20">
                    <p className="font-body text-muted-foreground">
                      No podcast episodes available right now.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
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
              </>
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
