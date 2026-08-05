import { describe, it, expect } from "vitest";
import { simulatePDA, SAMPLE_PDAS } from "@/lib/pda-engine";
import { parseCFG, convertToCNFDetailed, cykParseWithTree, generateStrings, leftmostDerivation, sampleCFG3 } from "@/lib/cfg-engine";
import { initTM, runTM, TM_SAMPLES } from "@/lib/turing-engine";

describe("pda", () => {
  for (const s of SAMPLE_PDAS) {
    it(s.name, () => {
      expect(simulatePDA(s.states, s.transitions, s.input, s.mode).accepted).toBe(true);
    });
  }
  it("rejects", () => {
    const s = SAMPLE_PDAS[0];
    expect(simulatePDA(s.states, s.transitions, "aabbb", s.mode).accepted).toBe(false);
  });
});

describe("cfg", () => {
  it("cyk", () => {
    const g = parseCFG("S → aSb | ab");
    const { cnf } = convertToCNFDetailed(g);
    expect(cykParseWithTree(cnf, "aabb").accepted).toBe(true);
    expect(cykParseWithTree(cnf, "aab").accepted).toBe(false);
    expect(cykParseWithTree(cnf, "aabb").tree).toBeTruthy();
  });
  it("eps", () => {
    const g = parseCFG(sampleCFG3());
    const { cnf } = convertToCNFDetailed(g);
    expect(cykParseWithTree(cnf, "0011").accepted).toBe(true);
    expect(generateStrings(g).length).toBeGreaterThan(1);
    expect(leftmostDerivation(g, "0011")).toBeTruthy();
  });
});

describe("tm", () => {
  it("palindrome", () => {
    const p = TM_SAMPLES[1].build();
    expect(runTM(initTM(p.states, p.transitions, "abba")).at(-1)!.status).toBe("accepted");
    expect(runTM(initTM(p.states, p.transitions, "abb")).at(-1)!.status).toBe("rejected");
  });
  it("anbn", () => {
    const p = TM_SAMPLES[2].build();
    expect(runTM(initTM(p.states, p.transitions, "000111")).at(-1)!.status).toBe("accepted");
    expect(runTM(initTM(p.states, p.transitions, "0011 1".replace(" ",""))).at(-1)!.status).toBe("accepted");
    expect(runTM(initTM(p.states, p.transitions, "0011")).at(-1)!.status).toBe("accepted");
    expect(runTM(initTM(p.states, p.transitions, "0101")).at(-1)!.status).toBe("rejected");
  });
});
