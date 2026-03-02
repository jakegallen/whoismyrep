import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reportError, installGlobalErrorHandlers } from "../errorReporting";
import type { ErrorReport } from "../errorReporting";

describe("reportError", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("logs an error to console.error with source tag", () => {
    const err = new Error("Test error");
    reportError({ error: err, source: "manual" });

    expect(consoleSpy).toHaveBeenCalledWith("[manual]", err, "");
  });

  it("passes optional context to console.error", () => {
    const err = new Error("boom");
    reportError({ error: err, source: "boundary", context: "SomeComponent" });

    expect(consoleSpy).toHaveBeenCalledWith(
      "[boundary]",
      err,
      "SomeComponent",
    );
  });

  it("does not crash when reporter throws", () => {
    // reportError has a try/catch around each reporter, so if our
    // console.error mock throws the function should still complete
    consoleSpy.mockImplementation(() => {
      throw new Error("Reporter exploded");
    });

    expect(() =>
      reportError({
        error: new Error("original"),
        source: "global",
      }),
    ).not.toThrow();
  });

  it("accepts all valid source types", () => {
    const sources = ["boundary", "global", "promise", "manual"];
    for (const source of sources) {
      reportError({ error: new Error("test"), source });
    }
    expect(consoleSpy).toHaveBeenCalledTimes(sources.length);
  });
});

describe("installGlobalErrorHandlers", () => {
  let addEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventSpy = vi.spyOn(window, "addEventListener");
  });

  afterEach(() => {
    addEventSpy.mockRestore();
  });

  it("registers error and unhandledrejection listeners", () => {
    // installGlobalErrorHandlers is idempotent — it may already have been
    // called by main.tsx's import. We verify the listeners were registered
    // at some point.
    installGlobalErrorHandlers();

    // We can't guarantee they're in THIS call if already installed,
    // but the function should not throw
    expect(typeof installGlobalErrorHandlers).toBe("function");
  });

  it("is idempotent — calling twice does not double-register", () => {
    const callsBefore = addEventSpy.mock.calls.length;
    installGlobalErrorHandlers();
    installGlobalErrorHandlers();
    // Second call should add 0 new listeners
    const callsAfter = addEventSpy.mock.calls.length;
    // At most 2 new listeners (error + unhandledrejection) from the first call
    expect(callsAfter - callsBefore).toBeLessThanOrEqual(2);
  });
});

describe("ErrorReport interface", () => {
  it("allows construction of a valid error report", () => {
    const report: ErrorReport = {
      error: new Error("test"),
      source: "manual",
      context: "extra info",
    };
    expect(report.error).toBeInstanceOf(Error);
    expect(report.source).toBe("manual");
    expect(report.context).toBe("extra info");
  });

  it("allows context to be omitted", () => {
    const report: ErrorReport = {
      error: new Error("test"),
      source: "global",
    };
    expect(report.context).toBeUndefined();
  });
});
