// CFG Engine - Left recursion removal, CNF conversion, CYK parsing

export interface Production {
  head: string;
  body: string[]; // array of symbols (terminals/nonterminals)
}

export interface CFG {
  nonTerminals: string[];
  terminals: string[];
  productions: Production[];
  startSymbol: string;
}

// Parse grammar from text format: "S -> aAb | c\nA -> aA | ε"
export function parseCFG(text: string): CFG {
  const productions: Production[] = [];
  const nonTerminals = new Set<string>();
  const allSymbols = new Set<string>();
  let startSymbol = "";

  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    const match = line.match(/^([A-Z][A-Z0-9']*)\s*(?:->|→)\s*(.+)$/);
    if (!match) continue;

    const head = match[1];
    nonTerminals.add(head);
    if (!startSymbol) startSymbol = head;

    const alternatives = match[2].split("|").map(a => a.trim());
    for (const alt of alternatives) {
      if (alt === "ε" || alt === "epsilon" || alt === "e") {
        productions.push({ head, body: [] });
      } else {
        // Parse symbols: uppercase = nonterminal, lowercase/digits = terminal
        const body: string[] = [];
        let i = 0;
        while (i < alt.length) {
          if (alt[i] === " ") { i++; continue; }
          if (alt[i] >= "A" && alt[i] <= "Z") {
            let sym = alt[i]; i++;
            while (i < alt.length && (alt[i] === "'" || (alt[i] >= "0" && alt[i] <= "9") || (alt[i] >= "A" && alt[i] <= "Z" && sym.length < 3))) {
              if (alt[i] >= "A" && alt[i] <= "Z" && sym.length >= 1) break;
              sym += alt[i]; i++;
            }
            body.push(sym);
            allSymbols.add(sym);
          } else {
            body.push(alt[i]);
            allSymbols.add(alt[i]);
            i++;
          }
        }
        productions.push({ head, body });
      }
    }
  }

  const terminals = Array.from(allSymbols).filter(s => !nonTerminals.has(s));
  return { nonTerminals: Array.from(nonTerminals), terminals, productions, startSymbol };
}

// Stringify CFG back to text
export function cfgToString(cfg: CFG): string {
  const grouped: Record<string, string[][]> = {};
  for (const p of cfg.productions) {
    if (!grouped[p.head]) grouped[p.head] = [];
    grouped[p.head].push(p.body);
  }
  return Object.entries(grouped).map(([head, bodies]) => {
    const bodiesStr = bodies.map(b => b.length === 0 ? "ε" : b.join("")).join(" | ");
    return `${head} → ${bodiesStr}`;
  }).join("\n");
}

// Detect left recursion
export function detectLeftRecursion(cfg: CFG): string[] {
  const recursive: string[] = [];
  for (const nt of cfg.nonTerminals) {
    for (const p of cfg.productions.filter(p => p.head === nt)) {
      if (p.body.length > 0 && p.body[0] === nt) {
        if (!recursive.includes(nt)) recursive.push(nt);
      }
    }
  }
  return recursive;
}

// Remove immediate left recursion
export function removeLeftRecursion(cfg: CFG): CFG {
  const newProductions: Production[] = [];
  const newNonTerminals = new Set(cfg.nonTerminals);

  for (const nt of cfg.nonTerminals) {
    const prods = cfg.productions.filter(p => p.head === nt);
    const recursive = prods.filter(p => p.body.length > 0 && p.body[0] === nt);
    const nonRecursive = prods.filter(p => p.body.length === 0 || p.body[0] !== nt);

    if (recursive.length === 0) {
      newProductions.push(...prods);
      continue;
    }

    const newNT = nt + "'";
    newNonTerminals.add(newNT);

    for (const nr of nonRecursive) {
      newProductions.push({ head: nt, body: [...nr.body, newNT] });
    }
    if (nonRecursive.length === 0) {
      newProductions.push({ head: nt, body: [newNT] });
    }

    for (const r of recursive) {
      newProductions.push({ head: newNT, body: [...r.body.slice(1), newNT] });
    }
    newProductions.push({ head: newNT, body: [] }); // ε
  }

  const terminals = Array.from(new Set(
    newProductions.flatMap(p => p.body).filter(s => !newNonTerminals.has(s))
  ));

  return {
    nonTerminals: Array.from(newNonTerminals),
    terminals,
    productions: newProductions,
    startSymbol: cfg.startSymbol,
  };
}

// Find useless symbols (not reachable or not productive)
export function findUselessSymbols(cfg: CFG): string[] {
  // Productive symbols
  const productive = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of cfg.productions) {
      if (productive.has(p.head)) continue;
      const allProductive = p.body.every(s =>
        cfg.terminals.includes(s) || productive.has(s)
      ) || p.body.length === 0;
      if (allProductive) {
        productive.add(p.head);
        changed = true;
      }
    }
  }

  // Reachable symbols
  const reachable = new Set<string>([cfg.startSymbol]);
  changed = true;
  while (changed) {
    changed = false;
    for (const p of cfg.productions) {
      if (!reachable.has(p.head)) continue;
      for (const s of p.body) {
        if (!reachable.has(s)) {
          reachable.add(s);
          changed = true;
        }
      }
    }
  }

  return cfg.nonTerminals.filter(nt => !productive.has(nt) || !reachable.has(nt));
}

// ---------------------------------------------------------------------------
// Grammar simplification pipeline
// ---------------------------------------------------------------------------

const isNT = (cfg: CFG, s: string) => cfg.nonTerminals.includes(s);

function rebuild(cfg: CFG, productions: Production[], nonTerminals: string[], startSymbol?: string): CFG {
  const uniq = new Map<string, Production>();
  for (const p of productions) uniq.set(`${p.head}->${p.body.join("\u0001")}`, p);
  const prods = Array.from(uniq.values());
  const nts = Array.from(new Set(nonTerminals));
  const terminals = Array.from(new Set(prods.flatMap(p => p.body).filter(s => !nts.includes(s))));
  return { nonTerminals: nts, terminals, productions: prods, startSymbol: startSymbol ?? cfg.startSymbol };
}

export function nullableSymbols(cfg: CFG): Set<string> {
  const nullable = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of cfg.productions) {
      if (nullable.has(p.head)) continue;
      if (p.body.length === 0 || p.body.every(s => nullable.has(s))) {
        nullable.add(p.head);
        changed = true;
      }
    }
  }
  return nullable;
}

/** Remove ε-productions (a fresh start symbol is added if the start is nullable). */
export function removeEpsilonProductions(cfg: CFG): CFG {
  const nullable = nullableSymbols(cfg);
  const out: Production[] = [];

  for (const p of cfg.productions) {
    if (p.body.length === 0) continue;
    // all subsets of nullable occurrences
    const positions = p.body.map((s, i) => (nullable.has(s) ? i : -1)).filter(i => i >= 0);
    const combos = 1 << positions.length;
    for (let mask = 0; mask < combos; mask++) {
      const omit = new Set<number>();
      positions.forEach((pos, bit) => { if (mask & (1 << bit)) omit.add(pos); });
      const body = p.body.filter((_, i) => !omit.has(i));
      if (body.length === 0) continue;
      out.push({ head: p.head, body });
    }
  }

  let start = cfg.startSymbol;
  const nts = [...cfg.nonTerminals];
  if (nullable.has(cfg.startSymbol)) {
    start = cfg.startSymbol + "₀";
    nts.push(start);
    out.push({ head: start, body: [cfg.startSymbol] });
    out.push({ head: start, body: [] });
  }
  return rebuild(cfg, out, nts, start);
}

/** Remove unit productions A → B by inlining reachable non-unit bodies. */
export function removeUnitProductions(cfg: CFG): CFG {
  const out: Production[] = [];
  for (const nt of cfg.nonTerminals) {
    // unit closure of nt
    const closure = new Set<string>([nt]);
    const stack = [nt];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const p of cfg.productions) {
        if (p.head !== cur) continue;
        if (p.body.length === 1 && isNT(cfg, p.body[0]) && !closure.has(p.body[0])) {
          closure.add(p.body[0]);
          stack.push(p.body[0]);
        }
      }
    }
    for (const member of closure) {
      for (const p of cfg.productions) {
        if (p.head !== member) continue;
        const isUnit = p.body.length === 1 && isNT(cfg, p.body[0]);
        if (isUnit) continue;
        out.push({ head: nt, body: [...p.body] });
      }
    }
  }
  return rebuild(cfg, out, cfg.nonTerminals);
}

/** Drop non-productive and unreachable symbols along with their productions. */
export function removeUselessSymbols(cfg: CFG): CFG {
  const productive = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of cfg.productions) {
      if (productive.has(p.head)) continue;
      if (p.body.every(s => !isNT(cfg, s) || productive.has(s))) {
        productive.add(p.head);
        changed = true;
      }
    }
  }
  let prods = cfg.productions.filter(
    p => productive.has(p.head) && p.body.every(s => !isNT(cfg, s) || productive.has(s))
  );

  const reachable = new Set<string>([cfg.startSymbol]);
  changed = true;
  while (changed) {
    changed = false;
    for (const p of prods) {
      if (!reachable.has(p.head)) continue;
      for (const s of p.body) {
        if (!reachable.has(s)) { reachable.add(s); changed = true; }
      }
    }
  }
  prods = prods.filter(p => reachable.has(p.head));
  const nts = cfg.nonTerminals.filter(nt => productive.has(nt) && reachable.has(nt));
  return rebuild(cfg, prods, nts.length ? nts : [cfg.startSymbol]);
}

export interface ConversionStep {
  title: string;
  description: string;
  grammar: CFG;
}

/** Full CNF pipeline with an inspectable step log. */
export function convertToCNFDetailed(cfg: CFG): { cnf: CFG; steps: ConversionStep[] } {
  const steps: ConversionStep[] = [];

  const noEps = removeEpsilonProductions(cfg);
  steps.push({
    title: "1. Remove ε-productions",
    description: "Every nullable non-terminal is expanded away; a new start symbol is introduced if the language contains ε.",
    grammar: noEps,
  });

  const noUnit = removeUnitProductions(noEps);
  steps.push({
    title: "2. Remove unit productions",
    description: "Chains A → B are replaced by the non-unit bodies reachable from B.",
    grammar: noUnit,
  });

  const clean = removeUselessSymbols(noUnit);
  steps.push({
    title: "3. Remove useless symbols",
    description: "Non-productive and unreachable non-terminals are deleted.",
    grammar: clean,
  });

  // TERM: isolate terminals occurring in bodies of length ≥ 2
  const prods: Production[] = [];
  const nts = new Set(clean.nonTerminals);
  const termMap = new Map<string, string>();
  for (const p of clean.productions) {
    if (p.body.length < 2) { prods.push(p); continue; }
    const body = p.body.map(sym => {
      if (nts.has(sym)) return sym;
      let nt = termMap.get(sym);
      if (!nt) {
        nt = `T_${sym}`;
        termMap.set(sym, nt);
        nts.add(nt);
        prods.push({ head: nt, body: [sym] });
      }
      return nt;
    });
    prods.push({ head: p.head, body });
  }
  const termed = rebuild(clean, prods, Array.from(nts));
  steps.push({
    title: "4. TERM — isolate terminals",
    description: "Terminals inside long bodies are replaced by dedicated non-terminals such as T_a → a.",
    grammar: termed,
  });

  // BIN: break bodies longer than 2
  const finalProds: Production[] = [];
  const finalNts = new Set(termed.nonTerminals);
  let counter = 1;
  for (const p of termed.productions) {
    if (p.body.length <= 2) { finalProds.push(p); continue; }
    let head = p.head;
    let rest = [...p.body];
    while (rest.length > 2) {
      const nt = `X${counter++}`;
      finalNts.add(nt);
      finalProds.push({ head, body: [rest[0], nt] });
      head = nt;
      rest = rest.slice(1);
    }
    finalProds.push({ head, body: rest });
  }
  const cnf = rebuild(termed, finalProds, Array.from(finalNts));
  steps.push({
    title: "5. BIN — binarise long bodies",
    description: "Bodies with more than two symbols are chained through fresh non-terminals X₁, X₂, …",
    grammar: cnf,
  });

  return { cnf, steps };
}

// Convert to Chomsky Normal Form
export function convertToCNF(cfg: CFG): CFG {
  return convertToCNFDetailed(cfg).cnf;
}


// CYK Algorithm
export interface CYKResult {
  table: Set<string>[][];
  accepted: boolean;
}

export function cykParse(cfg: CFG, input: string): CYKResult {
  const n = input.length;
  if (n === 0) {
    const accepted = cfg.productions.some(p => p.head === cfg.startSymbol && p.body.length === 0);
    return { table: [], accepted };
  }

  // Initialize table
  const table: Set<string>[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => new Set<string>())
  );

  // Fill diagonal (length 1 substrings)
  for (let i = 0; i < n; i++) {
    for (const p of cfg.productions) {
      if (p.body.length === 1 && p.body[0] === input[i]) {
        table[i][i].add(p.head);
      }
    }
  }

  // Fill rest (length 2 to n)
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) {
      const j = i + len - 1;
      for (let k = i; k < j; k++) {
        for (const p of cfg.productions) {
          if (p.body.length === 2) {
            if (table[i][k].has(p.body[0]) && table[k + 1][j].has(p.body[1])) {
              table[i][j].add(p.head);
            }
          }
        }
      }
    }
  }

  const accepted = table[0][n - 1].has(cfg.startSymbol);
  return { table, accepted };
}

// Sample grammars
export function sampleCFG(): string {
  return `S → aSb | AB
A → aA | a
B → bB | b`;
}

export function sampleCFG2(): string {
  return `E → E+T | T
T → T*F | F
F → (E) | a`;
}

// ---------------------------------------------------------------------------
// Parse trees, derivations and language generation
// ---------------------------------------------------------------------------

export interface ParseTreeNode {
  symbol: string;
  span: string;
  children: ParseTreeNode[];
}

interface BackPointer {
  left?: { nt: string; row: number; col: number };
  right?: { nt: string; row: number; col: number };
  terminal?: string;
}

/** CYK with backpointers so a parse tree can be reconstructed. */
export function cykParseWithTree(
  cfg: CFG,
  input: string
): CYKResult & { tree: ParseTreeNode | null } {
  const n = input.length;
  if (n === 0) {
    const accepted = cfg.productions.some(p => p.head === cfg.startSymbol && p.body.length === 0);
    return { table: [], accepted, tree: accepted ? { symbol: cfg.startSymbol, span: "ε", children: [] } : null };
  }

  const table: Set<string>[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => new Set<string>())
  );
  const back: Map<string, BackPointer>[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => new Map<string, BackPointer>())
  );

  for (let i = 0; i < n; i++) {
    for (const p of cfg.productions) {
      if (p.body.length === 1 && p.body[0] === input[i]) {
        table[i][i].add(p.head);
        if (!back[i][i].has(p.head)) back[i][i].set(p.head, { terminal: input[i] });
      }
    }
  }

  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) {
      const j = i + len - 1;
      for (let k = i; k < j; k++) {
        for (const p of cfg.productions) {
          if (p.body.length !== 2) continue;
          if (table[i][k].has(p.body[0]) && table[k + 1][j].has(p.body[1])) {
            table[i][j].add(p.head);
            if (!back[i][j].has(p.head)) {
              back[i][j].set(p.head, {
                left: { nt: p.body[0], row: i, col: k },
                right: { nt: p.body[1], row: k + 1, col: j },
              });
            }
          }
        }
      }
    }
  }

  const accepted = table[0][n - 1].has(cfg.startSymbol);

  const build = (nt: string, row: number, col: number): ParseTreeNode => {
    const span = input.slice(row, col + 1);
    const bp = back[row][col].get(nt);
    if (!bp) return { symbol: nt, span, children: [] };
    if (bp.terminal !== undefined) {
      return { symbol: nt, span, children: [{ symbol: bp.terminal, span: bp.terminal, children: [] }] };
    }
    return {
      symbol: nt,
      span,
      children: [
        build(bp.left!.nt, bp.left!.row, bp.left!.col),
        build(bp.right!.nt, bp.right!.row, bp.right!.col),
      ],
    };
  };

  return {
    table,
    accepted,
    tree: accepted ? build(cfg.startSymbol, 0, n - 1) : null,
  };
}

/** Breadth-first search for a leftmost derivation of `input` (works on any CFG). */
export function leftmostDerivation(
  cfg: CFG,
  input: string,
  maxSteps = 20000
): string[] | null {
  const isNonTerminal = (s: string) => cfg.nonTerminals.includes(s);
  const start: string[] = [cfg.startSymbol];
  const queue: { form: string[]; path: string[] }[] = [
    { form: start, path: [cfg.startSymbol] },
  ];
  const seen = new Set<string>([cfg.startSymbol]);
  let steps = 0;

  while (queue.length && steps < maxSteps) {
    const { form, path } = queue.shift()!;
    steps++;

    const text = form.join("");
    if (!form.some(isNonTerminal)) {
      if (text === input) return path;
      continue;
    }
    // prune: terminal prefix must match, form cannot exceed input length
    const idx = form.findIndex(isNonTerminal);
    const prefix = form.slice(0, idx).join("");
    if (!input.startsWith(prefix)) continue;
    if (form.filter(s => !isNonTerminal(s)).length > input.length) continue;
    if (form.length > input.length + cfg.nonTerminals.length + 4) continue;

    for (const p of cfg.productions) {
      if (p.head !== form[idx]) continue;
      const next = [...form.slice(0, idx), ...p.body, ...form.slice(idx + 1)];
      const key = next.join("\u0001");
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ form: next, path: [...path, next.length ? next.join("") : "ε"] });
    }
  }
  return null;
}

/** Generate the shortest strings in L(G). */
export function generateStrings(cfg: CFG, limit = 12, maxLength = 8): string[] {
  const isNonTerminal = (s: string) => cfg.nonTerminals.includes(s);
  const results: string[] = [];
  const seenResults = new Set<string>();
  const queue: string[][] = [[cfg.startSymbol]];
  const seen = new Set<string>([cfg.startSymbol]);
  let iterations = 0;

  while (queue.length && results.length < limit && iterations < 30000) {
    const form = queue.shift()!;
    iterations++;

    if (!form.some(isNonTerminal)) {
      const s = form.join("") || "ε";
      if (!seenResults.has(s)) { seenResults.add(s); results.push(s); }
      continue;
    }
    if (form.filter(s => !isNonTerminal(s)).length > maxLength) continue;
    if (form.length > maxLength + 4) continue;

    const idx = form.findIndex(isNonTerminal);
    for (const p of cfg.productions) {
      if (p.head !== form[idx]) continue;
      const next = [...form.slice(0, idx), ...p.body, ...form.slice(idx + 1)];
      const key = next.join("\u0001");
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return results.sort((a, b) => (a === "ε" ? -1 : b === "ε" ? 1 : a.length - b.length || a.localeCompare(b)));
}

/** Standard one-state PDA accepting L(G) by empty stack. */
export function cfgToPDARules(cfg: CFG): string[] {
  const rules: string[] = [`δ(q, ε, Z₀) = { (q, ${cfg.startSymbol}) }   // push start symbol`];
  for (const p of cfg.productions) {
    const body = p.body.length === 0 ? "ε" : p.body.join("");
    rules.push(`δ(q, ε, ${p.head}) ∋ (q, ${body})`);
  }
  for (const t of cfg.terminals) {
    rules.push(`δ(q, ${t}, ${t}) = { (q, ε) }   // match terminal`);
  }
  return rules;
}

export function sampleCFG3(): string {
  return `S → 0S1 | ε`;
}

export function sampleCFG4(): string {
  return `S → aB | bA
A → a | aS | bAA
B → b | bS | aBB`;
}
