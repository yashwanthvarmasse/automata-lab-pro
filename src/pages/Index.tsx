import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CircleDot, Regex, FileText, Layers, Cpu, GitBranch, Bot, ArrowRight } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const modules = [
  {
    to: "/finite-automata",
    icon: CircleDot,
    title: "Finite Automata",
    desc: "DFA & NFA design, simulation, and conversion",
    color: "text-primary",
  },
  {
    to: "/regex",
    icon: Regex,
    title: "Regular Expressions",
    desc: "Parse trees, Thompson construction, string testing",
    color: "text-accent",
  },
  {
    to: "/cfg",
    icon: FileText,
    title: "Context-Free Grammar",
    desc: "CFG editor, CNF conversion, CYK parsing",
    color: "text-success",
  },
  {
    to: "/pda",
    icon: Layers,
    title: "Pushdown Automata",
    desc: "Stack-based computation with visual simulation",
    color: "text-info",
  },
  {
    to: "/turing",
    icon: Cpu,
    title: "Turing Machine",
    desc: "Tape-based universal computation model",
    color: "text-warning",
  },
  {
    to: "/chomsky",
    icon: GitBranch,
    title: "Chomsky Hierarchy",
    desc: "Interactive language classification explorer",
    color: "text-primary",
  },
  {
    to: "/ai-tutor",
    icon: Bot,
    title: "AI Tutor",
    desc: "AI-powered analysis, generation & tutoring",
    color: "text-accent",
  },
];

const Index = () => {
  return (
    <motion.div
      className="min-h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        <div className="relative px-8 py-16">
          <motion.h1
            className="text-4xl md:text-5xl font-heading font-bold gradient-text mb-3"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            AutomataViz
          </motion.h1>
          <motion.p
            className="text-lg text-muted-foreground max-w-xl"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            AI-Powered Theory of Computation Lab — design, simulate, and
            analyze formal computational models.
          </motion.p>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="p-8">
        <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-5">
          Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.to}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <Link to={mod.to} className="module-card block group">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg bg-muted ${mod.color}`}>
                    <mod.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-foreground text-sm mb-1 flex items-center gap-2">
                      {mod.title}
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {mod.desc}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Chomsky Hierarchy Preview */}
      <div className="px-8 pb-8">
        <div className="glass-panel p-6">
          <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Chomsky Hierarchy
          </h2>
          <div className="flex items-center justify-center gap-2 py-4">
            {[
              { label: "Regular", color: "bg-primary/20 border-primary text-primary" },
              { label: "⊂", color: "text-muted-foreground" },
              { label: "Context-Free", color: "bg-success/20 border-success text-success" },
              { label: "⊂", color: "text-muted-foreground" },
              { label: "Context-Sensitive", color: "bg-accent/20 border-accent text-accent" },
              { label: "⊂", color: "text-muted-foreground" },
              { label: "Recursively Enumerable", color: "bg-info/20 border-info text-info" },
            ].map((item, i) =>
              item.label === "⊂" ? (
                <span key={i} className="text-lg text-muted-foreground font-mono">
                  ⊂
                </span>
              ) : (
                <span
                  key={i}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium ${item.color}`}
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
