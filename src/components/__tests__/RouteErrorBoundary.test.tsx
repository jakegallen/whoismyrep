import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RouteErrorBoundary } from "../RouteErrorBoundary";

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

function ThrowingPage({ message }: { message: string }): React.ReactNode {
  throw new Error(message);
}

function GoodPage() {
  return <div data-testid="good-page">Page Content</div>;
}

describe("RouteErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <RouteErrorBoundary pageName="Test Page">
        <GoodPage />
      </RouteErrorBoundary>,
    );
    expect(screen.getByTestId("good-page")).toBeInTheDocument();
    expect(screen.getByText("Page Content")).toBeInTheDocument();
  });

  it("shows page-specific error UI when a child throws", () => {
    render(
      <RouteErrorBoundary pageName="Politicians">
        <ThrowingPage message="Network error" />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText("Error loading Politicians")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("shows generic error title when pageName is not provided", () => {
    render(
      <RouteErrorBoundary>
        <ThrowingPage message="crash" />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders both Try Again and Back to Home buttons", () => {
    render(
      <RouteErrorBoundary pageName="Bills">
        <ThrowingPage message="crash" />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText("Try Again")).toBeInTheDocument();
    expect(screen.getByText("Back to Home")).toBeInTheDocument();
  });

  it("Back to Home links to /", () => {
    render(
      <RouteErrorBoundary pageName="Bills">
        <ThrowingPage message="crash" />
      </RouteErrorBoundary>,
    );

    const homeLink = screen.getByText("Back to Home").closest("a");
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("resets error state when Try Again is clicked", () => {
    let shouldThrow = true;

    function ConditionalThrower() {
      if (shouldThrow) {
        throw new Error("first render crash");
      }
      return <div data-testid="recovered">Recovered!</div>;
    }

    render(
      <RouteErrorBoundary pageName="Test">
        <ConditionalThrower />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText("Error loading Test")).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByText("Try Again"));

    expect(screen.getByTestId("recovered")).toBeInTheDocument();
    expect(screen.getByText("Recovered!")).toBeInTheDocument();
  });
});
