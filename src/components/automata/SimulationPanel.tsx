import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipForward, SkipBack, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import type { SimulationStep } from "@/lib/automata-engine";

interface SimulationPanelProps {
  onSimulate: (input: string) => void;
  steps: SimulationStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  inputString: string;
  onInputChange: (val: string) => void;
}

const SimulationPanel = ({
  onSimulate,
  steps,
  currentStep,
  onStepChange,
  isPlaying,
  onTogglePlay,
  onReset,
  inputString,
  onInputChange,
}: SimulationPanelProps) => {
  const currentStepData = steps[currentStep];
  const finalStep = steps.length > 0 ? steps[steps.length - 1] : null;

  return (
    <div className="space-y-4">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">
        String Simulation
      </Label>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={inputString}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Enter string (e.g., 001)"
          className="h-8 text-xs font-mono flex-1"
        />
        <Button
          onClick={() => onSimulate(inputString)}
          size="sm"
          className="h-8"
        >
          <Play className="w-3 h-3" />
        </Button>
      </div>

      {/* Tape visualization */}
      {steps.length > 0 && (
        <>
          <div className="simulation-tape overflow-x-auto py-2">
            {inputString.split("").map((char, i) => (
              <div
                key={i}
                className={`tape-cell ${
                  currentStep > 0 && i === currentStep - 1
                    ? "active"
                    : currentStep > 0 && i < currentStep - 1
                      ? "opacity-50"
                      : ""
                } ${
                  finalStep?.status === "accepted" && currentStep === steps.length - 1
                    ? "accepted"
                    : finalStep?.status === "rejected" && currentStep === steps.length - 1
                      ? "rejected"
                      : ""
                }`}
              >
                {char}
              </div>
            ))}
            {inputString.length === 0 && (
              <div className="tape-cell active">ε</div>
            )}
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStepChange(Math.max(0, currentStep - 1))}
              disabled={currentStep <= 0}
              className="h-7 w-7 p-0"
            >
              <SkipBack className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onTogglePlay}
              className="h-7 w-7 p-0"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStepChange(Math.min(steps.length - 1, currentStep + 1))}
              disabled={currentStep >= steps.length - 1}
              className="h-7 w-7 p-0"
            >
              <SkipForward className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 w-7 p-0"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
            <Slider
              value={[currentStep]}
              min={0}
              max={steps.length - 1}
              step={1}
              onValueChange={([v]) => onStepChange(v)}
              className="flex-1"
            />
            <span className="text-xs font-mono text-muted-foreground w-12 text-right">
              {currentStep}/{steps.length - 1}
            </span>
          </div>

          {/* Status */}
          {currentStepData && (
            <div className="glass-panel p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Active:</span>
                <span className="font-mono text-primary">
                  {currentStepData.currentStates.length > 0
                    ? `{${currentStepData.currentStates.join(", ")}}`
                    : "∅"}
                </span>
              </div>
              {currentStepData.symbol && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Read:</span>
                  <span className="font-mono text-accent">{currentStepData.symbol}</span>
                </div>
              )}
              {currentStep === steps.length - 1 && (
                <div className="flex items-center gap-2 text-sm font-medium mt-1">
                  {currentStepData.status === "accepted" ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-success">Accepted</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-destructive" />
                      <span className="text-destructive">Rejected</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SimulationPanel;
