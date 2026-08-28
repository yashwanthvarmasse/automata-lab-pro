import { describe, it, expect } from "vitest";
import { createSampleNFA, nfaToDfa, minimizeDFA, simulateString } from "@/lib/automata-engine";

const acc = (a: any, s: string) => {
  const st = simulateString(a, s);
  return st[st.length - 1].status === "accepted";
};

describe("FA", () => {
  it("nfa ends with 01", () => {
    const n = createSampleNFA();
    expect(acc(n, "01")).toBe(true);
    expect(acc(n, "1101")).toBe(true);
    expect(acc(n, "010")).toBe(false);
  });
  it("dfa equivalent", () => {
    const d = nfaToDfa(createSampleNFA());
    for (const s of ["01","1101","010","","0","11101","0011"]) {
      expect(acc(d, s)).toBe(acc(createSampleNFA(), s));
    }
    // deterministic
    const seen = new Set<string>();
    d.transitions.forEach(t => { const k = t.from+"|"+t.symbol; expect(seen.has(k)).toBe(false); seen.add(k); });
  });
  it("minimized equivalent and no bigger", () => {
    const d = nfaToDfa(createSampleNFA());
    const m = minimizeDFA(d);
    expect(m.states.length).toBeLessThanOrEqual(d.states.length);
    for (const s of ["01","1101","010","","0","11101","0011","101010101"]) {
      expect(acc(m, s)).toBe(acc(d, s));
    }
    expect(m.states.filter(s=>s.isStart).length).toBe(1);
  });
});
