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

  const angleStep = (2 * Math.PI) / Math.max(frag.states.length, 1);
  const radius = Math.min(200, frag.states.length * 25);

  const states: FAState[] = frag.states.map((id, i) => ({
    id,
    label: id,
    x: 350 + radius * Math.cos(angleStep * i - Math.PI / 2),
    y: 280 + radius * Math.sin(angleStep * i - Math.PI / 2),
    isStart: id === frag.start,
    isAccept: id === frag.accept,
  }));

  return { states, transitions: frag.transitions, alphabet: getAlphabet(frag.transitions) };
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
