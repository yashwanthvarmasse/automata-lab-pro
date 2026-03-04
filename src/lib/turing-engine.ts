// Turing Machine Engine

export interface TMState {
  id: string;
  label: string;
  x: number;
  y: number;
  isStart: boolean;
  isAccept: boolean;
  isReject: boolean;
}

export interface TMTransition {
  id: string;
  from: string;
  to: string;
  read: string;
  write: string;
  direction: "L" | "R" | "S"; // Left, Right, Stay
}

export interface TMConfig {
  states: TMState[];
  transitions: TMTransition[];
  tape: string[];
  headPosition: number;
  currentState: string;
  status: "ready" | "running" | "accepted" | "rejected" | "halted";
  stepCount: number;
}

export interface TMStep {
  tape: string[];
  headPosition: number;
  currentState: string;
  status: TMConfig["status"];
  transition: TMTransition | null;
}

export function createBlankTape(input: string, padding: number = 10): string[] {
  const tape: string[] = [];
  for (let i = 0; i < padding; i++) tape.push("_");
  for (const ch of input) tape.push(ch);
  for (let i = 0; i < padding; i++) tape.push("_");
  return tape;
}

export function initTM(states: TMState[], transitions: TMTransition[], input: string): TMConfig {
  const startState = states.find(s => s.isStart);
  const tape = createBlankTape(input);
  return {
    states,
    transitions,
    tape,
    headPosition: 10, // after padding
    currentState: startState?.id || "",
    status: "ready",
    stepCount: 0,
  };
}

export function stepTM(config: TMConfig): TMStep {
  const { states, transitions, tape, headPosition, currentState } = config;

  const currentSym = tape[headPosition] || "_";

  // Find matching transition
  const trans = transitions.find(t => t.from === currentState && t.read === currentSym);

  if (!trans) {
    // No transition: check if current state is accept/reject
    const state = states.find(s => s.id === currentState);
    const status = state?.isAccept ? "accepted" : state?.isReject ? "rejected" : "halted";
    return { tape: [...tape], headPosition, currentState, status, transition: null };
  }

  // Apply transition
  const newTape = [...tape];
  newTape[headPosition] = trans.write;

  let newHead = headPosition;
  if (trans.direction === "L") newHead = Math.max(0, headPosition - 1);
  else if (trans.direction === "R") {
    newHead = headPosition + 1;
    if (newHead >= newTape.length) newTape.push("_");
  }

  // Extend tape left if needed
  if (newHead === 0 && trans.direction === "L") {
    newTape.unshift("_");
    newHead = 0;
  }

  const newState = trans.to;
  const nextState = states.find(s => s.id === newState);
  const status = nextState?.isAccept ? "accepted" : nextState?.isReject ? "rejected" : "running";

  return { tape: newTape, headPosition: newHead, currentState: newState, status, transition: trans };
}

export function runTM(config: TMConfig, maxSteps: number = 1000): TMStep[] {
  const steps: TMStep[] = [];
  let current = { ...config, status: "running" as TMConfig["status"] };

  for (let i = 0; i < maxSteps; i++) {
    const step = stepTM(current);
    steps.push(step);

    if (step.status !== "running") break;

    current = {
      ...current,
      tape: step.tape,
      headPosition: step.headPosition,
      currentState: step.currentState,
      stepCount: current.stepCount + 1,
    };
  }

  if (steps.length === maxSteps && steps[steps.length - 1].status === "running") {
    steps[steps.length - 1].status = "halted";
  }

  return steps;
}

// Sample: Binary increment TM
export function sampleTM(): { states: TMState[]; transitions: TMTransition[] } {
  const states: TMState[] = [
    { id: "q0", label: "q₀ (scan right)", x: 100, y: 200, isStart: true, isAccept: false, isReject: false },
    { id: "q1", label: "q₁ (carry)", x: 300, y: 200, isStart: false, isAccept: false, isReject: false },
    { id: "q2", label: "q₂ (done)", x: 500, y: 200, isStart: false, isAccept: true, isReject: false },
  ];
  const transitions: TMTransition[] = [
    // q0: scan right to end
    { id: "tm1", from: "q0", to: "q0", read: "0", write: "0", direction: "R" },
    { id: "tm2", from: "q0", to: "q0", read: "1", write: "1", direction: "R" },
    { id: "tm3", from: "q0", to: "q1", read: "_", write: "_", direction: "L" },
    // q1: carry/increment
    { id: "tm4", from: "q1", to: "q1", read: "1", write: "0", direction: "L" },
    { id: "tm5", from: "q1", to: "q2", read: "0", write: "1", direction: "S" },
    { id: "tm6", from: "q1", to: "q2", read: "_", write: "1", direction: "S" },
  ];
  return { states, transitions };
}

// Sample: Palindrome checker
export function samplePalindromeTM(): { states: TMState[]; transitions: TMTransition[] } {
  const states: TMState[] = [
    { id: "q0", label: "q₀ (start)", x: 100, y: 200, isStart: true, isAccept: false, isReject: false },
    { id: "q1", label: "q₁ (match-a)", x: 250, y: 100, isStart: false, isAccept: false, isReject: false },
    { id: "q2", label: "q₂ (match-b)", x: 250, y: 300, isStart: false, isAccept: false, isReject: false },
    { id: "q3", label: "q₃ (return)", x: 400, y: 200, isStart: false, isAccept: false, isReject: false },
    { id: "qa", label: "Accept", x: 550, y: 100, isStart: false, isAccept: true, isReject: false },
    { id: "qr", label: "Reject", x: 550, y: 300, isStart: false, isAccept: false, isReject: true },
  ];
  return { states, transitions: [] };
}
