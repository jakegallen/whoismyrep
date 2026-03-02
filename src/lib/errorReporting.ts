/**
 * Lightweight error-reporting bridge.
 *
 * Right now errors go to `console.error`.  To wire up Sentry / LogRocket /
 * any remote service, update the `reporters` array below — every other call
 * site stays untouched.
 */

export interface ErrorReport {
  error: Error;
  /** Where the error was caught: "boundary", "global", "promise", "manual" */
  source: string;
  /** Extra context (component stack, URL, etc.) */
  context?: string;
}

type Reporter = (report: ErrorReport) => void;

// ── Reporters ──────────────────────────────────────────────
// Add your remote reporters here; the console reporter ships by default.

const reporters: Reporter[] = [
  // 1️⃣  Console (always on)
  ({ error, source, context }) => {
    console.error(`[${source}]`, error, context ?? "");
  },

  // 2️⃣  Example Sentry (uncomment when ready):
  // ({ error, source, context }) => {
  //   Sentry.captureException(error, { tags: { source }, extra: { context } });
  // },
];

// ── Public API ─────────────────────────────────────────────

export function reportError(report: ErrorReport) {
  for (const r of reporters) {
    try {
      r(report);
    } catch {
      // Never let a reporter crash the app
    }
  }
}

// ── Global listeners (call once at app boot) ───────────────

let installed = false;

export function installGlobalErrorHandlers() {
  if (installed) return;
  installed = true;

  window.addEventListener("error", (event) => {
    reportError({
      error: event.error ?? new Error(event.message),
      source: "global",
      context: `${event.filename}:${event.lineno}:${event.colno}`,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const err =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
    reportError({ error: err, source: "promise" });
  });
}
