import { motion } from "framer-motion";
import { FileText } from "lucide-react";

const ContextFreeGrammar = () => (
  <motion.div
    className="p-8"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2.5 rounded-lg bg-success/20 text-success">
        <FileText className="w-5 h-5" />
      </div>
      <div>
        <h1 className="text-xl font-heading font-bold text-foreground">Context-Free Grammar</h1>
        <p className="text-xs text-muted-foreground">
          Grammar editing, CNF conversion, CYK parsing
        </p>
      </div>
    </div>

    <div className="glass-panel p-8 text-center">
      <div className="font-mono text-sm text-muted-foreground space-y-1">
        <p>S → aSb | ε</p>
        <p className="text-xs text-primary mt-3">L = {"{ aⁿbⁿ | n ≥ 0 }"}</p>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        CFG editor with left recursion removal, CNF conversion, and CYK membership testing.
      </p>
      <p className="text-xs text-muted-foreground mt-1">Module under development.</p>
    </div>
  </motion.div>
);

export default ContextFreeGrammar;
