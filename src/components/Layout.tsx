import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import AIAssistantPanel from "./AIAssistantPanel";
import { useState } from "react";
import { Bot, PanelRightClose } from "lucide-react";
import { PageContextProvider } from "@/lib/page-context";

const Layout = () => {
  const [aiOpen, setAiOpen] = useState(true);

  return (
    <PageContextProvider>
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
            <AIAssistantPanel />
          </div>
        )}
      </div>
    </PageContextProvider>
  );
};

export default Layout;
