
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ScenarioGenerator from "./pages/ScenarioGenerator";
import ScenarioValidator from "./pages/ScenarioValidator";
import NavSidebar from "./components/NavSidebar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NavSidebar>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/generator" element={<ScenarioGenerator />} />
            <Route path="/validator" element={<ScenarioValidator />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </NavSidebar>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
