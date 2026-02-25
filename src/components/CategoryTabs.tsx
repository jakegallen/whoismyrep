import { motion } from "framer-motion";
import { Scale, Landmark, Users, MessageCircle, LayoutGrid } from "lucide-react";
import type { NewsCategory } from "@/lib/mockNews";

interface CategoryTabsProps {
  active: NewsCategory | "all";
  onChange: (cat: NewsCategory | "all") => void;
}

const tabs: { key: NewsCategory | "all"; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "All News", icon: LayoutGrid },
  { key: "law", label: "Laws", icon: Scale },
  { key: "policy", label: "Policy", icon: Landmark },
  { key: "politician", label: "Politicians", icon: Users },
  { key: "social", label: "Social Media", icon: MessageCircle },
];

const CategoryTabs = ({ active, onChange }: CategoryTabsProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 font-body text-sm font-medium transition-colors ${
              isActive
                ? "text-primary-foreground"
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-lg bg-primary"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
