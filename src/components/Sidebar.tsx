import { NavLink } from "react-router-dom";
import {
  Home,
  CircleDot,
  Regex,
  FileText,
  Layers,
  Cpu,
  GitBranch,
  Bot,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", icon: Home, label: "Dashboard" },
  { to: "/finite-automata", icon: CircleDot, label: "Finite Automata" },
  { to: "/regex", icon: Regex, label: "Regular Expressions" },
  { to: "/cfg", icon: FileText, label: "Context-Free Grammar" },
  { to: "/pda", icon: Layers, label: "Pushdown Automata" },
  { to: "/turing", icon: Cpu, label: "Turing Machine" },
  { to: "/chomsky", icon: GitBranch, label: "Chomsky Hierarchy" },
  { to: "/ai-tutor", icon: Bot, label: "AI Tutor" },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative flex flex-col border-r border-border bg-card/50 transition-all duration-300 ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <CircleDot className="w-4 h-4 text-primary" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-heading font-bold text-sm text-foreground tracking-tight">
              AutomataViz
            </h1>
            <p className="text-[9px] text-muted-foreground">TOC Lab Platform</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""} ${collapsed ? "justify-center px-0" : ""}`
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="text-[13px]">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm"
      >
        {collapsed ? <ChevronRight className="w-2.5 h-2.5" /> : <ChevronLeft className="w-2.5 h-2.5" />}
      </button>

      {/* Footer */}
      <div className="p-2 border-t border-border">
        {!collapsed && (
          <p className="text-[9px] text-muted-foreground text-center">
            Theory of Computation
          </p>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
