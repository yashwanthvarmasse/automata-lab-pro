import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import AIAssistantPanel from "./AIAssistantPanel";
import { useState } from "react";
import { Bot, PanelRightClose } from "lucide-react";

const moduleContextMap: Record<string, string> = {
  "/": "User is on the Dashboard / home page of AutomataViz.",
  "/finite-automata": "User is viewing the Finite Automata module — DFA/NFA design, simulation, and NFA→DFA conversion.",
  "/regex": "User is viewing the Regular Expressions module — regex parsing, Thompson construction, NFA/DFA visualization, and string testing.",
  "/cfg": "User is viewing the Context-Free Grammar module — grammar editing, left recursion removal, CNF conversion, and CYK parsing.",
  "/pda": "User is viewing the Pushdown Automata module — stack-based computation.",
  "/turing": "User is viewing the Turing Machine module — tape simulation with head movement.",
  "/chomsky": "User is viewing the Chomsky Hierarchy module — language classification.",
  "/ai-tutor": "User is viewing the AI Tutor dedicated page.",
};

const Layout = () => {
  const location = useLocation();
  const [aiOpen, setAiOpen] = useState(true);
  const context = moduleContextMap[location.pathname] || "User is browsing AutomataViz.";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      {/* AI Panel toggle */}
      {!aiOpen && (
        <button
          onClick={() => setAiOpen(true)}
          className="fixed right-3 top-3 z-50 p-2 rounded-lg bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
          title="Open AI Assistant"
        >
          <Bot className="w-4 h-4" />
        </button>
      )}
      {aiOpen && (
        <div className="w-72 flex-shrink-0 relative">
          <button
            onClick={() => setAiOpen(false)}
            className="absolute top-2 right-2 z-10 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Close AI Panel"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
          <AIAssistantPanel moduleContext={context} />
        </div>
      )}
    </div>
  );
};

export default Layout;
