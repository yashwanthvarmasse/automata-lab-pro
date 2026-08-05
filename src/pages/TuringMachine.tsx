import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Play, Pause, SkipForward, RotateCcw, Upload, Check, X, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  initTM,
  stepTM,
  TM_SAMPLES,
  type TMState,
  type TMTransition,
  type TMConfig,
  type TMStep,
} from "@/lib/turing-engine";


const TuringMachine = () => {
  const [states, setStates] = useState<TMState[]>([]);
  const [transitions, setTransitions] = useState<TMTransition[]>([]);
  const [tapeInput, setTapeInput] = useState("1011");
  const [config, setConfig] = useState<TMConfig | null>(null);
  const [history, setHistory] = useState<TMStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(300);
  const runRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tapeRef = useRef<HTMLDivElement>(null);

  // Adding transition form state
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [newRead, setNewRead] = useState("");
  const [newWrite, setNewWrite] = useState("");
  const [newDir, setNewDir] = useState<"L" | "R" | "S">("R");

  const [sampleIdx, setSampleIdx] = useState(0);

  useEffect(() => {
    const sample = TM_SAMPLES[0].build();
    setStates(sample.states);
    setTransitions(sample.transitions);
  }, []);


  // Auto-run
  useEffect(() => {
    if (isRunning && config) {
      runRef.current = setInterval(() => {
        setConfig(prev => {
          if (!prev || prev.status !== "running") {
            setIsRunning(false);
            return prev;
          }
          const step = stepTM(prev);
          setHistory(h => [...h, step]);
          return {
            ...prev,
            tape: step.tape,
            headPosition: step.headPosition,
            currentState: step.currentState,
            status: step.status === "running" ? "running" : step.status,
            stepCount: prev.stepCount + 1,
          };
        });
      }, speed);
    }
    return () => { if (runRef.current) clearInterval(runRef.current); };
  }, [isRunning, speed]);

  // Scroll tape to head
  useEffect(() => {
    if (config && tapeRef.current) {
      const activeCell = tapeRef.current.querySelector('.tape-cell.active');
      activeCell?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [config?.headPosition]);

  const handleInit = useCallback(() => {
    const c = initTM(states, transitions, tapeInput);
    c.status = "running";
    setConfig(c);
    setHistory([]);
    setIsRunning(false);
  }, [states, transitions, tapeInput]);

  const handleStep = useCallback(() => {
    if (!config || config.status !== "running") return;
    const step = stepTM(config);
    setHistory(h => [...h, step]);
    setConfig({
      ...config,
      tape: step.tape,
      headPosition: step.headPosition,
      currentState: step.currentState,
      status: step.status,
      stepCount: config.stepCount + 1,
    });
  }, [config]);

  const handleReset = useCallback(() => {
    setConfig(null);
    setHistory([]);
    setIsRunning(false);
  }, []);

  const handleLoadSample = useCallback(() => {
    const sample = sampleTM();
    setStates(sample.states);
    setTransitions(sample.transitions);
    setTapeInput("1011");
    handleReset();
  }, [handleReset]);

  const addState = useCallback(() => {
    const idx = states.length;
    const newState: TMState = {
      id: `q${idx}`,
      label: `q${idx < 10 ? "₀₁₂₃₄₅₆₇₈₉"[idx] : idx}`,
      x: 100 + idx * 150,
      y: 200,
      isStart: states.length === 0,
      isAccept: false,
      isReject: false,
    };
    setStates(prev => [...prev, newState]);
  }, [states.length]);

  const toggleAccept = useCallback((id: string) => {
    setStates(prev => prev.map(s =>
      s.id === id ? { ...s, isAccept: !s.isAccept, isReject: false } : s
    ));
  }, []);

  const toggleReject = useCallback((id: string) => {
    setStates(prev => prev.map(s =>
      s.id === id ? { ...s, isReject: !s.isReject, isAccept: false } : s
    ));
  }, []);

  const addTransition = useCallback(() => {
    if (!newFrom || !newTo || !newRead || !newWrite) return;
    const t: TMTransition = {
      id: `tm_${Date.now()}`,
      from: newFrom,
      to: newTo,
      read: newRead,
      write: newWrite,
      direction: newDir,
    };
    setTransitions(prev => [...prev, t]);
    setNewRead("");
    setNewWrite("");
  }, [newFrom, newTo, newRead, newWrite, newDir]);

  const statusLabel = config?.status || "ready";
  const statusColor = statusLabel === "accepted" ? "text-success" :
    statusLabel === "rejected" ? "text-destructive" :
    statusLabel === "halted" ? "text-warning" :
    statusLabel === "running" ? "text-primary" : "text-muted-foreground";

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-warning/20 text-warning">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">Turing Machine</h1>
            <p className="text-xs text-muted-foreground">
              Tape-based simulation with step and run modes
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleLoadSample}>
            <Upload className="w-3 h-3 mr-2" /> Sample (Binary Increment)
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Tape */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3 mb-3">
              <label className="text-xs font-medium text-muted-foreground">Input Tape</label>
              <Input
                value={tapeInput}
                onChange={(e) => setTapeInput(e.target.value)}
                placeholder="e.g. 1011"
                className="font-mono text-sm w-48"
                disabled={!!config}
              />
              {!config ? (
                <Button size="sm" onClick={handleInit} disabled={states.length === 0}>
                  <Play className="w-3 h-3 mr-2" /> Initialize
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleStep} disabled={config.status !== "running"}>
                    <SkipForward className="w-3 h-3 mr-2" /> Step
                  </Button>
                  <Button
                    size="sm"
                    variant={isRunning ? "destructive" : "default"}
                    onClick={() => setIsRunning(!isRunning)}
                    disabled={config.status !== "running"}
                  >
                    {isRunning ? <Pause className="w-3 h-3 mr-2" /> : <Play className="w-3 h-3 mr-2" />}
                    {isRunning ? "Pause" : "Run"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleReset}>
                    <RotateCcw className="w-3 h-3 mr-2" /> Reset
                  </Button>
                </div>
              )}
            </div>

            {/* Tape visualization */}
            {config && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>State: <span className={`font-mono font-bold ${statusColor}`}>
                    {states.find(s => s.id === config.currentState)?.label || config.currentState}
                  </span></span>
                  <span>Step: <span className="text-foreground">{config.stepCount}</span></span>
                  <Badge
                    variant={statusLabel === "accepted" ? "default" : statusLabel === "rejected" ? "destructive" : "secondary"}
                    className="text-[10px]"
                  >
                    {statusLabel === "accepted" && <Check className="w-2.5 h-2.5 mr-1" />}
                    {statusLabel === "rejected" && <X className="w-2.5 h-2.5 mr-1" />}
                    {statusLabel === "halted" && <Square className="w-2.5 h-2.5 mr-1" />}
                    {statusLabel.toUpperCase()}
                  </Badge>
                </div>
                <div
                  ref={tapeRef}
                  className="simulation-tape overflow-x-auto pb-2"
                  style={{ scrollBehavior: "smooth" }}
                >
                  {config.tape.map((sym, i) => (
                    <motion.div
                      key={i}
                      className={`tape-cell ${i === config.headPosition ? "active" : ""} ${
                        config.status === "accepted" && i === config.headPosition ? "accepted" : ""
                      } ${
                        config.status === "rejected" && i === config.headPosition ? "rejected" : ""
                      }`}
                      layout
                    >
                      {sym}
                    </motion.div>
                  ))}
                </div>
                <div className="text-[10px] text-muted-foreground text-center">
                  ▲ Head position: {config.headPosition}
                </div>
              </div>
            )}
          </div>

          {/* State diagram (simplified) */}
          <div className="flex-1 p-4">
            <label className="text-xs font-medium text-muted-foreground block mb-3">State Diagram</label>
            <div className="glass-panel p-4 min-h-[200px]">
              <div className="flex flex-wrap gap-3">
                {states.map(s => (
                  <motion.div
                    key={s.id}
                    className={`relative flex flex-col items-center gap-1 px-4 py-3 rounded-lg border transition-all ${
                      config?.currentState === s.id
                        ? "border-primary bg-primary/10 glow-primary"
                        : s.isAccept
                          ? "border-success/50 bg-success/5"
                          : s.isReject
                            ? "border-destructive/50 bg-destructive/5"
                            : "border-border bg-muted/30"
                    }`}
                    layout
                  >
                    {s.isStart && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] text-primary font-mono">START</div>
                    )}
                    <span className="font-mono text-sm font-bold text-foreground">{s.label}</span>
                    <div className="flex gap-1">
                      {s.isAccept && <Badge className="text-[8px] px-1 py-0 bg-success/20 text-success">ACC</Badge>}
                      {s.isReject && <Badge className="text-[8px] px-1 py-0 bg-destructive/20 text-destructive">REJ</Badge>}
                    </div>
                  </motion.div>
                ))}
              </div>
              {transitions.length > 0 && (
                <div className="mt-4 space-y-1">
                  <label className="text-[10px] text-muted-foreground">Transition Rules</label>
                  <div className="grid grid-cols-2 gap-1">
                    {transitions.map(t => (
                      <div key={t.id} className="px-2 py-1 rounded bg-muted/50 text-[10px] font-mono text-muted-foreground flex items-center justify-between">
                        <span>δ({states.find(s => s.id === t.from)?.label || t.from}, {t.read})</span>
                        <span className="text-foreground">= ({states.find(s => s.id === t.to)?.label || t.to}, {t.write}, {t.direction})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 border-l border-border overflow-y-auto p-4 space-y-4">
          {/* Add state */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">States</label>
            <Button size="sm" className="w-full mb-2" onClick={addState}>Add State</Button>
            <div className="space-y-1">
              {states.map(s => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-foreground flex-1">{s.label}</span>
                  <button
                    onClick={() => toggleAccept(s.id)}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${s.isAccept ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}
                  >
                    acc
                  </button>
                  <button
                    onClick={() => toggleReject(s.id)}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${s.isReject ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`}
                  >
                    rej
                  </button>
                  <button
                    onClick={() => {
                      setStates(prev => prev.filter(x => x.id !== s.id));
                      setTransitions(prev => prev.filter(t => t.from !== s.id && t.to !== s.id));
                    }}
                    className="text-destructive/60 hover:text-destructive text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add transition */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Add Transition</label>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Select value={newFrom} onValueChange={setNewFrom}>
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder="From" /></SelectTrigger>
                  <SelectContent>
                    {states.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={newTo} onValueChange={setNewTo}>
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder="To" /></SelectTrigger>
                  <SelectContent>
                    {states.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input value={newRead} onChange={e => setNewRead(e.target.value)} placeholder="Read" className="font-mono text-xs h-8" maxLength={1} />
                <Input value={newWrite} onChange={e => setNewWrite(e.target.value)} placeholder="Write" className="font-mono text-xs h-8" maxLength={1} />
                <Select value={newDir} onValueChange={(v) => setNewDir(v as "L" | "R" | "S")}>
                  <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">← L</SelectItem>
                    <SelectItem value="R">R →</SelectItem>
                    <SelectItem value="S">S (stay)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="w-full" onClick={addTransition} disabled={!newFrom || !newTo || !newRead || !newWrite}>
                Add Transition
              </Button>
            </div>
          </div>

          {/* Speed */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Speed</label>
            <div className="flex gap-1">
              {[500, 300, 100, 50].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`flex-1 px-2 py-1 rounded text-[10px] ${speed === s ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  {s >= 300 ? "Slow" : s >= 100 ? "Med" : s >= 50 ? "Fast" : "Max"}
                </button>
              ))}
            </div>
          </div>

          {/* Step log */}
          {history.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Log ({history.length} steps)
              </label>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {history.slice(-20).map((step, i) => (
                  <div key={i} className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-muted/30">
                    {step.transition
                      ? `δ(${step.transition.from},${step.transition.read})→(${step.transition.to},${step.transition.write},${step.transition.direction})`
                      : `halt@${step.currentState}`
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TuringMachine;
