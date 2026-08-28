import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Upload, Shuffle } from "lucide-react";
import AutomataGraph from "@/components/automata/AutomataGraph";
import StateControls from "@/components/automata/StateControls";
import SimulationPanel from "@/components/automata/SimulationPanel";
import TransitionTableView from "@/components/automata/TransitionTableView";
import {
  createSampleDFA,
  simulateString,
  nfaToDfa,
  type FAState,
  type FATransition,
  type SimulationStep,
  type Automaton,
} from "@/lib/automata-engine";
import { useModuleDetails } from "@/lib/page-context";

const FiniteAutomata = () => {
  const [states, setStates] = useState<FAState[]>([]);
  const [transitions, setTransitions] = useState<FATransition[]>([]);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [simulationSteps, setSimulationSteps] = useState<SimulationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [inputString, setInputString] = useState("");
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useModuleDetails(
    [
      `States: ${states.map(s => `${s.label}${s.isStart ? " (start)" : ""}${s.isAccept ? " (accept)" : ""}`).join(", ") || "none"}`,
      `Transitions: ${transitions.map(t => `δ(${t.from}, ${t.symbol}) = ${t.to}`).join("; ") || "none"}`,
      `Input string: "${inputString}"`,
      simulationSteps.length
        ? `Simulation step ${currentStep}/${simulationSteps.length - 1}: active states ${simulationSteps[currentStep]?.currentStates.join(", ")}, status ${simulationSteps[simulationSteps.length - 1]?.status}`
        : "Simulation not run yet",
      selectedState ? `Selected state: ${selectedState}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  );


  // Load sample on mount
  useEffect(() => {
    const sample = createSampleDFA();
    setStates(sample.states);
    setTransitions(sample.transitions);
  }, []);

  // Auto-play
  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= simulationSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 600);
    }
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [isPlaying, simulationSteps.length]);

  const addState = useCallback(() => {
    setStates((prev) => {
      // always pick a free q-index so ids stay unique after conversions/deletes
      let idx = prev.length;
      const used = new Set(prev.map((s) => s.id));
      while (used.has(`q${idx}`)) idx++;
      const angle = (prev.length * Math.PI * 2) / 6;
      const newState: FAState = {
        id: `q${idx}`,
        label: `q${idx}`,
        x: 350 + 150 * Math.cos(angle),
        y: 260 + 150 * Math.sin(angle),
        isStart: prev.length === 0,
        isAccept: false,
      };
      return [...prev, newState];
    });
  }, []);

  const deleteState = useCallback((id: string) => {
    setStates((prev) => prev.filter((s) => s.id !== id));
    setTransitions((prev) => prev.filter((t) => t.from !== id && t.to !== id));
    setSelectedState(null);
  }, []);

  const toggleStart = useCallback((id: string) => {
    setStates((prev) =>
      prev.map((s) => ({
        ...s,
        isStart: s.id === id ? !s.isStart : false,
      }))
    );
  }, []);

  const toggleAccept = useCallback((id: string) => {
    setStates((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isAccept: !s.isAccept } : s))
    );
  }, []);

  const addTransition = useCallback((from: string, to: string, symbol: string) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setTransitions((prev) => [...prev, { id, from, to, symbol }]);
  }, []);

  const deleteTransition = useCallback((id: string) => {
    setTransitions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const moveState = useCallback((id: string, x: number, y: number) => {
    setStates((prev) =>
      prev.map((s) => (s.id === id ? { ...s, x, y } : s))
    );
  }, []);

  const handleSimulate = useCallback(
    (input: string) => {
      const automaton: Automaton = { states, transitions, alphabet: [] };
      const steps = simulateString(automaton, input);
      setSimulationSteps(steps);
      setCurrentStep(0);
      setIsPlaying(false);
    },
    [states, transitions]
  );

  const handleReset = useCallback(() => {
    setSimulationSteps([]);
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const handleConvertToDFA = useCallback(() => {
    const automaton: Automaton = { states, transitions, alphabet: [] };
    const dfa = nfaToDfa(automaton);
    if (dfa.states.length === 0) return;
    setStates(dfa.states);
    setTransitions(dfa.transitions);
    setSelectedState(null);
    handleReset();
  }, [states, transitions, handleReset]);

  const handleMinimize = useCallback(() => {
    const dfa = nfaToDfa({ states, transitions, alphabet: [] });
    if (dfa.states.length === 0) return;
    const min = minimizeDFA(dfa);
    setStates(min.states);
    setTransitions(min.transitions);
    setSelectedState(null);
    handleReset();
  }, [states, transitions, handleReset]);

  const handleLoadSample = useCallback(() => {
    const sample = createSampleDFA();
    setStates(layoutAutomaton(sample.states, sample.transitions));
    setTransitions(sample.transitions);
    setSelectedState(null);
    handleReset();
  }, [handleReset]);

  const handleLoadSampleNFA = useCallback(() => {
    const sample = createSampleNFA();
    setStates(sample.states);
    setTransitions(sample.transitions);
    setSelectedState(null);
    handleReset();
  }, [handleReset]);

  const activeStates = simulationSteps[currentStep]?.currentStates || [];
  const simStatus =
    currentStep === simulationSteps.length - 1 && simulationSteps.length > 0
      ? simulationSteps[currentStep]?.status || null
      : simulationSteps.length > 0
        ? "running"
        : null;

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h1 className="text-xl font-heading font-bold text-foreground">
            Finite Automata
          </h1>
          <p className="text-xs text-muted-foreground">
            Design, simulate, and convert DFA / NFA
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleLoadSample}>
            <Upload className="w-3 h-3 mr-2" /> Sample
          </Button>
          <Button variant="outline" size="sm" onClick={handleConvertToDFA}>
            <Shuffle className="w-3 h-3 mr-2" /> NFA → DFA
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const data = JSON.stringify({ states, transitions }, null, 2);
              const blob = new Blob([data], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "automaton.json";
              a.click();
            }}
          >
            <Download className="w-3 h-3 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Graph area */}
        <div className="flex-1 relative">
          <AutomataGraph
            states={states}
            transitions={transitions}
            activeStates={activeStates}
            selectedState={selectedState}
            onSelectState={setSelectedState}
            onMoveState={moveState}
            simulationStatus={simStatus}
          />
          {/* Stats overlay */}
          <div className="absolute bottom-4 left-4 glass-panel px-3 py-2 flex gap-4 text-xs font-mono text-muted-foreground">
            <span>States: <span className="text-foreground">{states.length}</span></span>
            <span>Transitions: <span className="text-foreground">{transitions.length}</span></span>
            <span>
              Type:{" "}
              <span className="text-primary">
                {transitions.some((t) => t.symbol === "ε")
                  ? "ε-NFA"
                  : states.some((s) =>
                      transitions.filter((t) => t.from === s.id).length !==
                      new Set(transitions.filter((t) => t.from === s.id).map((t) => t.symbol)).size
                    )
                    ? "NFA"
                    : "DFA"}
              </span>
            </span>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 border-l border-border overflow-y-auto">
          <Tabs defaultValue="controls" className="h-full flex flex-col">
            <TabsList className="mx-3 mt-3 bg-muted">
              <TabsTrigger value="controls" className="text-xs">Controls</TabsTrigger>
              <TabsTrigger value="simulate" className="text-xs">Simulate</TabsTrigger>
              <TabsTrigger value="table" className="text-xs">Table</TabsTrigger>
            </TabsList>
            <div className="flex-1 overflow-y-auto p-3">
              <TabsContent value="controls" className="mt-0">
                <StateControls
                  states={states}
                  transitions={transitions}
                  selectedState={selectedState}
                  onAddState={addState}
                  onDeleteState={deleteState}
                  onToggleStart={toggleStart}
                  onToggleAccept={toggleAccept}
                  onAddTransition={addTransition}
                  onDeleteTransition={deleteTransition}
                />
              </TabsContent>
              <TabsContent value="simulate" className="mt-0">
                <SimulationPanel
                  onSimulate={handleSimulate}
                  steps={simulationSteps}
                  currentStep={currentStep}
                  onStepChange={setCurrentStep}
                  isPlaying={isPlaying}
                  onTogglePlay={() => setIsPlaying(!isPlaying)}
                  onReset={handleReset}
                  inputString={inputString}
                  onInputChange={setInputString}
                />
              </TabsContent>
              <TabsContent value="table" className="mt-0">
                <TransitionTableView states={states} transitions={transitions} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </motion.div>
  );
};

export default FiniteAutomata;
