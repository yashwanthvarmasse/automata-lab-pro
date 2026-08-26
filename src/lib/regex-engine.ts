// Regex Engine - Thompson Construction, Regex→NFA→DFA

import { type FAState, type FATransition, type Automaton, epsilonClosure, move, getAlphabet } from "./automata-engine";

// ── AST for regex parsing ──
export type RegexNode =
  | { type: "char"; value: string }
  | { type: "concat"; left: RegexNode; right: RegexNode }
  | { type: "union"; left: RegexNode; right: RegexNode }
  | { type: "star"; child: RegexNode }
  | { type: "plus"; child: RegexNode }
  | { type: "optional"; child: RegexNode }
  | { type: "epsilon" };

// ── Regex Parser (supports: concat, |, *, +, ?, parens) ──
export function parseRegex(input: string): RegexNode {
  let pos = 0;

  function peek(): string | null {
    return pos < input.length ? input[pos] : null;
  }
  function consume(): string {
    return input[pos++];
  }

  function parseUnion(): RegexNode {
    let node = parseConcat();
    while (peek() === "|") {
      consume();
      const right = parseConcat();
      node = { type: "union", left: node, right };
    }
    return node;
  }

  function parseConcat(): RegexNode {
    let node = parseUnary();
    while (peek() !== null && peek() !== ")" && peek() !== "|") {
      const right = parseUnary();
      node = { type: "concat", left: node, right };
    }
    return node;
  }

  function parseUnary(): RegexNode {
    let node = parseAtom();
    while (peek() === "*" || peek() === "+" || peek() === "?") {
      const op = consume();
      if (op === "*") node = { type: "star", child: node };
      else if (op === "+") node = { type: "plus", child: node };
      else node = { type: "optional", child: node };
    }
    return node;
  }

  function parseAtom(): RegexNode {
    const c = peek();
    if (c === "(") {
      consume();
      const node = parseUnion();
      if (peek() === ")") consume();
      return node;
    }
    if (c === "ε" || c === "∅") {
      consume();
      return { type: "epsilon" };
    }
    if (c !== null && c !== ")" && c !== "|" && c !== "*" && c !== "+" && c !== "?") {
      consume();
      return { type: "char", value: c };
    }
    return { type: "epsilon" };
  }

  if (input.trim() === "") return { type: "epsilon" };
  const result = parseUnion();
  return result;
}

// ── Thompson Construction: RegexNode → NFA ──
let stateCounter = 0;

function freshId(): string {
  return `r${stateCounter++}`;
}

interface NFAFragment {
  start: string;
  accept: string;
  states: string[];
  transitions: FATransition[];
}

function thompsonChar(c: string): NFAFragment {
  const s = freshId(), a = freshId();
  return {
    start: s, accept: a,
    states: [s, a],
    transitions: [{ id: `rt_${stateCounter++}`, from: s, to: a, symbol: c }],
  };
}

function thompsonEpsilon(): NFAFragment {
  const s = freshId(), a = freshId();
  return {
    start: s, accept: a,
    states: [s, a],
    transitions: [{ id: `rt_${stateCounter++}`, from: s, to: a, symbol: "ε" }],
  };
}

function thompsonConcat(a: NFAFragment, b: NFAFragment): NFAFragment {
  return {
    start: a.start, accept: b.accept,
    states: [...a.states, ...b.states],
    transitions: [
      ...a.transitions,
      ...b.transitions,
      { id: `rt_${stateCounter++}`, from: a.accept, to: b.start, symbol: "ε" },
    ],
  };
}

function thompsonUnion(a: NFAFragment, b: NFAFragment): NFAFragment {
  const s = freshId(), f = freshId();
  return {
    start: s, accept: f,
    states: [s, f, ...a.states, ...b.states],
    transitions: [
      ...a.transitions,
      ...b.transitions,
      { id: `rt_${stateCounter++}`, from: s, to: a.start, symbol: "ε" },
      { id: `rt_${stateCounter++}`, from: s, to: b.start, symbol: "ε" },
      { id: `rt_${stateCounter++}`, from: a.accept, to: f, symbol: "ε" },
      { id: `rt_${stateCounter++}`, from: b.accept, to: f, symbol: "ε" },
    ],
  };
}

function thompsonStar(a: NFAFragment): NFAFragment {
  const s = freshId(), f = freshId();
  return {
    start: s, accept: f,
    states: [s, f, ...a.states],
    transitions: [
      ...a.transitions,
      { id: `rt_${stateCounter++}`, from: s, to: a.start, symbol: "ε" },
      { id: `rt_${stateCounter++}`, from: s, to: f, symbol: "ε" },
      { id: `rt_${stateCounter++}`, from: a.accept, to: a.start, symbol: "ε" },
      { id: `rt_${stateCounter++}`, from: a.accept, to: f, symbol: "ε" },
    ],
  };
}

function buildNFA(node: RegexNode): NFAFragment {
  switch (node.type) {
    case "char":
      return thompsonChar(node.value);
    case "epsilon":
      return thompsonEpsilon();
    case "concat":
      return thompsonConcat(buildNFA(node.left), buildNFA(node.right));
    case "union":
      return thompsonUnion(buildNFA(node.left), buildNFA(node.right));
    case "star":
      return thompsonStar(buildNFA(node.child));
    case "plus": {
      const inner = buildNFA(node.child);
      const starCopy = thompsonStar(buildNFA(node.child));
      return thompsonConcat(inner, starCopy);
    }
    case "optional": {
      const inner = buildNFA(node.child);
      return thompsonUnion(inner, thompsonEpsilon());
    }
  }
}

export function regexToNFA(regex: string): Automaton {
  stateCounter = 0;
  const ast = parseRegex(regex);
  const frag = buildNFA(ast);

  const states: FAState[] = layoutStates(frag.states, frag.transitions, frag.start, frag.accept);

  return { states, transitions: frag.transitions, alphabet: getAlphabet(frag.transitions) };
}

// ── Layered (left-to-right) layout so Thompson NFAs read cleanly ──
function layoutStates(
  ids: string[],
  transitions: FATransition[],
  startId: string,
  acceptId: string
): FAState[] {
  const outgoing = new Map<string, string[]>();
  ids.forEach((id) => outgoing.set(id, []));
  transitions.forEach((t) => {
    if (!outgoing.has(t.from)) outgoing.set(t.from, []);
    outgoing.get(t.from)!.push(t.to);
  });

  // BFS from start → depth (longest-path-ish via level assignment)
  const depth = new Map<string, number>();
  depth.set(startId, 0);
  const queue = [startId];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = depth.get(cur)!;
    for (const next of outgoing.get(cur) ?? []) {
      if (!depth.has(next) || depth.get(next)! < d + 1) {
        // avoid infinite growth on cycles (star loops)
        if (depth.has(next) && depth.get(next)! >= d + 1) continue;
        if (!depth.has(next)) {
          depth.set(next, d + 1);
          queue.push(next);
        }
      }
    }
  }
  // unreachable / disconnected states get placed after the deepest layer
  let maxDepth = 0;
  depth.forEach((d) => (maxDepth = Math.max(maxDepth, d)));
  ids.forEach((id) => {
    if (!depth.has(id)) depth.set(id, maxDepth + 1);
  });
  // accept state always sits at the far right
  const finalDepth = Math.max(...ids.map((id) => depth.get(id)!));
  depth.set(acceptId, finalDepth);

  const layers = new Map<number, string[]>();
  ids.forEach((id) => {
    const d = depth.get(id)!;
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d)!.push(id);
  });

  const X_GAP = 120;
  const Y_GAP = 100;
  const X0 = 90;
  const Y0 = 260;

  const result: FAState[] = [];
  layers.forEach((layerIds, d) => {
    const n = layerIds.length;
    layerIds.forEach((id, i) => {
      result.push({
        id,
        label: id,
        x: X0 + d * X_GAP,
        y: Y0 + (i - (n - 1) / 2) * Y_GAP,
        isStart: id === startId,
        isAccept: id === acceptId,
      });
    });
  });

  // keep original ordering stable
  return ids.map((id) => result.find((s) => s.id === id)!);
}


// ── Test string against regex NFA ──
export function testRegexString(regex: string, input: string): boolean {
  const nfa = regexToNFA(regex);
  const startState = nfa.states.find(s => s.isStart);
  if (!startState) return false;

  let currentStates = epsilonClosure([startState.id], nfa.transitions);

  for (const ch of input) {
    const nextStates = move(currentStates, ch, nfa.transitions);
    currentStates = epsilonClosure(nextStates, nfa.transitions);
    if (currentStates.length === 0) return false;
  }

  return currentStates.some(sid => nfa.states.find(s => s.id === sid)?.isAccept);
}

// ── Stringify AST for display ──
export function astToString(node: RegexNode): string {
  switch (node.type) {
    case "char": return node.value;
    case "epsilon": return "ε";
    case "concat": return astToString(node.left) + astToString(node.right);
    case "union": return `(${astToString(node.left)}|${astToString(node.right)})`;
    case "star": return `(${astToString(node.child)})*`;
    case "plus": return `(${astToString(node.child)})+`;
    case "optional": return `(${astToString(node.child)})?`;
  }
}
