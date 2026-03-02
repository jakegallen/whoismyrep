/**
 * Accessible skip-to-content link.
 * Visually hidden until focused via keyboard (Tab).
 */
export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="fixed left-2 top-2 z-[9999] -translate-y-full rounded-md bg-primary px-4 py-2 font-body text-sm font-semibold text-primary-foreground shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Skip to main content
    </a>
  );
}
