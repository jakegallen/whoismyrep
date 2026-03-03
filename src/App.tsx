import { lazy, Suspense, type ReactNode } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { usePageView } from "@/hooks/usePageView";
import { useFocusOnNavigate } from "@/hooks/useFocusOnNavigate";
import SkipToContent from "@/components/SkipToContent";
import { Loader2 } from "lucide-react";

/* ── Eagerly loaded (above the fold) ── */
import HomePage from "./pages/HomePage";
import NotFound from "./pages/NotFound";

/* ── Lazily loaded (secondary pages) ── */
const Index = lazy(() => import("./pages/Index"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));
const Politicians = lazy(() => import("./pages/Politicians"));
const PoliticianDetail = lazy(() => import("./pages/PoliticianDetail"));
const Bills = lazy(() => import("./pages/Bills"));
const BillDetail = lazy(() => import("./pages/BillDetail"));
const DistrictLookup = lazy(() => import("./pages/DistrictLookup"));
const Midterms = lazy(() => import("./pages/Midterms"));
const Auth = lazy(() => import("./pages/Auth"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Committees = lazy(() => import("./pages/Committees"));
const CampaignFinanceExplorer = lazy(() => import("./pages/CampaignFinanceExplorer"));
const LegislativeCalendar = lazy(() => import("./pages/LegislativeCalendar"));
const DistrictMap = lazy(() => import("./pages/DistrictMap"));
const FederalRegister = lazy(() => import("./pages/FederalRegister"));
const CourtCases = lazy(() => import("./pages/CourtCases"));
const LobbyingExplorer = lazy(() => import("./pages/LobbyingExplorer"));
const StatePage = lazy(() => import("./pages/StatePage"));
const CongressionalStockTracker = lazy(() => import("./pages/CongressionalStockTracker"));
const CongressExplorer = lazy(() => import("./pages/CongressExplorer"));
const UnifiedSearch = lazy(() => import("./pages/UnifiedSearch"));
const RepResults = lazy(() => import("./pages/RepResults"));
const SavedReps = lazy(() => import("./pages/SavedReps"));

/* ── Full-page loading spinner for Suspense ── */
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

/** Fires Plausible page-views and manages focus on SPA route changes (must be inside Router). */
function RouteEffects() {
  usePageView();
  useFocusOnNavigate();
  return null;
}

/** Wrap a page element with a route-level error boundary. */
function withBoundary(element: ReactNode, pageName: string) {
  return <RouteErrorBoundary pageName={pageName}>{element}</RouteErrorBoundary>;
}

/* ── React Query defaults: stale 5 min, retry once, toast on error ── */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ErrorBoundary fallbackTitle="Application Error">
            <AuthProvider>
              <BrowserRouter>
                <SkipToContent />
                <RouteEffects />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                  <Route path="/" element={withBoundary(<HomePage />, "Home")} />
                  <Route path="/news" element={withBoundary(<Index />, "News")} />
                  <Route path="/article/:id" element={withBoundary(<ArticleDetail />, "Article")} />
                  <Route path="/politicians" element={withBoundary(<Politicians />, "Politicians")} />
                  <Route path="/politicians/:id" element={withBoundary(<PoliticianDetail />, "Politician Detail")} />
                  <Route path="/bills" element={withBoundary(<Bills />, "Bills")} />
                  <Route path="/bills/:id/*" element={withBoundary(<BillDetail />, "Bill Detail")} />
                  <Route path="/district-lookup" element={withBoundary(<DistrictLookup />, "District Lookup")} />
                  <Route path="/midterms" element={withBoundary(<Midterms />, "Elections")} />
                  <Route path="/auth" element={withBoundary(<Auth />, "Authentication")} />
                  <Route path="/alerts" element={withBoundary(<Alerts />, "Alerts")} />
                  <Route path="/committees" element={withBoundary(<Committees />, "Committees")} />
                  <Route path="/campaign-finance" element={withBoundary(<CampaignFinanceExplorer />, "Campaign Finance")} />
                  <Route path="/calendar" element={withBoundary(<LegislativeCalendar />, "Calendar")} />
                  <Route path="/district-map" element={withBoundary(<DistrictMap />, "District Map")} />
                  <Route path="/federal-register" element={withBoundary(<FederalRegister />, "Federal Register")} />
                  <Route path="/court-cases" element={withBoundary(<CourtCases />, "Court Cases")} />
                  <Route path="/lobbying" element={withBoundary(<LobbyingExplorer />, "Lobbying")} />
                  <Route path="/congress-trades" element={withBoundary(<CongressionalStockTracker />, "Stock Tracker")} />
                  <Route path="/congress" element={withBoundary(<CongressExplorer />, "Congress")} />
                  <Route path="/search" element={withBoundary(<UnifiedSearch />, "Search")} />
                  <Route path="/state/:abbr" element={withBoundary(<StatePage />, "State")} />
                  <Route path="/reps" element={withBoundary(<RepResults />, "Representatives")} />
                  <Route path="/saved" element={withBoundary(<SavedReps />, "Saved Reps")} />
                  <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </AuthProvider>
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
