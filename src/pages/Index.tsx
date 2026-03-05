import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CircleDot, Regex, FileText, Layers, Cpu, GitBranch, Bot, ArrowRight } from "lucide-react";

const modules = [
  {
    to: "/finite-automata",
    icon: CircleDot,
    title: "Finite Automata",
    desc: "DFA & NFA design, simulation, and conversion",
    color: "text-primary",
    bg: "bg-primary/8",
  },
  {
    to: "/regex",
    icon: Regex,
    title: "Regular Expressions",
    desc: "Parse trees, Thompson construction, DFA minimization",
    color: "text-info",
    bg: "bg-info/8",
  },
  {
    to: "/cfg",
    icon: FileText,
    title: "Context-Free Grammar",
    desc: "CFG editor, CNF conversion, CYK parsing",
    color: "text-success",
    bg: "bg-success/8",
  },
  {
    to: "/pda",
    icon: Layers,
    title: "Pushdown Automata",
    desc: "Stack-based computation with visual simulation",
    color: "text-info",
    bg: "bg-info/8",
  },
  {
    to: "/turing",
    icon: Cpu,
    title: "Turing Machine",
    desc: "Tape-based universal computation model",
    color: "text-warning",
    bg: "bg-warning/8",
  },
  {
    to: "/chomsky",
    icon: GitBranch,
    title: "Chomsky Hierarchy",
    desc: "Interactive language classification explorer",
    color: "text-primary",
    bg: "bg-primary/8",
  },
  {
    to: "/ai-tutor",
    icon: Bot,
    title: "AI Tutor",
    desc: "AI-powered analysis, generation & tutoring",
    color: "text-warning",
    bg: "bg-warning/8",
  },
];

const Index = () => {
  return (
    <motion.div
      className="min-h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Hero */}
      <div className="px-8 pt-10 pb-8 border-b border-border">
        <motion.h1
          className="text-3xl font-heading font-bold text-foreground mb-2"
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          AutomataViz
        </motion.h1>
        <motion.p
          className="text-sm text-muted-foreground max-w-lg"
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Interactive Theory of Computation Lab — design, simulate, and
          analyze formal computational models with AI tutoring.
        </motion.p>
      </div>

      {/* Modules Grid */}
      <div className="p-8">
        <h2 className="text-[11px] font-heading font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.to}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
            >
              <Link to={mod.to} className="module-card block group">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${mod.bg} ${mod.color}`}>
                    <mod.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-foreground text-[13px] mb-0.5 flex items-center gap-1.5">
                      {mod.title}
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                    </h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {mod.desc}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Chomsky Hierarchy Preview */}
      <div className="px-8 pb-8">
        <div className="bg-muted/30 border border-border rounded-xl p-5">
          <h2 className="text-[11px] font-heading font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Chomsky Hierarchy
          </h2>
          <div className="flex items-center justify-center gap-2 py-3">
            {[
              { label: "Regular", color: "bg-primary/10 border-primary/30 text-primary" },
              { label: "⊂", color: "text-muted-foreground" },
              { label: "Context-Free", color: "bg-success/10 border-success/30 text-success" },
              { label: "⊂", color: "text-muted-foreground" },
              { label: "Context-Sensitive", color: "bg-warning/10 border-warning/30 text-warning" },
              { label: "⊂", color: "text-muted-foreground" },
              { label: "Rec. Enumerable", color: "bg-info/10 border-info/30 text-info" },
            ].map((item, i) =>
              item.label === "⊂" ? (
                <span key={i} className="text-sm text-muted-foreground font-mono">
                  ⊂
                </span>
              ) : (
                <span
                  key={i}
                  className={`px-2.5 py-1 rounded-md border text-[10px] font-mono font-medium ${item.color}`}
                >
                  {item.label}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Index;
