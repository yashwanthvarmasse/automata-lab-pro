import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import FiniteAutomata from "./pages/FiniteAutomata";
import RegularExpression from "./pages/RegularExpression";
import ContextFreeGrammar from "./pages/ContextFreeGrammar";
import PushDownAutomata from "./pages/PushDownAutomata";
import TuringMachine from "./pages/TuringMachine";
import ChomksyHierarchy from "./pages/ChomksyHierarchy";
import AITutor from "./pages/AITutor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/finite-automata" element={<FiniteAutomata />} />
            <Route path="/regex" element={<RegularExpression />} />
            <Route path="/cfg" element={<ContextFreeGrammar />} />
            <Route path="/pda" element={<PushDownAutomata />} />
            <Route path="/turing" element={<TuringMachine />} />
            <Route path="/chomsky" element={<ChomksyHierarchy />} />
            <Route path="/ai-tutor" element={<AITutor />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
