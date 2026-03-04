import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Play, RotateCcw, Check, X, Wand2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  parseCFG,
  cfgToString,
  detectLeftRecursion,
  removeLeftRecursion,
  findUselessSymbols,
  convertToCNF,
  cykParse,
  sampleCFG,
  sampleCFG2,
  type CFG,
  type CYKResult,
} from "@/lib/cfg-engine";

const ContextFreeGrammar = () => {
  const [grammarText, setGrammarText] = useState(sampleCFG());
  const [cfg, setCfg] = useState<CFG | null>(null);
  const [cnf, setCnf] = useState<CFG | null>(null);
  const [leftRecursive, setLeftRecursive] = useState<string[]>([]);
  const [useless, setUseless] = useState<string[]>([]);
  const [cykResult, setCykResult] = useState<CYKResult | null>(null);
  const [testInput, setTestInput] = useState("");
  const [testHistory, setTestHistory] = useState<{ input: string; accepted: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleParse = useCallback(() => {
    try {
      setError(null);
      const parsed = parseCFG(grammarText);
      setCfg(parsed);
      setLeftRecursive(detectLeftRecursion(parsed));
      setUseless(findUselessSymbols(parsed));
      setCnf(null);
      setCykResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse error");
    }
  }, [grammarText]);

  const handleRemoveLeftRecursion = useCallback(() => {
    if (!cfg) return;
    const fixed = removeLeftRecursion(cfg);
    setCfg(fixed);
    setGrammarText(cfgToString(fixed));
    setLeftRecursive(detectLeftRecursion(fixed));
  }, [cfg]);

  const handleConvertCNF = useCallback(() => {
    if (!cfg) return;
    try {
      const result = convertToCNF(cfg);
      setCnf(result);
    } catch (e) {
      setError("CNF conversion error");
    }
  }, [cfg]);

  const handleCYK = useCallback(() => {
    const grammar = cnf || cfg;
    if (!grammar || !testInput) return;
    try {
      const result = cykParse(grammar, testInput);
      setCykResult(result);
      setTestHistory(prev => [{ input: testInput, accepted: result.accepted }, ...prev.slice(0, 9)]);
    } catch (e) {
      setError("CYK error - ensure grammar is in CNF");
    }
  }, [cnf, cfg, testInput]);

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-success/20 text-success">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">Context-Free Grammar</h1>
            <p className="text-xs text-muted-foreground">
              Grammar editing, CNF conversion, CYK parsing
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGrammarText(sampleCFG())}>
            Sample 1
          </Button>
          <Button variant="outline" size="sm" onClick={() => setGrammarText(sampleCFG2())}>
            Sample 2
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: grammar editor */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* Editor */}
          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Grammar Editor
              </label>
              <Button size="sm" onClick={handleParse}>
                <Play className="w-3 h-3 mr-2" /> Parse
              </Button>
            </div>
            <Textarea
              value={grammarText}
              onChange={(e) => setGrammarText(e.target.value)}
              className="font-mono text-sm min-h-[160px] bg-background"
              placeholder={"S → aSb | ε\nA → aA | a"}
            />
            <p className="text-[10px] text-muted-foreground">
              Format: uppercase = nonterminal, lowercase = terminal. Use → or -&gt; for arrow. Use | for alternatives.
            </p>
          </div>

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Warnings */}
          {cfg && (leftRecursive.length > 0 || useless.length > 0) && (
            <div className="glass-panel p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-warning">
                <AlertTriangle className="w-3.5 h-3.5" />
                Issues Detected
              </div>
              {leftRecursive.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Left recursion in: <span className="font-mono text-foreground">{leftRecursive.join(", ")}</span>
                  </span>
                  <Button size="sm" variant="outline" onClick={handleRemoveLeftRecursion}>
                    <Wand2 className="w-3 h-3 mr-1" /> Fix
                  </Button>
                </div>
              )}
              {useless.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Useless symbols: <span className="font-mono text-foreground">{useless.join(", ")}</span>
                </div>
              )}
            </div>
          )}

          {/* Grammar info */}
          {cfg && (
            <div className="glass-panel p-4 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Parsed Grammar</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Non-terminals:</span>
                  <span className="font-mono text-foreground ml-2">{cfg.nonTerminals.join(", ")}</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Terminals:</span>
                  <span className="font-mono text-foreground ml-2">{cfg.terminals.join(", ")}</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Start:</span>
                  <span className="font-mono text-foreground ml-2">{cfg.startSymbol}</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Productions:</span>
                  <span className="font-mono text-foreground ml-2">{cfg.productions.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* CNF */}
          {cfg && (
            <div className="glass-panel p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Chomsky Normal Form
                </label>
                <Button size="sm" variant="outline" onClick={handleConvertCNF}>
                  <Wand2 className="w-3 h-3 mr-2" /> Convert to CNF
                </Button>
              </div>
              {cnf && (
                <pre className="font-mono text-xs text-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
                  {cfgToString(cnf)}
                </pre>
              )}
            </div>
          )}

          {/* CYK Table */}
          {cykResult && cykResult.table.length > 0 && (
            <div className="glass-panel p-4 space-y-3">
              <label className="text-xs font-medium text-muted-foreground">CYK Table</label>
              <div className="overflow-x-auto">
                <table className="text-xs font-mono">
                  <tbody>
                    {Array.from({ length: testInput.length }, (_, row) => (
                      <tr key={row}>
                        {Array.from({ length: testInput.length }, (_, col) => {
                          if (col < row) return <td key={col} className="p-1.5" />;
                          const cellRow = col - row;
                          const cellCol = col;
                          const items = cykResult.table[cellRow]?.[cellCol];
                          return (
                            <td
                              key={col}
                              className={`p-1.5 border border-border text-center min-w-[40px] ${
                                items && items.size > 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"
                              } ${
                                cellRow === 0 && cellCol === testInput.length - 1 && items?.has(cfg?.startSymbol || "S")
                                  ? "bg-success/20 text-success font-bold"
                                  : ""
                              }`}
                            >
                              {items && items.size > 0 ? Array.from(items).join(",") : "∅"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr>
                      {testInput.split("").map((ch, i) => (
                        <td key={i} className="p-1.5 text-center text-accent font-bold border-t border-border">
                          {ch}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right panel: test */}
        <div className="w-72 border-l border-border overflow-y-auto p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              String Membership Test
            </label>
            <form
              onSubmit={(e) => { e.preventDefault(); handleCYK(); }}
              className="flex gap-2"
            >
              <Input
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="e.g. aabb"
                className="font-mono text-sm"
              />
              <Button type="submit" size="sm" disabled={!cfg}>
                <Play className="w-3 h-3" />
              </Button>
            </form>
            {cykResult && (
              <div className={`mt-2 text-xs font-mono px-3 py-2 rounded-lg ${
                cykResult.accepted ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}>
                "{testInput}" → {cykResult.accepted ? "∈ L(G)" : "∉ L(G)"}
              </div>
            )}
          </div>

          {/* History */}
          {testHistory.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">History</label>
              {testHistory.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono ${
                    r.accepted ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <span>"{r.input || "ε"}"</span>
                  <Badge variant={r.accepted ? "default" : "destructive"} className="text-[10px]">
                    {r.accepted ? <Check className="w-2.5 h-2.5 mr-1" /> : <X className="w-2.5 h-2.5 mr-1" />}
                    {r.accepted ? "∈ L" : "∉ L"}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Production list */}
          {cfg && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Productions</label>
              {cfg.productions.map((p, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 rounded-lg bg-muted/50 text-xs font-mono text-foreground"
                >
                  {p.head} → {p.body.length === 0 ? "ε" : p.body.join("")}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ContextFreeGrammar;
