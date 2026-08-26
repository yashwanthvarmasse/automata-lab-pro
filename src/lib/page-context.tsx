import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

/**
 * Tracks which module the student is on and the live state of that module,
 * so the AI tutor always knows *where* the question is coming from.
 */

const MODULE_INFO: Record<string, { name: string; summary: string }> = {
  "/": {
    name: "Dashboard",
    summary: "Home page of AutomataViz listing all Theory of Computation modules.",
  },
  "/finite-automata": {
    name: "Finite Automata",
    summary:
      "DFA/NFA designer and simulator with state editing, transition table, string simulation and NFA→DFA subset construction.",
  },
  "/regex": {
    name: "Regular Expressions",
    summary:
      "Regex pipeline: parse to AST → Thompson construction NFA → subset construction DFA → DFA minimization, plus string testing.",
  },
  "/cfg": {
    name: "Context-Free Grammar",
    summary:
      "Grammar editor with simplification (ε/unit/useless removal), Chomsky Normal Form conversion, CYK parsing with parse trees, leftmost derivations and CFG→PDA rules.",
  },
  "/pda": {
    name: "Pushdown Automata",
    summary:
      "PDA state diagram, stack visualization, instantaneous-description trace, nondeterministic simulation with acceptance by final state or empty stack.",
  },
  "/turing": {
    name: "Turing Machine",
    summary: "Turing machine tape simulator with head movement, transition rules and sample machines.",
  },
  "/chomsky": {
    name: "Chomsky Hierarchy",
    summary: "Type 0–3 language classification, grammars, automata and closure properties.",
  },
  "/ai-tutor": {
    name: "AI Tutor",
    summary: "Full-page AI tutor for Theory of Computation questions.",
  },
};

interface PageContextValue {
  /** Full context string handed to the AI. */
  context: string;
  moduleName: string;
  setDetails: (details: string | null) => void;
}

const Ctx = createContext<PageContextValue>({
  context: "",
  moduleName: "AutomataViz",
  setDetails: () => {},
});

export const PageContextProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [details, setDetails] = useState<string | null>(null);

  // reset live details when navigating
  useEffect(() => {
    setDetails(null);
  }, [location.pathname]);

  const info = MODULE_INFO[location.pathname] ?? {
    name: "AutomataViz",
    summary: "Browsing the AutomataViz learning platform.",
  };

  const value = useMemo<PageContextValue>(() => {
    const base = `Route: ${location.pathname}\nModule: ${info.name}\nWhat this module does: ${info.summary}`;
    return {
      context: details ? `${base}\n\nLive state of the module the student is looking at:\n${details}` : base,
      moduleName: info.name,
      setDetails,
    };
  }, [location.pathname, info.name, info.summary, details]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const usePageContext = () => useContext(Ctx);

/** Call from a module page to publish its live state to the AI tutor. */
export const useModuleDetails = (details: string) => {
  const { setDetails } = usePageContext();
  useEffect(() => {
    setDetails(details);
  }, [details, setDetails]);
};
