import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * On SPA route changes, moves focus to #main-content (or <main>)
 * so screen-reader users aren't stranded at the top of the DOM tree.
 */
export function useFocusOnNavigate() {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the initial page load — browser handles focus on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Small delay lets the new page content render first
    const timer = setTimeout(() => {
      const main =
        document.getElementById("main-content") ||
        document.querySelector("main");
      if (main) {
        // tabindex="-1" allows programmatic focus without making it tabbable
        if (!main.hasAttribute("tabindex")) {
          main.setAttribute("tabindex", "-1");
        }
        main.focus({ preventScroll: false });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname]);
}
