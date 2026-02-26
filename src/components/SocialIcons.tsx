import { ExternalLink } from "lucide-react";

const SOCIAL_PLATFORMS: Record<string, { icon: string; urlPrefix: string; color: string; label: string }> = {
  x: { icon: "𝕏", urlPrefix: "https://x.com/", color: "hsl(0,0%,80%)", label: "X" },
  facebook: { icon: "f", urlPrefix: "https://facebook.com/", color: "hsl(210,80%,55%)", label: "Facebook" },
  instagram: { icon: "📷", urlPrefix: "https://instagram.com/", color: "hsl(330,70%,55%)", label: "Instagram" },
  youtube: { icon: "▶", urlPrefix: "https://youtube.com/@", color: "hsl(0,72%,51%)", label: "YouTube" },
  tiktok: { icon: "♪", urlPrefix: "https://tiktok.com/@", color: "hsl(340,82%,52%)", label: "TikTok" },
};

/** If value is already a full URL, return it; otherwise prefix it */
function buildUrl(urlPrefix: string, value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${urlPrefix}${value}`;
}

/** Extract a display handle from a value that might be a full URL */
function extractHandle(key: string, value: string): string {
  if (!value.startsWith("http")) return value;
  try {
    const url = new URL(value);
    const path = url.pathname.replace(/^\/+|\/+$/g, "").replace(/^@/, "");
    return path || value;
  } catch {
    return value;
  }
}

interface SocialIconsProps {
  socialHandles?: Record<string, string>;
  /** "sm" = tiny inline icons (for cards), "md" = labeled pills (for profiles) */
  size?: "sm" | "md";
  className?: string;
}

export function SocialIcons({ socialHandles, size = "md", className = "" }: SocialIconsProps) {
  if (!socialHandles || Object.keys(socialHandles).length === 0) return null;

  const platforms = Object.entries(socialHandles)
    .filter(([key, value]) => value && SOCIAL_PLATFORMS[key])
    .map(([key, value]) => ({ key, value, ...SOCIAL_PLATFORMS[key] }));

  if (platforms.length === 0) return null;

  if (size === "sm") {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {platforms.map((p) => (
          <a
            key={p.key}
            href={buildUrl(p.urlPrefix, p.value)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={`${p.label}: @${extractHandle(p.key, p.value)}`}
            className="flex h-5 w-5 items-center justify-center rounded text-[10px] transition-colors hover:bg-surface-elevated"
            style={{ color: p.color }}
          >
            {p.icon}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {platforms.map((p) => {
        const handle = extractHandle(p.key, p.value);
        return (
          <a
            key={p.key}
            href={buildUrl(p.urlPrefix, p.value)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-md bg-surface-elevated px-2.5 py-1.5 font-body text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <span style={{ color: p.color }}>{p.icon}</span>
            <span>{p.key === "x" ? `@${handle}` : p.label}</span>
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
        );
      })}
    </div>
  );
}
