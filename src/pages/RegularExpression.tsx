import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Regex, Play, RotateCcw, Check, X, ArrowRight, Shuffle } from "lucide-react";
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
import { nfaToDfa, type FAState, type FATransition } from "@/lib/automata-engine";

const sampleRegexes = [
  { label: "(a|b)*abb", value: "(a|b)*abb" },
  { label: "a*b+", value: "a*b+" },
  { label: "(0|1)*01", value: "(0|1)*01" },
  { label: "ab?c", value: "ab?c" },
];

const RegularExpression = () => {
  const [regex, setRegex] = useState("(a|b)*abb");
  const [nfaStates, setNfaStates] = useState<FAState[]>([]);
  const [nfaTransitions, setNfaTransitions] = useState<FATransition[]>([]);
  const [dfaStates, setDfaStates] = useState<FAState[]>([]);
  const [dfaTransitions, setDfaTransitions] = useState<FATransition[]>([]);
  const [ast, setAst] = useState<RegexNode | null>(null);
  const [testInput, setTestInput] = useState("");
  const [testResults, setTestResults] = useState<{ input: string; accepted: boolean }[]>([]);
  const [viewMode, setViewMode] = useState<"nfa" | "dfa">("nfa");
  const [error, setError] = useState<string | null>(null);

  const handleConvert = useCallback(() => {
    try {
      setError(null);
      const parsedAst = parseRegex(regex);
      setAst(parsedAst);

      const nfa = regexToNFA(regex);
      setNfaStates(nfa.states);
      setNfaTransitions(nfa.transitions);

      const dfa = nfaToDfa(nfa);
      setDfaStates(dfa.states);
      setDfaTransitions(dfa.transitions);
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
    setAst(null);
    setTestResults([]);
    setError(null);
  }, []);

  const currentStates = viewMode === "nfa" ? nfaStates : dfaStates;
  const currentTransitions = viewMode === "nfa" ? nfaTransitions : dfaTransitions;

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-accent/20 text-accent">
            <Regex className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">Regular Expressions</h1>
            <p className="text-xs text-muted-foreground">
              Thompson construction, NFA → DFA conversion, string testing
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="w-3 h-3 mr-2" /> Reset
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
              <div className="absolute top-4 left-4 flex gap-2">
                <Button
                  size="sm"
                  variant={viewMode === "nfa" ? "default" : "outline"}
                  onClick={() => setViewMode("nfa")}
                >
                  NFA ({nfaStates.length} states)
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "dfa" ? "default" : "outline"}
                  onClick={() => setViewMode("dfa")}
                >
                  DFA ({dfaStates.length} states)
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-4 text-xs font-mono text-muted-foreground">
                  <span className="px-3 py-1.5 rounded bg-muted">Regex</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="px-3 py-1.5 rounded bg-muted">NFA</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="px-3 py-1.5 rounded bg-muted">DFA</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter a regex and click Convert to visualize
                </p>
              </div>
            </div>
          )}
          {/* Stats overlay */}
          {currentStates.length > 0 && (
            <div className="absolute bottom-4 left-4 glass-panel px-3 py-2 flex gap-4 text-xs font-mono text-muted-foreground">
              <span>View: <span className="text-primary uppercase">{viewMode}</span></span>
              <span>States: <span className="text-foreground">{currentStates.length}</span></span>
              <span>Transitions: <span className="text-foreground">{currentTransitions.length}</span></span>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-80 border-l border-border overflow-y-auto">
          <Tabs defaultValue="input" className="h-full flex flex-col">
            <TabsList className="mx-3 mt-3 bg-muted">
              <TabsTrigger value="input" className="text-xs">Input</TabsTrigger>
              <TabsTrigger value="test" className="text-xs">Test</TabsTrigger>
              <TabsTrigger value="ast" className="text-xs">Parse Tree</TabsTrigger>
            </TabsList>
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <TabsContent value="input" className="mt-0 space-y-4">
                {/* Regex input */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">
                    Regular Expression
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={regex}
                      onChange={(e) => setRegex(e.target.value)}
                      placeholder="e.g. (a|b)*abb"
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    onClick={handleConvert}
                    disabled={!regex.trim()}
                  >
                    <Shuffle className="w-3 h-3 mr-2" /> Convert
                  </Button>
                </div>

                {error && (
                  <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                {/* Sample regexes */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">
                    Samples
                  </label>
                  <div className="space-y-1">
                    {sampleRegexes.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setRegex(s.value)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pipeline summary */}
                {nfaStates.length > 0 && (
                  <div className="glass-panel p-3 space-y-2 text-xs">
                    <div className="font-medium text-foreground">Conversion Pipeline</div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="px-2 py-0.5 rounded bg-accent/20 text-accent font-mono">{regex}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ArrowRight className="w-3 h-3" />
                      <span>NFA: {nfaStates.length} states, {nfaTransitions.length} transitions</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ArrowRight className="w-3 h-3" />
                      <span>DFA: {dfaStates.length} states, {dfaTransitions.length} transitions</span>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="test" className="mt-0 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">
                    Test String
                  </label>
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleTest(); }}
                    className="flex gap-2"
                  >
                    <Input
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      placeholder="Enter string to test"
                      className="font-mono text-sm"
                    />
                    <Button type="submit" size="sm">
                      <Play className="w-3 h-3" />
                    </Button>
                  </form>
                </div>

                {testResults.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Results</label>
                    {testResults.map((r, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono ${
                          r.accepted ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        <span>"{r.input || "ε"}"</span>
                        <Badge variant={r.accepted ? "default" : "destructive"} className="text-[10px]">
                          {r.accepted ? <Check className="w-2.5 h-2.5 mr-1" /> : <X className="w-2.5 h-2.5 mr-1" />}
                          {r.accepted ? "Accept" : "Reject"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ast" className="mt-0 space-y-4">
                {ast ? (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-muted-foreground block">
                      Parse Tree
                    </label>
                    <div className="glass-panel p-4">
                      <ASTView node={ast} depth={0} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Canonical form: <span className="font-mono text-foreground">{astToString(ast)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Convert a regex to see its parse tree.</p>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </motion.div>
  );
};

// AST tree component
function ASTView({ node, depth }: { node: RegexNode; depth: number }) {
  const indent = depth * 16;
  const colors = ["text-primary", "text-accent", "text-success", "text-info"];
  const color = colors[depth % colors.length];

  const renderNode = () => {
    switch (node.type) {
      case "char":
        return (
          <div style={{ marginLeft: indent }} className={`font-mono text-xs ${color}`}>
            ├─ char <span className="text-foreground font-bold">'{node.value}'</span>
          </div>
        );
      case "epsilon":
        return (
          <div style={{ marginLeft: indent }} className={`font-mono text-xs ${color}`}>
            ├─ <span className="text-muted-foreground">ε</span>
          </div>
        );
      case "concat":
        return (
          <div>
            <div style={{ marginLeft: indent }} className={`font-mono text-xs ${color}`}>├─ concat</div>
            <ASTView node={node.left} depth={depth + 1} />
            <ASTView node={node.right} depth={depth + 1} />
          </div>
        );
      case "union":
        return (
          <div>
            <div style={{ marginLeft: indent }} className={`font-mono text-xs ${color}`}>├─ union (|)</div>
            <ASTView node={node.left} depth={depth + 1} />
            <ASTView node={node.right} depth={depth + 1} />
          </div>
        );
      case "star":
        return (
          <div>
            <div style={{ marginLeft: indent }} className={`font-mono text-xs ${color}`}>├─ star (*)</div>
            <ASTView node={node.child} depth={depth + 1} />
          </div>
        );
      case "plus":
        return (
          <div>
            <div style={{ marginLeft: indent }} className={`font-mono text-xs ${color}`}>├─ plus (+)</div>
            <ASTView node={node.child} depth={depth + 1} />
          </div>
        );
      case "optional":
        return (
          <div>
            <div style={{ marginLeft: indent }} className={`font-mono text-xs ${color}`}>├─ optional (?)</div>
            <ASTView node={node.child} depth={depth + 1} />
          </div>
        );
    }
  };

  return <>{renderNode()}</>;
}

export default RegularExpression;
