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
      className={`relative flex flex-col border-r border-border bg-sidebar transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
          <CircleDot className="w-5 h-5 text-primary" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-heading font-bold text-sm text-foreground tracking-tight">
              AutomataViz
            </h1>
            <p className="text-[10px] text-muted-foreground">TOC Lab Platform</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
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
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        {!collapsed && (
          <p className="text-[10px] text-muted-foreground text-center">
            Theory of Computation
          </p>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
