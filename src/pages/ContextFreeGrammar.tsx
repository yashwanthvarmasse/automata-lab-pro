import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Play, Check, X, Wand2, AlertTriangle, Sparkles, ListTree, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  parseCFG,
  cfgToString,
  detectLeftRecursion,
  removeLeftRecursion,
  findUselessSymbols,
  removeUselessSymbols,
  removeEpsilonProductions,
  removeUnitProductions,
  convertToCNFDetailed,
  cykParseWithTree,
  leftmostDerivation,
  generateStrings,
  cfgToPDARules,
  nullableSymbols,
  sampleCFG,
  sampleCFG2,
  sampleCFG3,
  sampleCFG4,
  type CFG,
  type CYKResult,
  type ConversionStep,
  type ParseTreeNode,
} from "@/lib/cfg-engine";

const SAMPLES = [
  { label: "aⁿbⁿ style", value: sampleCFG },
  { label: "Arithmetic expr", value: sampleCFG2 },
  { label: "0ⁿ1ⁿ with ε", value: sampleCFG3 },
  { label: "Equal a's & b's", value: sampleCFG4 },
];

const ParseTree = ({ node, depth = 0 }: { node: ParseTreeNode; depth?: number }) => (
  <div className="pl-3 border-l border-border/60">
    <div className="flex items-center gap-2 py-0.5">
      <span className={`font-mono text-xs ${node.children.length ? "text-primary" : "text-accent"}`}>
        {node.symbol}
      </span>
      {node.children.length > 0 && (
        <span className="text-[10px] text-muted-foreground font-mono">⇒* {node.span}</span>
      )}
    </div>
    {node.children.map((c, i) => (
      <ParseTree key={`${depth}-${i}-${c.symbol}`} node={c} depth={depth + 1} />
    ))}
  </div>
);

const ContextFreeGrammar = () => {
  const [grammarText, setGrammarText] = useState(sampleCFG());
  const [cfg, setCfg] = useState<CFG | null>(null);
  const [cnf, setCnf] = useState<CFG | null>(null);
  const [cnfSteps, setCnfSteps] = useState<ConversionStep[]>([]);
  const [leftRecursive, setLeftRecursive] = useState<string[]>([]);
  const [useless, setUseless] = useState<string[]>([]);
  const [nullable, setNullable] = useState<string[]>([]);
  const [cykResult, setCykResult] = useState<(CYKResult & { tree: ParseTreeNode | null }) | null>(null);
  const [derivation, setDerivation] = useState<string[] | null>(null);
  const [generated, setGenerated] = useState<string[]>([]);
  const [pdaRules, setPdaRules] = useState<string[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testHistory, setTestHistory] = useState<{ input: string; accepted: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const resetDerived = () => {
    setCnf(null); setCnfSteps([]); setCykResult(null);
    setDerivation(null); setGenerated([]); setPdaRules([]);
  };

  const applyGrammar = (g: CFG) => {
    setCfg(g);
    setGrammarText(cfgToString(g));
    setLeftRecursive(detectLeftRecursion(g));
    setUseless(findUselessSymbols(g));
    setNullable(Array.from(nullableSymbols(g)));
    resetDerived();
  };

  const handleParse = useCallback(() => {
    try {
      setError(null);
      const parsed = parseCFG(grammarText);
      if (parsed.productions.length === 0) {
        setError("No productions recognised. Use the form: S → aSb | ε");
        return;
      }
      setCfg(parsed);
      setLeftRecursive(detectLeftRecursion(parsed));
      setUseless(findUselessSymbols(parsed));
      setNullable(Array.from(nullableSymbols(parsed)));
      resetDerived();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse error");
    }
  }, [grammarText]);

  const handleConvertCNF = useCallback(() => {
    if (!cfg) return;
    try {
      const { cnf: result, steps } = convertToCNFDetailed(cfg);
      setCnf(result);
      setCnfSteps(steps);
    } catch {
      setError("CNF conversion error");
    }
  }, [cfg]);

  const handleTest = useCallback(() => {
    if (!cfg) return;
    try {
      setError(null);
      const grammar = cnf ?? convertToCNFDetailed(cfg).cnf;
      if (!cnf) { setCnf(grammar); setCnfSteps(convertToCNFDetailed(cfg).steps); }
      const result = cykParseWithTree(grammar, testInput);
      setCykResult(result);
      setDerivation(result.accepted ? leftmostDerivation(cfg, testInput) : null);
      setTestHistory(prev => [{ input: testInput, accepted: result.accepted }, ...prev.slice(0, 9)]);
    } catch {
      setError("CYK error while parsing this string");
    }
  }, [cfg, cnf, testInput]);

  return (
    <motion.div className="flex flex-col h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-success/20 text-success">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">Context-Free Grammar</h1>
            <p className="text-xs text-muted-foreground">
              Simplification, CNF pipeline, CYK parsing, parse trees and derivations
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {SAMPLES.map(s => (
            <Button
              key={s.label}
              variant="outline"
              size="sm"
              className="text-[11px]"
              onClick={() => { setGrammarText(s.value()); setCfg(null); resetDerived(); }}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* Editor */}
          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Grammar Editor</label>
              <Button size="sm" onClick={handleParse}>
                <Play className="w-3 h-3 mr-2" /> Parse
              </Button>
            </div>
            <Textarea
              value={grammarText}
              onChange={(e) => setGrammarText(e.target.value)}
              className="font-mono text-sm min-h-[150px] bg-background"
              placeholder={"S → aSb | ε\nA → aA | a"}
            />
            <p className="text-[10px] text-muted-foreground">
              Uppercase = non-terminal, lowercase/symbols = terminal. Use → or -&gt;, | for alternatives, ε for empty.
            </p>
          </div>

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Analysis */}
          {cfg && (
            <div className="glass-panel p-4 space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Grammar Analysis</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Non-terminals:</span>
                  <span className="font-mono text-foreground ml-2">{cfg.nonTerminals.join(", ")}</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Terminals:</span>
                  <span className="font-mono text-foreground ml-2">{cfg.terminals.join(", ") || "—"}</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Start:</span>
                  <span className="font-mono text-foreground ml-2">{cfg.startSymbol}</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Nullable:</span>
                  <span className="font-mono text-foreground ml-2">{nullable.join(", ") || "none"}</span>
                </div>
              </div>

              {(leftRecursive.length > 0 || useless.length > 0) && (
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-warning">
                    <AlertTriangle className="w-3.5 h-3.5" /> Issues Detected
                  </div>
                  {leftRecursive.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Left recursion in: <span className="font-mono text-foreground">{leftRecursive.join(", ")}</span>
                      </span>
                      <Button size="sm" variant="outline" onClick={() => applyGrammar(removeLeftRecursion(cfg))}>
                        <Wand2 className="w-3 h-3 mr-1" /> Fix
                      </Button>
                    </div>
                  )}
                  {useless.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Useless symbols: <span className="font-mono text-foreground">{useless.join(", ")}</span>
                      </span>
                      <Button size="sm" variant="outline" onClick={() => applyGrammar(removeUselessSymbols(cfg))}>
                        <Wand2 className="w-3 h-3 mr-1" /> Remove
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Transformations */}
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button size="sm" variant="outline" onClick={() => applyGrammar(removeEpsilonProductions(cfg))}>
                  Remove ε-productions
                </Button>
                <Button size="sm" variant="outline" onClick={() => applyGrammar(removeUnitProductions(cfg))}>
                  Remove unit productions
                </Button>
                <Button size="sm" variant="outline" onClick={handleConvertCNF}>
                  <Wand2 className="w-3 h-3 mr-1" /> Convert to CNF
                </Button>
                <Button size="sm" variant="outline" onClick={() => setGenerated(generateStrings(cfg))}>
                  <Sparkles className="w-3 h-3 mr-1" /> Generate strings
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPdaRules(cfgToPDARules(cfg))}>
                  <Layers className="w-3 h-3 mr-1" /> CFG → PDA
                </Button>
              </div>
            </div>
          )}

          {/* Generated strings */}
          {generated.length > 0 && (
            <div className="glass-panel p-4 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Shortest Strings in L(G)</label>
              <div className="flex flex-wrap gap-1.5">
                {generated.map(s => (
                  <button
                    key={s}
                    onClick={() => setTestInput(s === "ε" ? "" : s)}
                    className="px-2 py-1 rounded bg-muted/50 text-xs font-mono text-foreground hover:bg-primary/15 hover:text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CNF steps */}
          {cnfSteps.length > 0 && (
            <div className="glass-panel p-4 space-y-3">
              <label className="text-xs font-medium text-muted-foreground">CNF Conversion Steps</label>
              {cnfSteps.map(s => (
                <div key={s.title} className="space-y-1">
                  <div className="text-xs font-medium text-foreground">{s.title}</div>
                  <p className="text-[10px] text-muted-foreground">{s.description}</p>
                  <pre className="font-mono text-xs text-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
                    {cfgToString(s.grammar)}
                  </pre>
                </div>
              ))}
              {cnf && (
                <Button size="sm" variant="outline" onClick={() => applyGrammar(cnf)}>
                  Use CNF grammar in editor
                </Button>
              )}
            </div>
          )}

          {/* CYK table */}
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
                          const items = cykResult.table[cellRow]?.[col];
                          const isRoot = cellRow === 0 && col === testInput.length - 1;
                          return (
                            <td
                              key={col}
                              className={`p-1.5 border border-border text-center min-w-[40px] ${
                                items && items.size > 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"
                              } ${
                                isRoot && items?.has(cnf?.startSymbol || cfg?.startSymbol || "S")
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

          {/* Parse tree */}
          {cykResult?.tree && (
            <div className="glass-panel p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <ListTree className="w-3.5 h-3.5" /> Parse Tree (CNF)
              </div>
              <ParseTree node={cykResult.tree} />
            </div>
          )}

          {/* Derivation */}
          {derivation && derivation.length > 0 && (
            <div className="glass-panel p-4 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Leftmost Derivation</label>
              <div className="space-y-1">
                {derivation.map((form, i) => (
                  <div key={i} className="text-xs font-mono text-foreground">
                    <span className="text-muted-foreground mr-2">{i === 0 ? " " : "⇒"}</span>{form}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PDA rules */}
          {pdaRules.length > 0 && (
            <div className="glass-panel p-4 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Equivalent PDA (accepts by empty stack)
              </label>
              <pre className="font-mono text-[11px] text-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
                {pdaRules.join("\n")}
              </pre>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-72 border-l border-border overflow-y-auto p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              String Membership Test
            </label>
            <form onSubmit={(e) => { e.preventDefault(); handleTest(); }} className="flex gap-2">
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
            <p className="text-[10px] text-muted-foreground mt-1">
              The grammar is converted to CNF automatically before running CYK.
            </p>
            {cykResult && (
              <div className={`mt-2 text-xs font-mono px-3 py-2 rounded-lg ${
                cykResult.accepted ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}>
                "{testInput || "ε"}" → {cykResult.accepted ? "∈ L(G)" : "∉ L(G)"}
              </div>
            )}
          </div>

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

          {cfg && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Productions ({cfg.productions.length})
              </label>
              {cfg.productions.map((p, i) => (
                <div key={i} className="px-3 py-1.5 rounded-lg bg-muted/50 text-xs font-mono text-foreground">
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
