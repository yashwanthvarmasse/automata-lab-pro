import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Layers, Play, Pause, SkipForward, SkipBack, RotateCcw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  simulatePDA,
  transitionLabel,
  isDeterministic,
  SAMPLE_PDAS,
  EPSILON,
  type PDAState,
  type PDATransition,
  type PDASimulation,
  type AcceptanceMode,
} from "@/lib/pda-engine";

const PushDownAutomata = () => {
  const [sampleIdx, setSampleIdx] = useState(0);
  const [states, setStates] = useState<PDAState[]>(SAMPLE_PDAS[0].states);
  const [transitions, setTransitions] = useState<PDATransition[]>(SAMPLE_PDAS[0].transitions);
  const [mode, setMode] = useState<AcceptanceMode>(SAMPLE_PDAS[0].mode);
  const [input, setInput] = useState(SAMPLE_PDAS[0].input);
  const [sim, setSim] = useState<PDASimulation | null>(null);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // new-transition form
  const [tFrom, setTFrom] = useState("");
  const [tTo, setTTo] = useState("");
  const [tRead, setTRead] = useState("");
  const [tPop, setTPop] = useState("");
  const [tPush, setTPush] = useState("");

  const loadSample = useCallback((idx: number) => {
    const s = SAMPLE_PDAS[idx];
    setSampleIdx(idx);
    setStates(s.states);
    setTransitions(s.transitions);
    setMode(s.mode);
    setInput(s.input);
    setSim(null);
    setStep(0);
    setIsPlaying(false);
  }, []);

  const run = useCallback(() => {
    const result = simulatePDA(states, transitions, input, mode);
    setSim(result);
    setStep(0);
    setIsPlaying(result.steps.length > 1);
  }, [states, transitions, input, mode]);

  useEffect(() => {
    if (!isPlaying || !sim) return;
    timer.current = setInterval(() => {
      setStep(prev => {
        if (prev >= sim.steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 650);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [isPlaying, sim]);

  const current = sim?.steps[step] ?? null;
  const deterministic = useMemo(() => isDeterministic(transitions), [transitions]);

  const addTransition = () => {
    if (!tFrom || !tTo) return;
    setTransitions(prev => [...prev, {
      id: `t_${Date.now()}`,
      from: tFrom,
      to: tTo,
      read: tRead || EPSILON,
      pop: tPop || EPSILON,
      push: tPush || EPSILON,
    }]);
    setTRead(""); setTPop(""); setTPush("");
  };

  const addState = () => {
    const idx = states.length;
    setStates(prev => [...prev, {
      id: `q${idx}`,
      label: `q${idx < 10 ? "₀₁₂₃₄₅₆₇₈₉"[idx] : idx}`,
      x: 90 + idx * 180,
      y: 120,
      isStart: idx === 0,
      isAccept: false,
    }]);
  };

  const statusBadge = () => {
    if (!sim) return null;
    if (sim.accepted) return <Badge className="bg-success/20 text-success text-[10px]"><Check className="w-2.5 h-2.5 mr-1" />ACCEPTED</Badge>;
    return <Badge variant="destructive" className="text-[10px]"><X className="w-2.5 h-2.5 mr-1" />REJECTED</Badge>;
  };

  return (
    <motion.div className="flex flex-col h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-info/20 text-info">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">Pushdown Automata</h1>
            <p className="text-xs text-muted-foreground">
              Stack-based computation with nondeterministic step-by-step simulation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {deterministic ? "DPDA" : "NPDA"}
          </Badge>
          <Select value={String(sampleIdx)} onValueChange={v => loadSample(Number(v))}>
            <SelectTrigger className="h-8 w-56 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SAMPLE_PDAS.map((s, i) => (
                <SelectItem key={s.name} value={String(i)} className="text-xs">{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Controls */}
          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs font-medium text-muted-foreground">Input</label>
              <Input
                value={input}
                onChange={e => { setInput(e.target.value); setSim(null); }}
                placeholder="e.g. aaabbb"
                className="font-mono text-sm w-48 h-8"
              />
              <Select value={mode} onValueChange={v => { setMode(v as AcceptanceMode); setSim(null); }}>
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="final-state" className="text-xs">Accept by final state</SelectItem>
                  <SelectItem value="empty-stack" className="text-xs">Accept by empty stack</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={run} disabled={states.length === 0}>
                <Play className="w-3 h-3 mr-2" /> Simulate
              </Button>
              {statusBadge()}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {SAMPLE_PDAS[sampleIdx].description}. Stack bottom marker is Z₀; leave a field blank for ε.
            </p>
          </div>

          {/* Simulation view */}
          {sim && current && (
            <div className="glass-panel p-4 space-y-4">
              {/* Input tape */}
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Input</label>
                <div className="simulation-tape overflow-x-auto py-2">
                  {input.split("").map((ch, i) => (
                    <div
                      key={i}
                      className={`tape-cell ${i === current.config.position ? "active" : i < current.config.position ? "opacity-50" : ""}`}
                    >
                      {ch}
                    </div>
                  ))}
                  {input.length === 0 && <div className="tape-cell active">ε</div>}
                </div>
              </div>

              <div className="flex gap-6">
                {/* Stack */}
                <div className="min-w-[120px]">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Stack</label>
                  <div className="flex flex-col items-center gap-1 font-mono text-xs mt-2">
                    {current.config.stack.length === 0 && (
                      <div className="px-6 py-1.5 border border-dashed border-border text-muted-foreground">empty</div>
                    )}
                    {current.config.stack.map((sym, i) => (
                      <motion.div
                        key={`${i}-${sym}`}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`px-6 py-1.5 border ${i === 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground"}`}
                      >
                        {sym}
                      </motion.div>
                    ))}
                    <p className="text-[10px] text-muted-foreground mt-1">top → bottom</p>
                  </div>
                </div>

                {/* Configuration */}
                <div className="flex-1 space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">State: </span>
                    <span className="font-mono text-primary font-bold">
                      {states.find(s => s.id === current.config.state)?.label ?? current.config.state}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Remaining input: </span>
                    <span className="font-mono text-foreground">
                      {input.slice(current.config.position) || "ε"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Applied rule: </span>
                    <span className="font-mono text-accent">
                      {current.transition
                        ? `δ(${current.transition.from}, ${transitionLabel(current.transition)})`
                        : "initial configuration"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ID: </span>
                    <span className="font-mono text-foreground">
                      ({current.config.state}, {input.slice(current.config.position) || "ε"}, {current.config.stack.join("") || "ε"})
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Explored {sim.exploredCount} configurations{sim.truncated ? " (search limit reached)" : ""}
                  </div>
                </div>
              </div>

              {/* Playback */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={step <= 0} onClick={() => setStep(s => Math.max(0, s - 1))}>
                  <SkipBack className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsPlaying(p => !p)}>
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={step >= sim.steps.length - 1} onClick={() => setStep(s => Math.min(sim.steps.length - 1, s + 1))}>
                  <SkipForward className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setStep(0); setIsPlaying(false); }}>
                  <RotateCcw className="w-3 h-3" />
                </Button>
                <span className="text-xs font-mono text-muted-foreground">
                  step {step}/{sim.steps.length - 1}
                </span>
              </div>
            </div>
          )}

          {/* State diagram */}
          <div className="glass-panel p-4">
            <label className="text-xs font-medium text-muted-foreground block mb-3">States</label>
            <div className="flex flex-wrap gap-3">
              {states.map(s => (
                <div
                  key={s.id}
                  className={`relative flex flex-col items-center px-4 py-3 rounded-lg border transition-all ${
                    current?.config.state === s.id
                      ? "border-primary bg-primary/10"
                      : s.isAccept
                        ? "border-success/50 bg-success/5"
                        : "border-border bg-muted/30"
                  }`}
                >
                  {s.isStart && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] text-primary font-mono">START</span>
                  )}
                  <span className="font-mono text-sm font-bold text-foreground">{s.label}</span>
                  {s.isAccept && <Badge className="mt-1 text-[8px] px-1 py-0 bg-success/20 text-success">ACC</Badge>}
                </div>
              ))}
            </div>

            <label className="text-xs font-medium text-muted-foreground block mt-4 mb-2">Transition Rules</label>
            <div className="grid grid-cols-2 gap-1">
              {transitions.map(t => (
                <div
                  key={t.id}
                  className={`px-2 py-1 rounded text-[10px] font-mono flex items-center justify-between ${
                    current?.transition?.id === t.id ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <span>δ({t.from}, {transitionLabel(t)}) = {t.to}</span>
                  <button
                    onClick={() => setTransitions(prev => prev.filter(x => x.id !== t.id))}
                    className="text-destructive/60 hover:text-destructive ml-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {transitions.length === 0 && (
                <p className="text-[10px] text-muted-foreground">No transitions yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 border-l border-border overflow-y-auto p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Machine</label>
            <Button size="sm" className="w-full mb-2" onClick={addState}>Add State</Button>
            <div className="space-y-1">
              {states.map(s => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-foreground flex-1">{s.label}</span>
                  <button
                    onClick={() => setStates(prev => prev.map(x => x.id === s.id ? { ...x, isStart: true } : { ...x, isStart: false }))}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${s.isStart ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                  >
                    start
                  </button>
                  <button
                    onClick={() => setStates(prev => prev.map(x => x.id === s.id ? { ...x, isAccept: !x.isAccept } : x))}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${s.isAccept ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}
                  >
                    acc
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

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Add Transition</label>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Select value={tFrom} onValueChange={setTFrom}>
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder="From" /></SelectTrigger>
                  <SelectContent>
                    {states.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={tTo} onValueChange={setTTo}>
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder="To" /></SelectTrigger>
                  <SelectContent>
                    {states.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input value={tRead} onChange={e => setTRead(e.target.value)} placeholder="read" className="font-mono text-xs h-8" maxLength={1} />
                <Input value={tPop} onChange={e => setTPop(e.target.value)} placeholder="pop" className="font-mono text-xs h-8" maxLength={2} />
                <Input value={tPush} onChange={e => setTPush(e.target.value)} placeholder="push" className="font-mono text-xs h-8" />
              </div>
              <Button size="sm" className="w-full" onClick={addTransition} disabled={!tFrom || !tTo}>
                Add Transition
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Blank = ε. Push string's leftmost symbol becomes the new stack top.
              </p>
            </div>
          </div>

          {sim && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Computation Path ({sim.steps.length} IDs)
              </label>
              <div className="space-y-0.5 max-h-72 overflow-y-auto">
                {sim.steps.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => { setStep(i); setIsPlaying(false); }}
                    className={`w-full text-left px-2 py-1 rounded text-[10px] font-mono ${
                      i === step ? "bg-primary/15 text-primary" : "bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    ({s.config.state}, {input.slice(s.config.position) || "ε"}, {s.config.stack.join("") || "ε"})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default PushDownAutomata;
