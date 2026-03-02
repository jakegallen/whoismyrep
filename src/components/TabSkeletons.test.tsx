import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  CardListSkeleton,
  CommitteeSkeleton,
  NewsSkeleton,
  AnalysisSkeleton,
  CampaignFinanceSkeleton,
  StockTradesSkeleton,
  PredictionMarketsSkeleton,
  MidtermSkeleton,
} from "./TabSkeletons";

describe("TabSkeletons", () => {
  it("CardListSkeleton renders the correct number of items", () => {
    const { container } = render(<CardListSkeleton count={3} />);
    const cards = container.querySelectorAll(".rounded-lg.border");
    expect(cards).toHaveLength(3);
  });

  it("CardListSkeleton defaults to 5 items", () => {
    const { container } = render(<CardListSkeleton />);
    const cards = container.querySelectorAll(".rounded-lg.border");
    expect(cards).toHaveLength(5);
  });

  it("CommitteeSkeleton renders the correct number of items", () => {
    const { container } = render(<CommitteeSkeleton count={2} />);
    const cards = container.querySelectorAll(".rounded-lg.border");
    expect(cards).toHaveLength(2);
  });

  it("NewsSkeleton renders cards with image placeholders", () => {
    const { container } = render(<NewsSkeleton count={2} />);
    const cards = container.querySelectorAll(".rounded-lg.border");
    expect(cards).toHaveLength(2);
    // Each card should have the image placeholder (h-16 w-24)
    const imgPlaceholders = container.querySelectorAll(".h-16.w-24");
    expect(imgPlaceholders).toHaveLength(2);
  });

  it("AnalysisSkeleton renders without errors", () => {
    const { container } = render(<AnalysisSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("CampaignFinanceSkeleton renders stat cards and chart area", () => {
    const { container } = render(<CampaignFinanceSkeleton />);
    // 4 stat cards in the grid
    const statCards = container.querySelectorAll(".grid .rounded-xl");
    expect(statCards.length).toBeGreaterThanOrEqual(4);
  });

  it("StockTradesSkeleton renders default 4 trade cards", () => {
    const { container } = render(<StockTradesSkeleton />);
    // 3 summary pills + 4 trade cards = multiple rounded-xl
    const roundedElements = container.querySelectorAll(".rounded-xl");
    expect(roundedElements.length).toBeGreaterThanOrEqual(4);
  });

  it("PredictionMarketsSkeleton renders market cards", () => {
    const { container } = render(<PredictionMarketsSkeleton count={2} />);
    // Look for the circular probability ring placeholders
    const circles = container.querySelectorAll(".rounded-full");
    expect(circles.length).toBeGreaterThanOrEqual(2);
  });

  it("MidtermSkeleton renders without errors", () => {
    const { container } = render(<MidtermSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });
});
