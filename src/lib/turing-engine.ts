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

// Sample: Palindrome checker over {a, b}
export function samplePalindromeTM(): { states: TMState[]; transitions: TMTransition[] } {
  const states: TMState[] = [
    { id: "q0", label: "q₀ (read left)", x: 100, y: 200, isStart: true, isAccept: false, isReject: false },
    { id: "q1", label: "q₁ (scan→ a)", x: 250, y: 100, isStart: false, isAccept: false, isReject: false },
    { id: "q2", label: "q₂ (scan→ b)", x: 250, y: 300, isStart: false, isAccept: false, isReject: false },
    { id: "q3", label: "q₃ (match a)", x: 400, y: 100, isStart: false, isAccept: false, isReject: false },
    { id: "q4", label: "q₄ (match b)", x: 400, y: 300, isStart: false, isAccept: false, isReject: false },
    { id: "q5", label: "q₅ (return)", x: 550, y: 200, isStart: false, isAccept: false, isReject: false },
    { id: "qa", label: "Accept", x: 700, y: 100, isStart: false, isAccept: true, isReject: false },
    { id: "qr", label: "Reject", x: 700, y: 300, isStart: false, isAccept: false, isReject: true },
  ];
  const transitions: TMTransition[] = [
    { id: "pa1", from: "q0", to: "qa", read: "_", write: "_", direction: "S" },
    { id: "pa2", from: "q0", to: "q1", read: "a", write: "_", direction: "R" },
    { id: "pa3", from: "q0", to: "q2", read: "b", write: "_", direction: "R" },
    { id: "pa4", from: "q1", to: "q1", read: "a", write: "a", direction: "R" },
    { id: "pa5", from: "q1", to: "q1", read: "b", write: "b", direction: "R" },
    { id: "pa6", from: "q1", to: "q3", read: "_", write: "_", direction: "L" },
    { id: "pa7", from: "q2", to: "q2", read: "a", write: "a", direction: "R" },
    { id: "pa8", from: "q2", to: "q2", read: "b", write: "b", direction: "R" },
    { id: "pa9", from: "q2", to: "q4", read: "_", write: "_", direction: "L" },
    { id: "pa10", from: "q3", to: "q5", read: "a", write: "_", direction: "L" },
    { id: "pa11", from: "q3", to: "qr", read: "b", write: "b", direction: "S" },
    { id: "pa12", from: "q3", to: "qa", read: "_", write: "_", direction: "S" },
    { id: "pa13", from: "q4", to: "q5", read: "b", write: "_", direction: "L" },
    { id: "pa14", from: "q4", to: "qr", read: "a", write: "a", direction: "S" },
    { id: "pa15", from: "q4", to: "qa", read: "_", write: "_", direction: "S" },
    { id: "pa16", from: "q5", to: "q5", read: "a", write: "a", direction: "L" },
    { id: "pa17", from: "q5", to: "q5", read: "b", write: "b", direction: "L" },
    { id: "pa18", from: "q5", to: "q0", read: "_", write: "_", direction: "R" },
  ];
  return { states, transitions };
}

// Sample: accepts { 0ⁿ1ⁿ | n ≥ 0 } by crossing off matching pairs
export function sampleAnBnTM(): { states: TMState[]; transitions: TMTransition[] } {
  const states: TMState[] = [
    { id: "q0", label: "q₀ (mark 0)", x: 100, y: 200, isStart: true, isAccept: false, isReject: false },
    { id: "q1", label: "q₁ (find 1)", x: 260, y: 200, isStart: false, isAccept: false, isReject: false },
    { id: "q2", label: "q₂ (return)", x: 420, y: 200, isStart: false, isAccept: false, isReject: false },
    { id: "q3", label: "q₃ (verify)", x: 580, y: 200, isStart: false, isAccept: false, isReject: false },
    { id: "qa", label: "Accept", x: 740, y: 120, isStart: false, isAccept: true, isReject: false },
    { id: "qr", label: "Reject", x: 740, y: 280, isStart: false, isAccept: false, isReject: true },
  ];
  const transitions: TMTransition[] = [
    { id: "n1", from: "q0", to: "q1", read: "0", write: "X", direction: "R" },
    { id: "n2", from: "q0", to: "q3", read: "Y", write: "Y", direction: "R" },
    { id: "n3", from: "q0", to: "qa", read: "_", write: "_", direction: "S" },
    { id: "n4", from: "q0", to: "qr", read: "1", write: "1", direction: "S" },
    { id: "n5", from: "q1", to: "q1", read: "0", write: "0", direction: "R" },
    { id: "n6", from: "q1", to: "q1", read: "Y", write: "Y", direction: "R" },
    { id: "n7", from: "q1", to: "q2", read: "1", write: "Y", direction: "L" },
    { id: "n8", from: "q1", to: "qr", read: "_", write: "_", direction: "S" },
    { id: "n9", from: "q2", to: "q2", read: "0", write: "0", direction: "L" },
    { id: "n10", from: "q2", to: "q2", read: "Y", write: "Y", direction: "L" },
    { id: "n11", from: "q2", to: "q0", read: "X", write: "X", direction: "R" },
    { id: "n12", from: "q3", to: "q3", read: "Y", write: "Y", direction: "R" },
    { id: "n13", from: "q3", to: "qa", read: "_", write: "_", direction: "S" },
    { id: "n14", from: "q3", to: "qr", read: "0", write: "0", direction: "S" },
    { id: "n15", from: "q3", to: "qr", read: "1", write: "1", direction: "S" },
  ];
  return { states, transitions };
}

export interface TMSample {
  name: string;
  input: string;
  build: () => { states: TMState[]; transitions: TMTransition[] };
}

export const TM_SAMPLES: TMSample[] = [
  { name: "Binary increment", input: "1011", build: sampleTM },
  { name: "Palindrome (a/b)", input: "abba", build: samplePalindromeTM },
  { name: "0ⁿ1ⁿ recogniser", input: "000111", build: sampleAnBnTM },
];

