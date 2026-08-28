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

// Move function
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

// Simulate string on automaton
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

// Layered left-to-right layout (BFS from start) so generated diagrams read cleanly
export function layoutAutomaton(states: FAState[], transitions: FATransition[]): FAState[] {
  if (states.length === 0) return states;
  const start = states.find((s) => s.isStart) ?? states[0];

  const depth = new Map<string, number>([[start.id, 0]]);
  const queue = [start.id];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = depth.get(cur)!;
    transitions
      .filter((t) => t.from === cur)
      .forEach((t) => {
        if (!depth.has(t.to)) {
          depth.set(t.to, d + 1);
          queue.push(t.to);
        }
      });
  }
  let maxDepth = 0;
  depth.forEach((d) => (maxDepth = Math.max(maxDepth, d)));
  states.forEach((s) => {
    if (!depth.has(s.id)) depth.set(s.id, maxDepth + 1);
  });

  const layers = new Map<number, string[]>();
  states.forEach((s) => {
    const d = depth.get(s.id)!;
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d)!.push(s.id);
  });

  const X0 = 140, Y0 = 260, X_GAP = 190, Y_GAP = 130;
  const positions = new Map<string, { x: number; y: number }>();
  layers.forEach((ids, d) => {
    ids.forEach((id, i) => {
      positions.set(id, {
        x: X0 + d * X_GAP,
        y: Y0 + (i - (ids.length - 1) / 2) * Y_GAP,
      });
    });
  });

  return states.map((s) => ({ ...s, ...positions.get(s.id)! }));
}

// NFA to DFA conversion (Subset Construction) — subset labels like q0q1
export function nfaToDfa(automaton: Automaton): Automaton {
  const startState = automaton.states.find((s) => s.isStart);
  if (!startState) return { states: [], transitions: [], alphabet: [] };

  const alphabet = getAlphabet(automaton.transitions);
  const order = new Map(automaton.states.map((s, i) => [s.id, i]));
  const sortIds = (ids: string[]) =>
    [...ids].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));

  const startClosure = sortIds(epsilonClosure([startState.id], automaton.transitions));
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
      const closure = sortIds(epsilonClosure(moveResult, automaton.transitions));

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

  const stateKeys = Array.from(dfaStatesMap.keys());

  const dfaStates: FAState[] = stateKeys.map((key) => {
    const nfaIds = dfaStatesMap.get(key)!;
    const label = nfaIds
      .map((sid) => automaton.states.find((s) => s.id === sid)?.label || sid)
      .join("");
    const isAccept = nfaIds.some((sid) =>
      automaton.states.find((s) => s.id === sid)?.isAccept
    );

    return {
      id: key,
      label,
      x: 0,
      y: 0,
      isStart: key === startKey,
      isAccept,
    };
  });

  return {
    states: layoutAutomaton(dfaStates, dfaTransitions),
    transitions: dfaTransitions,
    alphabet,
  };
}

// DFA Minimization (Hopcroft's algorithm)
export function minimizeDFA(automaton: Automaton): Automaton {
  const { states, transitions, alphabet: inputAlphabet } = automaton;
  const alphabet = inputAlphabet.length > 0 ? inputAlphabet : getAlphabet(transitions);
  
  if (states.length === 0) return automaton;

  // Build transition map
  const transMap = new Map<string, Map<string, string>>();
  states.forEach(s => transMap.set(s.id, new Map()));
  transitions.forEach(t => {
    transMap.get(t.from)?.set(t.symbol, t.to);
  });

  // Initial partition: accept vs non-accept
  const acceptIds = new Set(states.filter(s => s.isAccept).map(s => s.id));
  const nonAcceptIds = new Set(states.filter(s => !s.isAccept).map(s => s.id));

  let partitions: Set<string>[] = [];
  if (acceptIds.size > 0) partitions.push(acceptIds);
  if (nonAcceptIds.size > 0) partitions.push(nonAcceptIds);

  // Refine partitions
  let changed = true;
  while (changed) {
    changed = false;
    const newPartitions: Set<string>[] = [];
    
    for (const partition of partitions) {
      const splits = new Map<string, Set<string>>();
      
      for (const stateId of partition) {
        // Build signature: for each symbol, which partition does the target belong to?
        const sig = alphabet.map(sym => {
          const target = transMap.get(stateId)?.get(sym);
          if (!target) return -1;
          return partitions.findIndex(p => p.has(target));
        }).join(",");
        
        if (!splits.has(sig)) splits.set(sig, new Set());
        splits.get(sig)!.add(stateId);
      }
      
      if (splits.size > 1) changed = true;
      for (const group of splits.values()) {
        newPartitions.push(group);
      }
    }
    
    partitions = newPartitions;
  }

  // Build minimized DFA
  const stateToPartition = new Map<string, number>();
  partitions.forEach((p, i) => {
    for (const sid of p) stateToPartition.set(sid, i);
  });

  const angleStep = (2 * Math.PI) / Math.max(partitions.length, 1);
  const radius = Math.min(150, partitions.length * 35);

  const minStates: FAState[] = partitions.map((partition, i) => {
    const representative = states.find(s => partition.has(s.id))!;
    return {
      id: `mq${i}`,
      label: `q${i}`,
      x: 300 + radius * Math.cos(angleStep * i - Math.PI / 2),
      y: 250 + radius * Math.sin(angleStep * i - Math.PI / 2),
      isStart: Array.from(partition).some(sid => states.find(s => s.id === sid)?.isStart),
      isAccept: Array.from(partition).some(sid => states.find(s => s.id === sid)?.isAccept),
    };
  });

  const minTransitions: FATransition[] = [];
  const seenTrans = new Set<string>();
  let tCounter = 0;

  partitions.forEach((partition, i) => {
    const representative = Array.from(partition)[0];
    alphabet.forEach(sym => {
      const target = transMap.get(representative)?.get(sym);
      if (target === undefined) return;
      const targetPartition = stateToPartition.get(target)!;
      const key = `${i}-${sym}-${targetPartition}`;
      if (seenTrans.has(key)) return;
      seenTrans.add(key);
      minTransitions.push({
        id: `mt_${tCounter++}`,
        from: `mq${i}`,
        to: `mq${targetPartition}`,
        symbol: sym,
      });
    });
  });

  return { states: minStates, transitions: minTransitions, alphabet };
}

// Create a sample DFA
export function createSampleDFA(): Automaton {
  return {
    states: [
      { id: "q0", label: "q0", x: 150, y: 200, isStart: true, isAccept: false },
      { id: "q1", label: "q1", x: 350, y: 120, isStart: false, isAccept: false },
      { id: "q2", label: "q2", x: 550, y: 200, isStart: false, isAccept: true },
      { id: "q3", label: "q3", x: 350, y: 320, isStart: false, isAccept: false },
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
