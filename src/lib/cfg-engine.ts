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

// Convert to Chomsky Normal Form
export function convertToCNF(cfg: CFG): CFG {
  const prods: Production[] = [...cfg.productions];
  const nts = new Set(cfg.nonTerminals);
  let counter = 0;

  // Step 1: Remove ε-productions (simplified)
  const nullable = new Set<string>();
  let ch = true;
  while (ch) {
    ch = false;
    for (const p of prods) {
      if (!nullable.has(p.head) && (p.body.length === 0 || p.body.every(s => nullable.has(s)))) {
        nullable.add(p.head);
        ch = true;
      }
    }
  }

  // Step 2: For each production with body > 2, break down
  const cnfProds: Production[] = [];

  for (const p of prods) {
    if (p.body.length === 0) {
      if (p.head === cfg.startSymbol) cnfProds.push(p);
      continue;
    }
    if (p.body.length === 1) {
      if (cfg.terminals.includes(p.body[0])) {
        cnfProds.push(p);
      } else {
        // Unit production - inline
        const targetProds = prods.filter(pp => pp.head === p.body[0]);
        for (const tp of targetProds) {
          cnfProds.push({ head: p.head, body: [...tp.body] });
        }
      }
      continue;
    }
    if (p.body.length === 2) {
      // Replace terminals with nonterminals
      const newBody = p.body.map(s => {
        if (cfg.terminals.includes(s)) {
          const newNT = `T${s.toUpperCase()}`;
          if (!nts.has(newNT)) {
            nts.add(newNT);
            cnfProds.push({ head: newNT, body: [s] });
          }
          return newNT;
        }
        return s;
      });
      cnfProds.push({ head: p.head, body: newBody });
      continue;
    }

    // body > 2: chain
    let current = p.body.map(s => {
      if (cfg.terminals.includes(s)) {
        const newNT = `T${s.toUpperCase()}`;
        if (!nts.has(newNT)) {
          nts.add(newNT);
          cnfProds.push({ head: newNT, body: [s] });
        }
        return newNT;
      }
      return s;
    });

    let head = p.head;
    while (current.length > 2) {
      const newNT = `X${counter++}`;
      nts.add(newNT);
      cnfProds.push({ head, body: [current[0], newNT] });
      head = newNT;
      current = current.slice(1);
    }
    cnfProds.push({ head, body: current });
  }

  const terminals = Array.from(new Set(cnfProds.flatMap(p => p.body).filter(s => !nts.has(s))));

  return {
    nonTerminals: Array.from(nts),
    terminals,
    productions: cnfProds,
    startSymbol: cfg.startSymbol,
  };
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
