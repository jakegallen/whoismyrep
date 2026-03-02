import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";

// Suppress React's console.error for expected errors in tests
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

/** A component that throws on render */
function ThrowingChild({ message }: { message: string }): React.ReactNode {
  throw new Error(message);
}

/** A component that renders normally */
function GoodChild() {
  return <div data-testid="good-child">Hello World</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("good-child")).toBeInTheDocument();
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("shows error UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="Test crash" />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test crash")).toBeInTheDocument();
  });

  it("displays custom fallbackTitle", () => {
    render(
      <ErrorBoundary fallbackTitle="Custom Error Title">
        <ThrowingChild message="boom" />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom Error Title")).toBeInTheDocument();
  });

  it("shows default fallback title when not provided", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="boom" />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders a 'Try Again' button", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="boom" />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("resets error state when 'Try Again' is clicked", () => {
    // We need a component that throws once, then doesn't
    let shouldThrow = true;

    function ConditionalThrower() {
      if (shouldThrow) {
        throw new Error("first render crash");
      }
      return <div data-testid="recovered">Recovered!</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>,
    );

    // Should be in error state
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Stop throwing and click Try Again
    shouldThrow = false;
    fireEvent.click(screen.getByText("Try Again"));

    // Should now render the recovered component
    expect(screen.getByTestId("recovered")).toBeInTheDocument();
    expect(screen.getByText("Recovered!")).toBeInTheDocument();
  });

  it("calls reportError when a child throws", () => {
    // reportError is called inside componentDidCatch, which calls
    // console.error via the default reporter. We verify console.error
    // was called with our error.
    render(
      <ErrorBoundary>
        <ThrowingChild message="reported error" />
      </ErrorBoundary>,
    );

    // The console.error spy should have been called with the error
    const calls = consoleErrorSpy.mock.calls;
    const foundReport = calls.some(
      (call) =>
        call.some(
          (arg: unknown) =>
            arg instanceof Error && arg.message === "reported error",
        ) || String(call).includes("[boundary]"),
    );
    expect(foundReport).toBe(true);
  });

  it("shows fallback message for errors without a message", () => {
    function EmptyErrorThrower(): React.ReactNode {
      throw new Error("");
    }

    render(
      <ErrorBoundary>
        <EmptyErrorThrower />
      </ErrorBoundary>,
    );

    // Should show the default fallback message
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});
