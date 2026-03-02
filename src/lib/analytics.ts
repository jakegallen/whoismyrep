/**
 * Plausible custom event tracking.
 *
 * Wraps `window.plausible()` so callers don't need to worry about
 * the script being blocked or not yet loaded.
 *
 * Usage:
 *   trackEvent("Search", { query: "Nancy Pelosi" });
 *   trackEvent("View Politician", { name: "Nancy Pelosi", party: "Democrat" });
 */

interface PlausibleFn {
  (event: string, options?: { props?: Record<string, string | number | boolean> }): void;
  q?: unknown[];
}

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

/**
 * Fire a custom Plausible event. Silent no-op if Plausible isn't loaded.
 *
 * @param event - Event name (e.g. "Search", "View Politician")
 * @param props - Optional key-value metadata
 */
export function trackEvent(
  event: string,
  props?: Record<string, string | number | boolean>,
) {
  try {
    if (typeof window.plausible === "function") {
      window.plausible(event, props ? { props } : undefined);
    }
  } catch {
    // Never let analytics crash the app
  }
}
