import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Regex, Play, RotateCcw, Check, X, ArrowRight, Shuffle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import AutomataGraph from "@/components/automata/AutomataGraph";
import {
  parseRegex,
  regexToNFA,
  testRegexString,
  astToString,
  type RegexNode,
} from "@/lib/regex-engine";
import { nfaToDfa, minimizeDFA, type FAState, type FATransition } from "@/lib/automata-engine";

interface ConversionStep {
  title: string;
  description: string;
  detail: string;
}

const sampleRegexes = [
  { label: "(a|b)*abb", value: "(a|b)*abb" },
  { label: "a*b+", value: "a*b+" },
  { label: "(0|1)*01", value: "(0|1)*01" },
  { label: "ab?c", value: "ab?c" },
  { label: "(a|b)+", value: "(a|b)+" },
];

const RegularExpression = () => {
  const [regex, setRegex] = useState("(a|b)*abb");
  const [nfaStates, setNfaStates] = useState<FAState[]>([]);
  const [nfaTransitions, setNfaTransitions] = useState<FATransition[]>([]);
  const [dfaStates, setDfaStates] = useState<FAState[]>([]);
  const [dfaTransitions, setDfaTransitions] = useState<FATransition[]>([]);
  const [minDfaStates, setMinDfaStates] = useState<FAState[]>([]);
  const [minDfaTransitions, setMinDfaTransitions] = useState<FATransition[]>([]);
  const [ast, setAst] = useState<RegexNode | null>(null);
  const [testInput, setTestInput] = useState("");
  const [testResults, setTestResults] = useState<{ input: string; accepted: boolean }[]>([]);
  const [viewMode, setViewMode] = useState<"nfa" | "dfa" | "min-dfa">("nfa");
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<ConversionStep[]>([]);

  useModuleDetails(
    [
      `Regular expression entered: "${regex}"`,
      ast ? `Parsed AST: ${astToString(ast)}` : "Not converted yet",
      `Currently viewing: ${viewMode.toUpperCase()} diagram`,
      `Thompson NFA: ${nfaStates.length} states, ${nfaTransitions.length} transitions`,
      `Subset-construction DFA: ${dfaStates.length} states; minimized DFA: ${minDfaStates.length} states`,
      steps.length ? `Pipeline steps shown: ${steps.map(s => s.title).join(" | ")}` : "",
      testResults.length
        ? `Recent string tests: ${testResults.map(r => `"${r.input}" → ${r.accepted ? "accepted" : "rejected"}`).join(", ")}`
        : "",
      error ? `Error shown: ${error}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  );



  const handleConvert = useCallback(() => {
    try {
      setError(null);
      const conversionSteps: ConversionStep[] = [];

      // Step 1: Parse
      const parsedAst = parseRegex(regex);
      setAst(parsedAst);
      conversionSteps.push({
        title: "Step 1: Parse Regex",
        description: "Break regex into AST with operators",
        detail: `Parsed "${regex}" → AST: ${astToString(parsedAst)}`,
      });

      // Step 2: Thompson Construction → NFA
      const nfa = regexToNFA(regex);
      setNfaStates(nfa.states);
      setNfaTransitions(nfa.transitions);
      conversionSteps.push({
        title: "Step 2: Thompson Construction",
        description: "Build NFA fragments for each operator and combine",
        detail: `Generated NFA with ${nfa.states.length} states, ${nfa.transitions.length} transitions`,
      });

      // Step 3: Subset Construction → DFA
      const dfa = nfaToDfa(nfa);
      setDfaStates(dfa.states);
      setDfaTransitions(dfa.transitions);
      conversionSteps.push({
        title: "Step 3: Subset Construction (NFA → DFA)",
        description: "Compute ε-closures and determinize",
        detail: `DFA: ${dfa.states.length} states, ${dfa.transitions.length} transitions`,
      });

      // Step 4: Minimize DFA
      const minDfa = minimizeDFA(dfa);
      setMinDfaStates(minDfa.states);
      setMinDfaTransitions(minDfa.transitions);
      conversionSteps.push({
        title: "Step 4: DFA Minimization",
        description: "Merge equivalent states using Hopcroft's algorithm",
        detail: `Minimized DFA: ${minDfa.states.length} states, ${minDfa.transitions.length} transitions`,
      });

      conversionSteps.push({
        title: "Step 5: Complete",
        description: "All conversions finished — switch views to explore",
        detail: `Pipeline: Regex → NFA (${nfa.states.length}st) → DFA (${dfa.states.length}st) → Min-DFA (${minDfa.states.length}st)`,
      });

      setSteps(conversionSteps);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid regex");
    }
  }, [regex]);

  const handleTest = useCallback(() => {
    if (!testInput.trim()) return;
    try {
      const accepted = testRegexString(regex, testInput);
      setTestResults(prev => [{ input: testInput, accepted }, ...prev.slice(0, 9)]);
      setTestInput("");
    } catch {
      setError("Build NFA first before testing");
    }
  }, [regex, testInput]);

  const handleReset = useCallback(() => {
    setNfaStates([]);
    setNfaTransitions([]);
    setDfaStates([]);
    setDfaTransitions([]);
    setMinDfaStates([]);
    setMinDfaTransitions([]);
    setAst(null);
    setTestResults([]);
    setSteps([]);
    setError(null);
  }, []);

  const currentStates = viewMode === "nfa" ? nfaStates : viewMode === "dfa" ? dfaStates : minDfaStates;
  const currentTransitions = viewMode === "nfa" ? nfaTransitions : viewMode === "dfa" ? dfaTransitions : minDfaTransitions;

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/8 text-primary">
            <Regex className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-heading font-semibold text-foreground">Regular Expressions</h1>
            <p className="text-[11px] text-muted-foreground">
              Regex → NFA → DFA → Minimized DFA
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
          <RotateCcw className="w-3 h-3 mr-1.5" /> Reset
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Graph area */}
        <div className="flex-1 relative">
          {currentStates.length > 0 ? (
            <>
              <AutomataGraph
                states={currentStates}
                transitions={currentTransitions}
                activeStates={[]}
                selectedState={null}
                onSelectState={() => {}}
                onMoveState={() => {}}
                simulationStatus={null}
              />
              <div className="absolute top-3 left-3 flex gap-1.5">
                {([
                  { key: "nfa" as const, label: "NFA", count: nfaStates.length },
                  { key: "dfa" as const, label: "DFA", count: dfaStates.length },
                  { key: "min-dfa" as const, label: "Min-DFA", count: minDfaStates.length },
                ]).map(v => (
                  <button
                    key={v.key}
                    onClick={() => setViewMode(v.key)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      viewMode === v.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {v.label} ({v.count})
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-3 text-[11px] font-mono text-muted-foreground">
                  <span className="px-2.5 py-1 rounded-md bg-muted">Regex</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="px-2.5 py-1 rounded-md bg-muted">NFA</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="px-2.5 py-1 rounded-md bg-muted">DFA</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="px-2.5 py-1 rounded-md bg-muted">Min-DFA</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter a regex and click Convert
                </p>
              </div>
            </div>
          )}
          {currentStates.length > 0 && (
            <div className="absolute bottom-3 left-3 bg-card border border-border rounded-lg px-3 py-1.5 flex gap-4 text-[11px] font-mono text-muted-foreground shadow-sm">
              <span>View: <span className="text-primary font-semibold uppercase">{viewMode}</span></span>
              <span>States: <span className="text-foreground">{currentStates.length}</span></span>
              <span>Transitions: <span className="text-foreground">{currentTransitions.length}</span></span>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-72 border-l border-border overflow-y-auto">
          <Tabs defaultValue="input" className="h-full flex flex-col">
            <TabsList className="mx-3 mt-2 bg-muted/50 h-8">
              <TabsTrigger value="input" className="text-[11px] h-6">Input</TabsTrigger>
              <TabsTrigger value="steps" className="text-[11px] h-6">Steps</TabsTrigger>
              <TabsTrigger value="test" className="text-[11px] h-6">Test</TabsTrigger>
              <TabsTrigger value="ast" className="text-[11px] h-6">AST</TabsTrigger>
            </TabsList>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <TabsContent value="input" className="mt-0 space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                    Regular Expression
                  </label>
                  <Input
                    value={regex}
                    onChange={(e) => setRegex(e.target.value)}
                    placeholder="e.g. (a|b)*abb"
                    className="font-mono text-sm h-9"
                  />
                  <Button
                    size="sm"
                    className="w-full mt-2 h-8 text-xs"
                    onClick={handleConvert}
                    disabled={!regex.trim()}
                  >
                    <Shuffle className="w-3 h-3 mr-1.5" /> Convert
                  </Button>
                </div>

                {error && (
                  <div className="text-[11px] text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                    Samples
                  </label>
                  <div className="space-y-0.5">
                    {sampleRegexes.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setRegex(s.value)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {nfaStates.length > 0 && (
                  <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-1.5 text-[11px]">
                    <div className="font-medium text-foreground">Pipeline Summary</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{regex}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <ChevronRight className="w-2.5 h-2.5" />
                      NFA: {nfaStates.length} states
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <ChevronRight className="w-2.5 h-2.5" />
                      DFA: {dfaStates.length} states
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <ChevronRight className="w-2.5 h-2.5" />
                      Min-DFA: {minDfaStates.length} states
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="steps" className="mt-0 space-y-2">
                {steps.length > 0 ? (
                  steps.map((step, i) => (
                    <div key={i} className="bg-muted/30 border border-border rounded-lg p-3 space-y-1">
                      <div className="text-[11px] font-semibold text-foreground">{step.title}</div>
                      <div className="text-[10px] text-muted-foreground">{step.description}</div>
                      <div className="text-[10px] font-mono text-primary/80">{step.detail}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-muted-foreground">Convert a regex to see steps.</p>
                )}
              </TabsContent>

              <TabsContent value="test" className="mt-0 space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                    Test String
                  </label>
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleTest(); }}
                    className="flex gap-1.5"
                  >
                    <Input
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      placeholder="Enter string"
                      className="font-mono text-sm h-8"
                    />
                    <Button type="submit" size="sm" className="h-8 w-8 p-0">
                      <Play className="w-3 h-3" />
                    </Button>
                  </form>
                </div>

                {testResults.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Results</label>
                    {testResults.map((r, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-mono ${
                          r.accepted ? "bg-success/5 text-success border border-success/20" : "bg-destructive/5 text-destructive border border-destructive/20"
                        }`}
                      >
                        <span>"{r.input || "ε"}"</span>
                        <Badge variant={r.accepted ? "default" : "destructive"} className="text-[9px] h-4 px-1.5">
                          {r.accepted ? <Check className="w-2 h-2 mr-0.5" /> : <X className="w-2 h-2 mr-0.5" />}
                          {r.accepted ? "Accept" : "Reject"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ast" className="mt-0 space-y-3">
                {ast ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-muted-foreground block">
                      Parse Tree
                    </label>
                    <div className="bg-muted/30 border border-border rounded-lg p-3">
                      <ASTView node={ast} depth={0} />
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Canonical: <span className="font-mono text-foreground">{astToString(ast)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Convert a regex to see its parse tree.</p>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </motion.div>
  );
};

function ASTView({ node, depth }: { node: RegexNode; depth: number }) {
  const indent = depth * 14;
  const colors = ["text-primary", "text-info", "text-success", "text-warning"];
  const color = colors[depth % colors.length];

  const renderNode = () => {
    switch (node.type) {
      case "char":
        return (
          <div style={{ marginLeft: indent }} className={`font-mono text-[11px] ${color}`}>
            ├─ char <span className="text-foreground font-semibold">'{node.value}'</span>
          </div>
        );
      case "epsilon":
        return (
          <div style={{ marginLeft: indent }} className={`font-mono text-[11px] ${color}`}>
            ├─ <span className="text-muted-foreground">ε</span>
          </div>
        );
      case "concat":
        return (
          <div>
            <div style={{ marginLeft: indent }} className={`font-mono text-[11px] ${color}`}>├─ concat</div>
            <ASTView node={node.left} depth={depth + 1} />
            <ASTView node={node.right} depth={depth + 1} />
          </div>
        );
      case "union":
        return (
          <div>
            <div style={{ marginLeft: indent }} className={`font-mono text-[11px] ${color}`}>├─ union (|)</div>
            <ASTView node={node.left} depth={depth + 1} />
            <ASTView node={node.right} depth={depth + 1} />
          </div>
        );
      case "star":
        return (
          <div>
            <div style={{ marginLeft: indent }} className={`font-mono text-[11px] ${color}`}>├─ star (*)</div>
            <ASTView node={node.child} depth={depth + 1} />
          </div>
        );
      case "plus":
        return (
          <div>
            <div style={{ marginLeft: indent }} className={`font-mono text-[11px] ${color}`}>├─ plus (+)</div>
            <ASTView node={node.child} depth={depth + 1} />
          </div>
        );
      case "optional":
        return (
          <div>
            <div style={{ marginLeft: indent }} className={`font-mono text-[11px] ${color}`}>├─ optional (?)</div>
            <ASTView node={node.child} depth={depth + 1} />
          </div>
        );
    }
  };

  return <>{renderNode()}</>;
}

export default RegularExpression;
