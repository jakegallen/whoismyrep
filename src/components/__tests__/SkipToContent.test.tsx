import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SkipToContent from "../SkipToContent";

describe("SkipToContent", () => {
  it("renders a link with correct href", () => {
    render(<SkipToContent />);
    const link = screen.getByText("Skip to main content");
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("is initially visually hidden (translated off-screen)", () => {
    render(<SkipToContent />);
    const link = screen.getByText("Skip to main content");
    // The component uses -translate-y-full to hide it visually
    expect(link.className).toContain("-translate-y-full");
  });

  it("has focus styles for visibility on tab", () => {
    render(<SkipToContent />);
    const link = screen.getByText("Skip to main content");
    // On focus, translate-y-0 makes it visible
    expect(link.className).toContain("focus:translate-y-0");
  });

  it("has high z-index to appear above other content", () => {
    render(<SkipToContent />);
    const link = screen.getByText("Skip to main content");
    expect(link.className).toContain("z-[9999]");
  });

  it("has accessible focus ring", () => {
    render(<SkipToContent />);
    const link = screen.getByText("Skip to main content");
    expect(link.className).toContain("focus:ring-2");
  });
});
