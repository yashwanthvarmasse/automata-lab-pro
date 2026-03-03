import { motion } from "framer-motion";
import { Regex, ArrowRight } from "lucide-react";

const RegularExpression = () => (
  <motion.div
    className="p-8"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2.5 rounded-lg bg-accent/20 text-accent">
        <Regex className="w-5 h-5" />
      </div>
      <div>
        <h1 className="text-xl font-heading font-bold text-foreground">Regular Expressions</h1>
        <p className="text-xs text-muted-foreground">
          Parse trees, Thompson construction, NFA/DFA conversion
        </p>
      </div>
    </div>

    <div className="glass-panel p-8 text-center">
      <p className="text-muted-foreground text-sm">
        Regex → NFA conversion, parse tree visualization, and string testing.
      </p>
      <p className="text-xs text-muted-foreground mt-2">Module under development.</p>
      <div className="mt-6 flex items-center justify-center gap-4 text-xs font-mono text-muted-foreground">
        <span className="px-3 py-1 rounded bg-muted">Regex</span>
        <ArrowRight className="w-3 h-3" />
        <span className="px-3 py-1 rounded bg-muted">NFA</span>
        <ArrowRight className="w-3 h-3" />
        <span className="px-3 py-1 rounded bg-muted">DFA</span>
        <ArrowRight className="w-3 h-3" />
        <span className="px-3 py-1 rounded bg-primary/20 text-primary">Min DFA</span>
      </div>
    </div>
  </motion.div>
);

export default RegularExpression;
