import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Fires a Plausible-compatible page-view event on every route change.
 *
 * Plausible auto-tracks <script data-api ...> page loads, but for a
 * React SPA we also need to push virtual page-views when the route
 * changes client-side.
 *
 * This hook calls `window.plausible()` if present (noop otherwise).
 */
export function usePageView() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Plausible injects `window.plausible` — skip if blocked / not loaded
    const plausible = (window as any).plausible;
    if (typeof plausible === "function") {
      plausible("pageview");
    }
  }, [pathname]);
}
