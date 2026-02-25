import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ArticleDetail from "./pages/ArticleDetail";
import Politicians from "./pages/Politicians";
import PoliticianDetail from "./pages/PoliticianDetail";
import Bills from "./pages/Bills";
import BillDetail from "./pages/BillDetail";
import DistrictLookup from "./pages/DistrictLookup";
import Midterms from "./pages/Midterms";
import Compare from "./pages/Compare";
import Auth from "./pages/Auth";
import Alerts from "./pages/Alerts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/article/:id" element={<ArticleDetail />} />
          <Route path="/politicians" element={<Politicians />} />
          <Route path="/politicians/:id" element={<PoliticianDetail />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/bills/:id" element={<BillDetail />} />
          <Route path="/district-lookup" element={<DistrictLookup />} />
          <Route path="/midterms" element={<Midterms />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/alerts" element={<Alerts />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
