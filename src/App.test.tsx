import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";

// Mock heavy page components so the test only exercises routing
vi.mock("./pages/HomePage", () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}));
vi.mock("./pages/NotFound", () => ({
  default: () => <div data-testid="not-found">Not Found</div>,
}));

describe("App", () => {
  it("renders without crashing", async () => {
    render(<App />);
    // The home page is eagerly loaded, so it should appear
    await waitFor(() => {
      expect(screen.getByTestId("home-page")).toBeInTheDocument();
    });
  });
});
