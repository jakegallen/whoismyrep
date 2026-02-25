import { useState } from "react";
import { motion } from "framer-motion";
import DashboardHeader from "@/components/DashboardHeader";
import CategoryTabs from "@/components/CategoryTabs";
import NewsCard from "@/components/NewsCard";
import TrendingSidebar from "@/components/TrendingSidebar";
import { mockNews, type NewsCategory } from "@/lib/mockNews";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<NewsCategory | "all">("all");

  const filtered =
    activeCategory === "all"
      ? mockNews
      : mockNews.filter((n) => n.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <CategoryTabs active={activeCategory} onChange={setActiveCategory} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* News Feed */}
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {filtered.map((item, i) => (
              <NewsCard key={item.id} item={item} index={i} />
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full flex items-center justify-center py-20">
                <p className="font-body text-muted-foreground">
                  No stories in this category right now.
                </p>
              </div>
            )}
          </motion.div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-8">
              <TrendingSidebar />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
