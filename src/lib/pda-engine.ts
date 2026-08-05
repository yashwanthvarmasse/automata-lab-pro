// PDA Engine — nondeterministic pushdown automata simulation (manual TS, no libraries)

export interface PDAState {
  id: string;
  label: string;
  x: number;
  y: number;
  isStart: boolean;
  isAccept: boolean;
}

export interface PDATransition {
  id: string;
  from: string;
  to: string;
  read: string;  // input symbol or "ε"
  pop: string;   // stack top to pop, or "ε"
  push: string;  // string pushed (leftmost = new top), or "ε"
}

export interface PDAConfig {
  state: string;
  position: number;   // index into input
  stack: string[];    // index 0 = top
}

export interface PDAStep {
  id: string;
  config: PDAConfig;
  transition: PDATransition | null;
  parentId: string | null;
  depth: number;
  status: "running" | "accepted" | "rejected" | "stuck";
}

export interface PDASimulation {
  steps: PDAStep[];         // accepting path if found, else the deepest explored path
  accepted: boolean;
  exploredCount: number;
  truncated: boolean;
  acceptanceMode: AcceptanceMode;
}

export type AcceptanceMode = "final-state" | "empty-stack";

export const EPSILON = "ε";
export const BOTTOM = "Z₀";

const isEps = (s: string) => s === "" || s === EPSILON || s === "e" || s === "epsilon";

/** Split a push string into stack symbols; subscripts/primes attach to the previous symbol. */
export function tokenizeStack(push: string): string[] {
  const out: string[] = [];
  for (const ch of push) {
    if (ch === " ") continue;
    if (out.length && /['’₀-₉]/.test(ch)) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

function keyOf(c: PDAConfig) {
  return `${c.state}|${c.position}|${c.stack.join(",")}`;
}

function isAccepting(
  c: PDAConfig,
  states: PDAState[],
  input: string,
  mode: AcceptanceMode
): boolean {
  if (c.position !== input.length) return false;
  if (mode === "empty-stack") return c.stack.length === 0;
  return !!states.find(s => s.id === c.state)?.isAccept;
}

/** Successor configurations reachable in one move. */
export function nextConfigs(
  config: PDAConfig,
  transitions: PDATransition[],
  input: string
): { config: PDAConfig; transition: PDATransition }[] {
  const out: { config: PDAConfig; transition: PDATransition }[] = [];
  const top = config.stack[0];

  for (const t of transitions) {
    if (t.from !== config.state) continue;

    // input match
    let consumed = 0;
    if (!isEps(t.read)) {
      if (input[config.position] !== t.read) continue;
      consumed = 1;
    }

    // stack match
    let rest = config.stack;
    if (!isEps(t.pop)) {
      if (top !== t.pop) continue;
      rest = config.stack.slice(1);
    }

    const pushed = isEps(t.push) ? [] : tokenizeStack(t.push);
    const newStack = [...pushed, ...rest];

    out.push({
      config: { state: t.to, position: config.position + consumed, stack: newStack },
      transition: t,
    });
  }
  return out;
}

/**
 * BFS over configurations. Returns the accepting path when one exists,
 * otherwise the deepest path explored (so the UI can still animate a run).
 */
export function simulatePDA(
  states: PDAState[],
  transitions: PDATransition[],
  input: string,
  mode: AcceptanceMode = "final-state",
  maxConfigs = 8000
): PDASimulation {
  const start = states.find(s => s.isStart);
  if (!start) {
    return { steps: [], accepted: false, exploredCount: 0, truncated: false, acceptanceMode: mode };
  }

  const initial: PDAStep = {
    id: "s0",
    config: { state: start.id, position: 0, stack: [BOTTOM] },
    transition: null,
    parentId: null,
    depth: 0,
    status: "running",
  };

  const all = new Map<string, PDAStep>([[initial.id, initial]]);
  const visited = new Set<string>([keyOf(initial.config)]);
  const queue: PDAStep[] = [initial];
  let counter = 1;
  let deepest = initial;
  let accepting: PDAStep | null = null;
  let explored = 0;
  let truncated = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    explored++;

    if (isAccepting(current.config, states, input, mode)) {
      current.status = "accepted";
      accepting = current;
      break;
    }
    if (explored >= maxConfigs) { truncated = true; break; }

    const succ = nextConfigs(current.config, transitions, input);
    if (succ.length === 0) current.status = "stuck";

    for (const s of succ) {
      const k = keyOf(s.config);
      if (visited.has(k)) continue;
      visited.add(k);
      const step: PDAStep = {
        id: `s${counter++}`,
        config: s.config,
        transition: s.transition,
        parentId: current.id,
        depth: current.depth + 1,
        status: "running",
      };
      all.set(step.id, step);
      if (step.depth > deepest.depth) deepest = step;
      queue.push(step);
    }
  }

  const target = accepting ?? deepest;
  const path: PDAStep[] = [];
  let node: PDAStep | undefined = target;
  while (node) {
    path.unshift(node);
    node = node.parentId ? all.get(node.parentId) : undefined;
  }
  if (!accepting && path.length > 0) {
    path[path.length - 1] = { ...path[path.length - 1], status: "rejected" };
  }

  return {
    steps: path,
    accepted: !!accepting,
    exploredCount: explored,
    truncated,
    acceptanceMode: mode,
  };
}

export function transitionLabel(t: PDATransition): string {
  const r = isEps(t.read) ? EPSILON : t.read;
  const p = isEps(t.pop) ? EPSILON : t.pop;
  const q = isEps(t.push) ? EPSILON : t.push;
  return `${r}, ${p} → ${q}`;
}

/** Rough determinism check: no two transitions on overlapping (state, read, pop). */
export function isDeterministic(transitions: PDATransition[]): boolean {
  for (let i = 0; i < transitions.length; i++) {
    for (let j = i + 1; j < transitions.length; j++) {
      const a = transitions[i], b = transitions[j];
      if (a.from !== b.from) continue;
      const readClash = isEps(a.read) || isEps(b.read) || a.read === b.read;
      const popClash = isEps(a.pop) || isEps(b.pop) || a.pop === b.pop;
      if (readClash && popClash) return false;
    }
  }
  return true;
}

export interface PDADefinition {
  name: string;
  description: string;
  input: string;
  mode: AcceptanceMode;
  states: PDAState[];
  transitions: PDATransition[];
}

export const SAMPLE_PDAS: PDADefinition[] = [
  {
    name: "aⁿbⁿ",
    description: "Accepts { aⁿbⁿ | n ≥ 1 } by final state",
    input: "aaabbb",
    mode: "final-state",
    states: [
      { id: "q0", label: "q₀", x: 90, y: 120, isStart: true, isAccept: false },
      { id: "q1", label: "q₁", x: 290, y: 120, isStart: false, isAccept: false },
      { id: "q2", label: "q₂", x: 490, y: 120, isStart: false, isAccept: true },
    ],
    transitions: [
      { id: "p1", from: "q0", to: "q0", read: "a", pop: "Z₀", push: "AZ₀" },
      { id: "p2", from: "q0", to: "q0", read: "a", pop: "A", push: "AA" },
      { id: "p3", from: "q0", to: "q1", read: "b", pop: "A", push: EPSILON },
      { id: "p4", from: "q1", to: "q1", read: "b", pop: "A", push: EPSILON },
      { id: "p5", from: "q1", to: "q2", read: EPSILON, pop: "Z₀", push: "Z₀" },
    ],
  },
  {
    name: "Balanced parentheses",
    description: "Accepts balanced ( ) strings by empty stack",
    input: "(()())",
    mode: "empty-stack",
    states: [
      { id: "q0", label: "q₀", x: 90, y: 120, isStart: true, isAccept: false },
      { id: "q1", label: "q₁", x: 340, y: 120, isStart: false, isAccept: true },
    ],
    transitions: [
      { id: "b1", from: "q0", to: "q0", read: "(", pop: "Z₀", push: "XZ₀" },
      { id: "b2", from: "q0", to: "q0", read: "(", pop: "X", push: "XX" },
      { id: "b3", from: "q0", to: "q0", read: ")", pop: "X", push: EPSILON },
      { id: "b4", from: "q0", to: "q1", read: EPSILON, pop: "Z₀", push: EPSILON },
    ],
  },
  {
    name: "Even palindromes wwᴿ",
    description: "Nondeterministic PDA for { wwᴿ | w ∈ {a,b}* }",
    input: "abba",
    mode: "final-state",
    states: [
      { id: "q0", label: "q₀ (push)", x: 90, y: 120, isStart: true, isAccept: false },
      { id: "q1", label: "q₁ (match)", x: 320, y: 120, isStart: false, isAccept: false },
      { id: "q2", label: "q₂", x: 540, y: 120, isStart: false, isAccept: true },
    ],
    transitions: [
      { id: "w1", from: "q0", to: "q0", read: "a", pop: "Z₀", push: "aZ₀" },
      { id: "w2", from: "q0", to: "q0", read: "b", pop: "Z₀", push: "bZ₀" },
      { id: "w3", from: "q0", to: "q0", read: "a", pop: "a", push: "aa" },
      { id: "w4", from: "q0", to: "q0", read: "a", pop: "b", push: "ab" },
      { id: "w5", from: "q0", to: "q0", read: "b", pop: "a", push: "ba" },
      { id: "w6", from: "q0", to: "q0", read: "b", pop: "b", push: "bb" },
      { id: "w7", from: "q0", to: "q1", read: EPSILON, pop: EPSILON, push: EPSILON },
      { id: "w8", from: "q1", to: "q1", read: "a", pop: "a", push: EPSILON },
      { id: "w9", from: "q1", to: "q1", read: "b", pop: "b", push: EPSILON },
      { id: "w10", from: "q1", to: "q2", read: EPSILON, pop: "Z₀", push: "Z₀" },
    ],
  },
  {
    name: "Equal a's and b's",
    description: "Accepts strings with #a = #b by empty stack",
    input: "abbaba",
    mode: "empty-stack",
    states: [
      { id: "q0", label: "q₀", x: 90, y: 120, isStart: true, isAccept: false },
      { id: "q1", label: "q₁", x: 340, y: 120, isStart: false, isAccept: true },
    ],
    transitions: [
      { id: "e1", from: "q0", to: "q0", read: "a", pop: "Z₀", push: "AZ₀" },
      { id: "e2", from: "q0", to: "q0", read: "b", pop: "Z₀", push: "BZ₀" },
      { id: "e3", from: "q0", to: "q0", read: "a", pop: "A", push: "AA" },
      { id: "e4", from: "q0", to: "q0", read: "b", pop: "B", push: "BB" },
      { id: "e5", from: "q0", to: "q0", read: "a", pop: "B", push: EPSILON },
      { id: "e6", from: "q0", to: "q0", read: "b", pop: "A", push: EPSILON },
      { id: "e7", from: "q0", to: "q1", read: EPSILON, pop: "Z₀", push: EPSILON },
    ],
  },
];

export function samplePDA(): PDADefinition {
  return SAMPLE_PDAS[0];
}
