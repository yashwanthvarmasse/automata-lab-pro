import type { FAState, FATransition } from "@/lib/automata-engine";
import { generateTransitionTable, getAlphabet } from "@/lib/automata-engine";

interface TransitionTableProps {
  states: FAState[];
  transitions: FATransition[];
}

const TransitionTableView = ({ states, transitions }: TransitionTableProps) => {
  const table = generateTransitionTable({ states, transitions, alphabet: [] });
  const alphabet = getAlphabet(transitions);
  const hasEpsilon = transitions.some((t) => t.symbol === "ε");
  const symbols = hasEpsilon ? [...alphabet, "ε"] : alphabet;

  if (states.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No states defined yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 text-muted-foreground">State</th>
            {symbols.map((sym) => (
              <th key={sym} className="text-center py-2 px-2 text-primary">
                {sym}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {states.map((state) => (
            <tr key={state.id} className="border-b border-border/50 hover:bg-muted/30">
              <td className="py-2 px-2">
                <span className="text-foreground">
                  {state.isStart && "→ "}
                  {state.isAccept && "* "}
                  {state.label}
                </span>
              </td>
              {symbols.map((sym) => {
                const targets = table[state.id]?.[sym] || [];
                const targetLabels = targets.map(
                  (tid) => states.find((s) => s.id === tid)?.label || tid
                );
                return (
                  <td key={sym} className="text-center py-2 px-2 text-muted-foreground">
                    {targetLabels.length > 0
                      ? `{${targetLabels.join(",")}}`
                      : "∅"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TransitionTableView;
