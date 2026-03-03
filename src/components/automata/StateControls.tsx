import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { FAState, FATransition } from "@/lib/automata-engine";

interface StateControlsProps {
  states: FAState[];
  transitions: FATransition[];
  selectedState: string | null;
  onAddState: () => void;
  onDeleteState: (id: string) => void;
  onToggleStart: (id: string) => void;
  onToggleAccept: (id: string) => void;
  onAddTransition: (from: string, to: string, symbol: string) => void;
  onDeleteTransition: (id: string) => void;
}

const StateControls = ({
  states,
  transitions,
  selectedState,
  onAddState,
  onDeleteState,
  onToggleStart,
  onToggleAccept,
  onAddTransition,
  onDeleteTransition,
}: StateControlsProps) => {
  const [transFrom, setTransFrom] = useState("");
  const [transTo, setTransTo] = useState("");
  const [transSymbol, setTransSymbol] = useState("");

  const selected = states.find((s) => s.id === selectedState);

  const handleAddTransition = () => {
    if (transFrom && transTo && transSymbol.trim()) {
      onAddTransition(transFrom, transTo, transSymbol.trim());
      setTransSymbol("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Add State */}
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">States</Label>
        <Button onClick={onAddState} size="sm" className="w-full mt-2" variant="outline">
          <Plus className="w-3 h-3 mr-2" />
          Add State
        </Button>
      </div>

      {/* Selected State Properties */}
      {selected && (
        <div className="glass-panel p-3 space-y-3 animate-scale-in">
          <p className="text-xs font-mono text-primary">{selected.label}</p>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Start State</Label>
            <Switch
              checked={selected.isStart}
              onCheckedChange={() => onToggleStart(selected.id)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Accept State</Label>
            <Switch
              checked={selected.isAccept}
              onCheckedChange={() => onToggleAccept(selected.id)}
            />
          </div>
          <Button
            onClick={() => onDeleteState(selected.id)}
            size="sm"
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="w-3 h-3 mr-2" />
            Delete
          </Button>
        </div>
      )}

      {/* Add Transition */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          Add Transition
        </Label>
        <Select value={transFrom} onValueChange={setTransFrom}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="From" />
          </SelectTrigger>
          <SelectContent>
            {states.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={transTo} onValueChange={setTransTo}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="To" />
          </SelectTrigger>
          <SelectContent>
            {states.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={transSymbol}
          onChange={(e) => setTransSymbol(e.target.value)}
          placeholder="Symbol (e.g., 0, 1, ε)"
          className="h-8 text-xs font-mono"
        />
        <Button
          onClick={handleAddTransition}
          size="sm"
          className="w-full"
          disabled={!transFrom || !transTo || !transSymbol.trim()}
        >
          <Plus className="w-3 h-3 mr-2" />
          Add Transition
        </Button>
      </div>

      {/* Transition List */}
      {transitions.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Transitions
          </Label>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {transitions.map((t) => {
              const fromLabel = states.find((s) => s.id === t.from)?.label || t.from;
              const toLabel = states.find((s) => s.id === t.to)?.label || t.to;
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-2 py-1 rounded bg-muted/50 text-xs font-mono group"
                >
                  <span>
                    δ({fromLabel}, {t.symbol}) → {toLabel}
                  </span>
                  <button
                    onClick={() => onDeleteTransition(t.id)}
                    className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StateControls;
