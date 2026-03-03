import { motion } from "framer-motion";
import { GitBranch } from "lucide-react";

const levels = [
  {
    name: "Type 3 — Regular",
    machine: "Finite Automaton (DFA/NFA)",
    grammar: "Right-linear grammar",
    examples: ["a*b+", "Binary strings ending with 01", "Even number of 0s"],
    pumping: "Regular pumping lemma applies",
    color: "border-primary bg-primary/10 text-primary",
    dotColor: "bg-primary",
  },
  {
    name: "Type 2 — Context-Free",
    machine: "Pushdown Automaton (PDA)",
    grammar: "Context-free grammar (CFG)",
    examples: ["aⁿbⁿ", "Balanced parentheses", "Palindromes"],
    pumping: "CFL pumping lemma applies",
    color: "border-success bg-success/10 text-success",
    dotColor: "bg-success",
  },
  {
    name: "Type 1 — Context-Sensitive",
    machine: "Linear Bounded Automaton (LBA)",
    grammar: "Context-sensitive grammar (CSG)",
    examples: ["aⁿbⁿcⁿ", "ww (copy language)"],
    pumping: "No simple pumping lemma",
    color: "border-accent bg-accent/10 text-accent",
    dotColor: "bg-accent",
  },
  {
    name: "Type 0 — Recursively Enumerable",
    machine: "Turing Machine",
    grammar: "Unrestricted grammar",
    examples: ["Halting problem complement", "Post correspondence problem"],
    pumping: "Undecidable in general",
    color: "border-info bg-info/10 text-info",
    dotColor: "bg-info",
  },
];

const ChomksyHierarchy = () => (
  <motion.div
    className="p-8 max-w-4xl mx-auto"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <div className="flex items-center gap-3 mb-8">
      <div className="p-2.5 rounded-lg bg-primary/20 text-primary">
        <GitBranch className="w-5 h-5" />
      </div>
      <div>
        <h1 className="text-xl font-heading font-bold text-foreground">
          Chomsky Hierarchy
        </h1>
        <p className="text-xs text-muted-foreground">
          Interactive language classification explorer
        </p>
      </div>
    </div>

    {/* Nested set visualization */}
    <div className="relative mb-10">
      <div className="flex items-center justify-center">
        <div className="relative w-full max-w-lg aspect-square">
          {levels
            .slice()
            .reverse()
            .map((level, i) => {
              const size = 100 - i * 20;
              const offset = i * 10;
              return (
                <motion.div
                  key={level.name}
                  className={`absolute rounded-full border-2 ${level.color} flex items-end justify-center pb-4`}
                  style={{
                    width: `${size}%`,
                    height: `${size}%`,
                    top: `${offset}%`,
                    left: `${offset}%`,
                  }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.15, duration: 0.4 }}
                >
                  <span className="text-[10px] font-mono font-medium opacity-80">
                    {level.name.split("—")[1]?.trim()}
                  </span>
                </motion.div>
              );
            })}
        </div>
      </div>
    </div>

    {/* Detail cards */}
    <div className="space-y-4">
      {levels.map((level, i) => (
        <motion.div
          key={level.name}
          className={`glass-panel p-5 border-l-4 ${level.color}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + i * 0.1 }}
        >
          <div className="flex items-start gap-3">
            <div className={`w-2.5 h-2.5 rounded-full mt-1 ${level.dotColor}`} />
            <div className="flex-1 space-y-2">
              <h3 className="font-heading font-semibold text-sm text-foreground">
                {level.name}
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <div>
                  <span className="text-muted-foreground">Machine: </span>
                  <span className="text-foreground font-mono">{level.machine}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Grammar: </span>
                  <span className="text-foreground font-mono">{level.grammar}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {level.examples.map((ex) => (
                  <span
                    key={ex}
                    className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground"
                  >
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

export default ChomksyHierarchy;
