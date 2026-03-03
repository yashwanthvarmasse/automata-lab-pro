// Automata Engine - Core algorithms for finite automata

export interface FAState {
  id: string;
  label: string;
  x: number;
  y: number;
  isStart: boolean;
  isAccept: boolean;
}

export interface FATransition {
  id: string;
  from: string;
  to: string;
  symbol: string;
}

export interface Automaton {
  states: FAState[];
  transitions: FATransition[];
  alphabet: string[];
}

export interface SimulationStep {
  currentStates: string[];
  symbol: string | null;
  position: number;
  status: "running" | "accepted" | "rejected";
}

// Get alphabet from transitions
export function getAlphabet(transitions: FATransition[]): string[] {
  const symbols = new Set<string>();
  transitions.forEach((t) => {
    if (t.symbol !== "ε") symbols.add(t.symbol);
  });
  return Array.from(symbols).sort();
}

// Epsilon closure for NFA
export function epsilonClosure(
  stateIds: string[],
  transitions: FATransition[]
): string[] {
  const closure = new Set(stateIds);
  const stack = [...stateIds];

  while (stack.length > 0) {
    const current = stack.pop()!;
    transitions
      .filter((t) => t.from === current && t.symbol === "ε")
      .forEach((t) => {
        if (!closure.has(t.to)) {
          closure.add(t.to);
          stack.push(t.to);
        }
      });
  }
  return Array.from(closure);
}

// Move function: given states and symbol, return reachable states
export function move(
  stateIds: string[],
  symbol: string,
  transitions: FATransition[]
): string[] {
  const result = new Set<string>();
  stateIds.forEach((sid) => {
    transitions
      .filter((t) => t.from === sid && t.symbol === symbol)
      .forEach((t) => result.add(t.to));
  });
  return Array.from(result);
}

// Simulate string on automaton (supports NFA with epsilon)
export function simulateString(
  automaton: Automaton,
  input: string
): SimulationStep[] {
  const steps: SimulationStep[] = [];
  const startState = automaton.states.find((s) => s.isStart);
  if (!startState) {
    return [{ currentStates: [], symbol: null, position: 0, status: "rejected" }];
  }

  let currentStates = epsilonClosure([startState.id], automaton.transitions);
  steps.push({
    currentStates: [...currentStates],
    symbol: null,
    position: 0,
    status: "running",
  });

  for (let i = 0; i < input.length; i++) {
    const symbol = input[i];
    const nextStates = move(currentStates, symbol, automaton.transitions);
    currentStates = epsilonClosure(nextStates, automaton.transitions);

    const isLast = i === input.length - 1;
    const accepted = isLast && currentStates.some((sid) =>
      automaton.states.find((s) => s.id === sid)?.isAccept
    );

    steps.push({
      currentStates: [...currentStates],
      symbol,
      position: i + 1,
      status: isLast
        ? currentStates.length === 0
          ? "rejected"
          : accepted
            ? "accepted"
            : "rejected"
        : "running",
    });
  }

  // If empty string
  if (input.length === 0) {
    const accepted = currentStates.some((sid) =>
      automaton.states.find((s) => s.id === sid)?.isAccept
    );
    steps[0].status = accepted ? "accepted" : "rejected";
  }

  return steps;
}

// Generate transition table
export function generateTransitionTable(
  automaton: Automaton
): Record<string, Record<string, string[]>> {
  const table: Record<string, Record<string, string[]>> = {};
  const alphabet = getAlphabet(automaton.transitions);
  const hasEpsilon = automaton.transitions.some((t) => t.symbol === "ε");
  const symbols = hasEpsilon ? [...alphabet, "ε"] : alphabet;

  automaton.states.forEach((state) => {
    table[state.id] = {};
    symbols.forEach((sym) => {
      const targets = automaton.transitions
        .filter((t) => t.from === state.id && t.symbol === sym)
        .map((t) => t.to);
      table[state.id][sym] = targets;
    });
  });

  return table;
}

// NFA to DFA conversion (Subset Construction)
export function nfaToDfa(automaton: Automaton): Automaton {
  const startState = automaton.states.find((s) => s.isStart);
  if (!startState) return { states: [], transitions: [], alphabet: [] };

  const alphabet = getAlphabet(automaton.transitions);
  const startClosure = epsilonClosure([startState.id], automaton.transitions).sort();
  const startKey = startClosure.join(",");

  const dfaStatesMap = new Map<string, string[]>();
  dfaStatesMap.set(startKey, startClosure);
  const queue = [startKey];
  const visited = new Set<string>();
  const dfaTransitions: FATransition[] = [];

  let counter = 0;

  while (queue.length > 0) {
    const currentKey = queue.shift()!;
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);

    const currentStates = dfaStatesMap.get(currentKey)!;

    alphabet.forEach((symbol) => {
      const moveResult = move(currentStates, symbol, automaton.transitions);
      const closure = epsilonClosure(moveResult, automaton.transitions).sort();

      if (closure.length === 0) return;

      const closureKey = closure.join(",");
      if (!dfaStatesMap.has(closureKey)) {
        dfaStatesMap.set(closureKey, closure);
        queue.push(closureKey);
      }

      dfaTransitions.push({
        id: `dt_${counter++}`,
        from: currentKey,
        to: closureKey,
        symbol,
      });
    });
  }

  // Create DFA states
  const stateKeys = Array.from(dfaStatesMap.keys());
  const angleStep = (2 * Math.PI) / Math.max(stateKeys.length, 1);
  const radius = Math.min(150, stateKeys.length * 30);

  const dfaStates: FAState[] = stateKeys.map((key, i) => {
    const nfaIds = dfaStatesMap.get(key)!;
    const isAccept = nfaIds.some((sid) =>
      automaton.states.find((s) => s.id === sid)?.isAccept
    );
    const labels = nfaIds
      .map((sid) => automaton.states.find((s) => s.id === sid)?.label || sid)
      .join(",");

    return {
      id: key,
      label: `{${labels}}`,
      x: 300 + radius * Math.cos(angleStep * i - Math.PI / 2),
      y: 250 + radius * Math.sin(angleStep * i - Math.PI / 2),
      isStart: key === startKey,
      isAccept: isAccept,
    };
  });

  return { states: dfaStates, transitions: dfaTransitions, alphabet };
}

// Create a sample DFA
export function createSampleDFA(): Automaton {
  return {
    states: [
      { id: "q0", label: "q₀", x: 150, y: 200, isStart: true, isAccept: false },
      { id: "q1", label: "q₁", x: 350, y: 120, isStart: false, isAccept: false },
      { id: "q2", label: "q₂", x: 550, y: 200, isStart: false, isAccept: true },
      { id: "q3", label: "q₃", x: 350, y: 320, isStart: false, isAccept: false },
    ],
    transitions: [
      { id: "t1", from: "q0", to: "q1", symbol: "0" },
      { id: "t2", from: "q0", to: "q3", symbol: "1" },
      { id: "t3", from: "q1", to: "q2", symbol: "1" },
      { id: "t4", from: "q1", to: "q1", symbol: "0" },
      { id: "t5", from: "q2", to: "q2", symbol: "0" },
      { id: "t6", from: "q2", to: "q2", symbol: "1" },
      { id: "t7", from: "q3", to: "q3", symbol: "0" },
      { id: "t8", from: "q3", to: "q1", symbol: "1" },
    ],
    alphabet: ["0", "1"],
  };
}
