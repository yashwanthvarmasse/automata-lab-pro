import { motion } from "framer-motion";
import { Cpu } from "lucide-react";

const TuringMachine = () => (
  <motion.div
    className="p-8"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2.5 rounded-lg bg-warning/20 text-warning">
        <Cpu className="w-5 h-5" />
      </div>
      <div>
        <h1 className="text-xl font-heading font-bold text-foreground">Turing Machine</h1>
        <p className="text-xs text-muted-foreground">
          Universal computation with infinite tape simulation
        </p>
      </div>
    </div>

    <div className="glass-panel p-8 text-center">
      {/* Mini tape visualization */}
      <div className="simulation-tape justify-center mb-4">
        {["_", "1", "0", "1", "1", "0", "_", "_"].map((sym, i) => (
          <div key={i} className={`tape-cell ${i === 3 ? "active" : ""}`}>
            {sym}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Tape-based state diagram builder with head movement, multi-tape support, and loop detection.
      </p>
      <p className="text-xs text-muted-foreground mt-1">Module under development.</p>
    </div>
  </motion.div>
);

export default TuringMachine;
