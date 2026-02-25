import type { NewsCategory } from "@/lib/mockNews";

const badgeStyles: Record<NewsCategory, string> = {
  law: "bg-[hsl(var(--badge-law)/0.15)] text-[hsl(var(--badge-law))]",
  policy: "bg-[hsl(var(--badge-policy)/0.15)] text-[hsl(var(--badge-policy))]",
  politician: "bg-[hsl(var(--badge-politician)/0.15)] text-[hsl(var(--badge-politician))]",
  social: "bg-[hsl(var(--badge-social)/0.15)] text-[hsl(var(--badge-social))]",
};

const labels: Record<NewsCategory, string> = {
  law: "Law",
  policy: "Policy",
  politician: "Politician",
  social: "Social",
};

const CategoryBadge = ({ category }: { category: NewsCategory }) => {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-0.5 font-body text-xs font-semibold ${badgeStyles[category]}`}
    >
      {labels[category]}
    </span>
  );
};

export default CategoryBadge;
