import { it } from "vitest";
import { parseCFG, convertToCNFDetailed, cfgToString, cykParseWithTree } from "@/lib/cfg-engine";
it("dbg", () => {
  const g = parseCFG("S → 0S1 | ε");
  console.log(JSON.stringify(g));
  const { cnf, steps } = convertToCNFDetailed(g);
  for (const s of steps) console.log(s.title, "\n", cfgToString(s.grammar));
  console.log("start", cnf.startSymbol, cykParseWithTree(cnf, "0011").accepted);
});
