import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Index from "./pages/Index";
import ArticleDetail from "./pages/ArticleDetail";
import Politicians from "./pages/Politicians";
import PoliticianDetail from "./pages/PoliticianDetail";
import Bills from "./pages/Bills";
import BillDetail from "./pages/BillDetail";
import DistrictLookup from "./pages/DistrictLookup";
import Midterms from "./pages/Midterms";
import Auth from "./pages/Auth";
import Alerts from "./pages/Alerts";
import Committees from "./pages/Committees";
import CampaignFinanceExplorer from "./pages/CampaignFinanceExplorer";
import LegislativeCalendar from "./pages/LegislativeCalendar";
import DistrictMap from "./pages/DistrictMap";
import FederalRegister from "./pages/FederalRegister";
import CourtCases from "./pages/CourtCases";
import CongressExplorer from "./pages/CongressExplorer";
import LobbyingExplorer from "./pages/LobbyingExplorer";
import UnifiedSearch from "./pages/UnifiedSearch";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/news" element={<Index />} />
          <Route path="/article/:id" element={<ArticleDetail />} />
          <Route path="/politicians" element={<Politicians />} />
          <Route path="/politicians/:id" element={<PoliticianDetail />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/bills/:id" element={<BillDetail />} />
          <Route path="/district-lookup" element={<DistrictLookup />} />
          <Route path="/midterms" element={<Midterms />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/committees" element={<Committees />} />
          <Route path="/campaign-finance" element={<CampaignFinanceExplorer />} />
          <Route path="/calendar" element={<LegislativeCalendar />} />
          <Route path="/district-map" element={<DistrictMap />} />
          <Route path="/federal-register" element={<FederalRegister />} />
          <Route path="/court-cases" element={<CourtCases />} />
          <Route path="/congress" element={<CongressExplorer />} />
          <Route path="/lobbying" element={<LobbyingExplorer />} />
          <Route path="/search" element={<UnifiedSearch />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
