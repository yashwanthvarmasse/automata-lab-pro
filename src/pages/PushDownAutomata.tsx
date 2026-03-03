import { motion } from "framer-motion";
import { Layers } from "lucide-react";

const PushDownAutomata = () => (
  <motion.div
    className="p-8"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2.5 rounded-lg bg-info/20 text-info">
        <Layers className="w-5 h-5" />
      </div>
      <div>
        <h1 className="text-xl font-heading font-bold text-foreground">Pushdown Automata</h1>
        <p className="text-xs text-muted-foreground">
          Stack-based computation with step-by-step simulation
        </p>
      </div>
    </div>

    <div className="glass-panel p-8 text-center">
      <div className="inline-flex flex-col items-center gap-1 font-mono text-xs">
        {["Z₀", "a", "a", "a"].map((sym, i) => (
          <div
            key={i}
            className="px-6 py-1.5 border border-border bg-muted/50 text-muted-foreground"
          >
            {sym}
          </div>
        ))}
        <p className="text-[10px] text-primary mt-2">Stack</p>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Visual PDA editor with push/pop animation and DPDA/NPDA support.
      </p>
      <p className="text-xs text-muted-foreground mt-1">Module under development.</p>
    </div>
  </motion.div>
);

export default PushDownAutomata;
