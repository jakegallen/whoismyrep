import { ExternalLink } from "lucide-react";

// Inline SVG brand icons — no external dependencies
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.733-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.85a8.28 8.28 0 004.84 1.55V6.95a4.85 4.85 0 01-1.07-.26z" />
  </svg>
);

type IconComponent = ({ className }: { className?: string }) => JSX.Element;

const SOCIAL_PLATFORMS: Record<string, { Icon: IconComponent; urlPrefix: string; color: string; label: string }> = {
  x:         { Icon: XIcon,         urlPrefix: "https://x.com/",           color: "hsl(0,0%,85%)",      label: "X" },
  facebook:  { Icon: FacebookIcon,  urlPrefix: "https://facebook.com/",    color: "hsl(214,89%,52%)",   label: "Facebook" },
  instagram: { Icon: InstagramIcon, urlPrefix: "https://instagram.com/",   color: "hsl(330,70%,55%)",   label: "Instagram" },
  youtube:   { Icon: YouTubeIcon,   urlPrefix: "https://youtube.com/@",    color: "hsl(0,72%,51%)",     label: "YouTube" },
  tiktok:    { Icon: TikTokIcon,    urlPrefix: "https://tiktok.com/@",     color: "hsl(180,100%,40%)",  label: "TikTok" },
};

/** If value is already a full URL, return it; otherwise prefix it */
function buildUrl(urlPrefix: string, value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${urlPrefix}${value}`;
}

/** Extract a display handle from a value that might be a full URL */
function extractHandle(value: string): string {
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
        {platforms.map((p) => {
          const { Icon } = p;
          return (
            <a
              key={p.key}
              href={buildUrl(p.urlPrefix, p.value)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={`${p.label}: @${extractHandle(p.value)}`}
              className="flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-surface-elevated"
              style={{ color: p.color }}
            >
              <Icon className="h-3.5 w-3.5" />
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {platforms.map((p) => {
        const { Icon } = p;
        const handle = extractHandle(p.value);
        return (
          <a
            key={p.key}
            href={buildUrl(p.urlPrefix, p.value)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-md bg-surface-elevated px-2.5 py-1.5 font-body text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: p.color } as React.CSSProperties} />
            <span>{p.key === "x" ? `@${handle}` : p.label}</span>
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
        );
      })}
    </div>
  );
}
