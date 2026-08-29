import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import type { FAState, FATransition } from "@/lib/automata-engine";

interface AutomataGraphProps {
  states: FAState[];
  transitions: FATransition[];
  activeStates?: string[];
  selectedState?: string | null;
  onSelectState?: (id: string | null) => void;
  onMoveState?: (id: string, x: number, y: number) => void;
  simulationStatus?: "running" | "accepted" | "rejected" | null;
}

const STATE_RADIUS = 26;
const PAD = 90;

interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

const AutomataGraph = ({
  states,
  transitions,
  activeStates = [],
  selectedState,
  onSelectState,
  onMoveState,
  simulationStatus,
}: AutomataGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<string | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const panRef = useRef<{ x: number; y: number; view: View } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [view, setView] = useState<View>({ x: 0, y: 0, w: 800, h: 600 });
  const touchedRef = useRef(false);
  const sizeRef = useRef({ w: 800, h: 600 });

  // keep aspect ratio in sync with the container so panning feels 1:1
  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) sizeRef.current = { w: r.width, h: r.height };
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    if (r.width && r.height) sizeRef.current = { w: r.width, h: r.height };
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    if (states.length === 0) {
      setView({ x: 0, y: 0, w: 800, h: 600 });
      return;
    }
    const xs = states.map((s) => s.x);
    const ys = states.map((s) => s.y);
    const minX = Math.min(...xs) - PAD;
    const minY = Math.min(...ys) - PAD;
    let w = Math.max(Math.max(...xs) + PAD - minX, 260);
    let h = Math.max(Math.max(...ys) + PAD - minY, 260);
    // match container aspect ratio so there is no hidden overflow
    const ar = sizeRef.current.w / sizeRef.current.h;
    if (w / h > ar) h = w / ar;
    else w = h * ar;
    setView({
      x: minX - (w - (Math.max(...xs) + PAD - minX)) / 2,
      y: minY - (h - (Math.max(...ys) + PAD - minY)) / 2,
      w,
      h,
    });
    touchedRef.current = false;
  }, [states]);

  // auto-fit when the automaton is (re)loaded, never while the user is arranging
  const countKey = `${states.length}:${transitions.length}`;
  useEffect(() => {
    if (!touchedRef.current) fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countKey]);

  const toSVG = useCallback((clientX: number, clientY: number) => {
    const el = svgRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: view.x + ((clientX - r.left) / r.width) * view.w,
      y: view.y + ((clientY - r.top) / r.height) * view.h,
    };
  }, [view]);

  const handleStatePointerDown = useCallback(
    (e: React.PointerEvent, stateId: string) => {
      e.stopPropagation();
      e.preventDefault();
      const state = states.find((s) => s.id === stateId);
      if (!state) return;
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      const p = toSVG(e.clientX, e.clientY);
      offsetRef.current = { x: p.x - state.x, y: p.y - state.y };
      movedRef.current = false;
      dragRef.current = stateId;
      onSelectState?.(stateId);
    },
    [states, toSVG, onSelectState]
  );

  const handleBackgroundPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (dragRef.current) return;
      svgRef.current?.setPointerCapture?.(e.pointerId);
      panRef.current = { x: e.clientX, y: e.clientY, view };
      movedRef.current = false;
      setIsPanning(true);
    },
    [view]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragRef.current) {
        const p = toSVG(e.clientX, e.clientY);
        movedRef.current = true;
        touchedRef.current = true;
        onMoveState?.(dragRef.current, p.x - offsetRef.current.x, p.y - offsetRef.current.y);
        return;
      }
      const pan = panRef.current;
      if (!pan) return;
      const el = svgRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = ((e.clientX - pan.x) / r.width) * pan.view.w;
      const dy = ((e.clientY - pan.y) / r.height) * pan.view.h;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) movedRef.current = true;
      touchedRef.current = true;
      setView({ ...pan.view, x: pan.view.x - dx, y: pan.view.y - dy });
    },
    [toSVG, onMoveState]
  );

  const endInteraction = useCallback(
    (e: React.PointerEvent) => {
      const wasPanning = !!panRef.current;
      const wasDragging = !!dragRef.current;
      dragRef.current = null;
      panRef.current = null;
      setIsPanning(false);
      try {
        (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
      } catch {
        /* noop */
      }
      // clicking empty canvas (no pan movement, no node drag) clears selection
      if (wasPanning && !wasDragging && !movedRef.current) onSelectState?.(null);
      movedRef.current = false;
    },
    [onSelectState]
  );

  const zoomAt = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      touchedRef.current = true;
      setView((v) => {
        const el = svgRef.current;
        const r = el?.getBoundingClientRect();
        const rx = r && clientX !== undefined ? (clientX - r.left) / r.width : 0.5;
        const ry = r && clientY !== undefined ? (clientY - r.top) / r.height : 0.5;
        const nw = Math.min(Math.max(v.w * factor, 120), 8000);
        const nh = nw * (v.h / v.w);
        return {
          x: v.x + (v.w - nw) * rx,
          y: v.y + (v.h - nh) * ry,
          w: nw,
          h: nh,
        };
      });
    },
    []
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      zoomAt(e.deltaY > 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
    },
    [zoomAt]
  );

  const getTransitionsBetween = (fromId: string, toId: string) =>
    transitions.filter((t) => t.from === fromId && t.to === toId);

  const getReverse = (fromId: string, toId: string) =>
    transitions.some((t) => t.from === toId && t.to === fromId);

  const renderTransition = (
    fromState: FAState,
    toState: FAState,
    symbols: string[],
    hasReverse: boolean,
    index: number
  ) => {
    const isSelf = fromState.id === toState.id;
    const key = `${fromState.id}-${toState.id}-${index}`;

    if (isSelf) {
      const cx = fromState.x;
      const cy = fromState.y - STATE_RADIUS - 18;
      return (
        <g key={key}>
          <path
            d={`M ${fromState.x - 10} ${fromState.y - STATE_RADIUS + 2} 
                C ${cx - 28} ${cy - 22}, ${cx + 28} ${cy - 22}, 
                ${fromState.x + 10} ${fromState.y - STATE_RADIUS + 2}`}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="1.2"
            markerEnd="url(#arrowhead)"
          />
          <text
            x={cx}
            y={cy - 20}
            textAnchor="middle"
            className="fill-primary text-[11px] font-mono font-medium"
          >
            {symbols.join(", ")}
          </text>
        </g>
      );
    }

    const dx = toState.x - fromState.x;
    const dy = toState.y - fromState.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    const startX = fromState.x + nx * STATE_RADIUS;
    const startY = fromState.y + ny * STATE_RADIUS;
    const endX = toState.x - nx * (STATE_RADIUS + 4);
    const endY = toState.y - ny * (STATE_RADIUS + 4);

    const curve = hasReverse ? 22 : 0;
    const perpX = -ny * curve;
    const perpY = nx * curve;
    const midX = (startX + endX) / 2 + perpX;
    const midY = (startY + endY) / 2 + perpY;

    const labelX = midX + perpX * 0.3;
    const labelY = midY + perpY * 0.3 - 6;

    return (
      <g key={key}>
        <path
          d={
            curve === 0
              ? `M ${startX} ${startY} L ${endX} ${endY}`
              : `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`
          }
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1.2"
          markerEnd="url(#arrowhead)"
        />
        <text
          x={curve === 0 ? (startX + endX) / 2 : labelX}
          y={curve === 0 ? (startY + endY) / 2 - 8 : labelY}
          textAnchor="middle"
          className="fill-primary text-[11px] font-mono font-medium"
        >
          {symbols.join(", ")}
        </text>
      </g>
    );
  };

  const renderedPairs = new Set<string>();
  const transitionElements: JSX.Element[] = [];

  states.forEach((fromState) => {
    states.forEach((toState) => {
      const pairKey = `${fromState.id}->${toState.id}`;
      if (renderedPairs.has(pairKey)) return;
      const trans = getTransitionsBetween(fromState.id, toState.id);
      if (trans.length === 0) return;
      renderedPairs.add(pairKey);
      const hasReverse = fromState.id !== toState.id && getReverse(fromState.id, toState.id);
      const symbols = trans.map((t) => t.symbol);
      transitionElements.push(renderTransition(fromState, toState, symbols, hasReverse, 0));
    });
  });

  const viewBox = `${view.x} ${view.y} ${view.w} ${view.h}`;
  const gridSize = 40;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <svg
        ref={svgRef}
        className={`w-full h-full bg-background rounded-xl touch-none select-none ${
          isPanning ? "cursor-grabbing" : "cursor-grab"
        }`}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endInteraction}
        onPointerCancel={endInteraction}
        onWheel={handleWheel}
        onDoubleClick={fit}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--muted-foreground))" />
          </marker>
          <filter id="glow-active">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id="canvas-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="hsl(var(--border))" opacity="0.6" />
          </pattern>
        </defs>

        {/* draggable background surface */}
        <rect
          x={view.x - view.w}
          y={view.y - view.h}
          width={view.w * 3}
          height={view.h * 3}
          fill="url(#canvas-grid)"
        />

        {transitionElements}

        {/* Start arrow */}
        {states
          .filter((s) => s.isStart)
          .map((s) => (
            <g key={`start-${s.id}`}>
              <line
                x1={s.x - STATE_RADIUS - 30}
                y1={s.y}
                x2={s.x - STATE_RADIUS - 4}
                y2={s.y}
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
                markerEnd="url(#arrowhead)"
              />
              <text
                x={s.x - STATE_RADIUS - 34}
                y={s.y - 7}
                textAnchor="end"
                className="fill-primary text-[9px] font-mono"
              >
                start
              </text>
            </g>
          ))}

        {/* States */}
        {states.map((state) => {
          const isActive = activeStates.includes(state.id);
          const isSelected = selectedState === state.id;

          let strokeColor = "hsl(var(--border))";
          let fillColor = "hsl(var(--card))";

          if (isActive && simulationStatus === "accepted") {
            strokeColor = "hsl(var(--success))";
            fillColor = "hsl(152 60% 40% / 0.1)";
          } else if (isActive && simulationStatus === "rejected") {
            strokeColor = "hsl(var(--destructive))";
            fillColor = "hsl(0 72% 51% / 0.1)";
          } else if (isActive) {
            strokeColor = "hsl(var(--primary))";
            fillColor = "hsl(220 70% 50% / 0.08)";
          } else if (isSelected) {
            strokeColor = "hsl(var(--primary))";
          }

          return (
            <g
              key={state.id}
              className="state-node cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => handleStatePointerDown(e, state.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={endInteraction}
              onPointerCancel={endInteraction}
              filter={isActive ? "url(#glow-active)" : undefined}
            >
              {isSelected && (
                <circle
                  cx={state.x}
                  cy={state.y}
                  r={STATE_RADIUS + 10}
                  fill="hsl(var(--primary) / 0.07)"
                  stroke="hsl(var(--primary) / 0.4)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              )}
              {state.isAccept && (
                <circle
                  cx={state.x}
                  cy={state.y}
                  r={STATE_RADIUS + 4}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="1.2"
                />
              )}
              <circle
                cx={state.x}
                cy={state.y}
                r={STATE_RADIUS}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="1.5"
              />
              <text
                x={state.x}
                y={state.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground text-[11px] font-mono font-medium pointer-events-none select-none"
              >
                {state.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Canvas controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => zoomAt(1 / 1.2)}
          className="w-8 h-8 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomAt(1.2)}
          className="w-8 h-8 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={fit}
          className="w-8 h-8 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
          aria-label="Fit to view"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AutomataGraph;
