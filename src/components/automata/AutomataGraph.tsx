import { useCallback, useRef, useState } from "react";
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
  const [dragging, setDragging] = useState<string | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  const getSVGCoords = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const transformed = pt.matrixTransform(svg.getScreenCTM()?.inverse());
      return { x: transformed.x, y: transformed.y };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.PointerEvent, stateId: string) => {
      e.stopPropagation();
      e.preventDefault();
      const state = states.find((s) => s.id === stateId);
      if (!state) return;
      const coords = getSVGCoords(e);
      offsetRef.current = { x: coords.x - state.x, y: coords.y - state.y };
      movedRef.current = false;
      setDragging(stateId);
      // selecting on pointer-down keeps the properties panel in sync
      onSelectState?.(stateId);
    },
    [states, getSVGCoords, onSelectState]
  );

  const handleMouseMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const coords = getSVGCoords(e);
      movedRef.current = true;
      onMoveState?.(dragging, coords.x - offsetRef.current.x, coords.y - offsetRef.current.y);
    },
    [dragging, getSVGCoords, onMoveState]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      // only clear selection when clicking empty canvas (never right after a drag)
      if (movedRef.current) {
        movedRef.current = false;
        return;
      }
      if (e.target === svgRef.current) onSelectState?.(null);
    },
    [onSelectState]
  );

  const getTransitionsBetween = (fromId: string, toId: string) =>
    transitions.filter((t) => t.from === fromId && t.to === toId);

  const getReverse = (fromId: string, toId: string) =>
    transitions.some((t) => t.from === toId && t.to === fromId);

  const renderTransition = (fromState: FAState, toState: FAState, symbols: string[], hasReverse: boolean, index: number) => {
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
    const dist = Math.sqrt(dx * dx + dy * dy);
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
          d={curve === 0
            ? `M ${startX} ${startY} L ${endX} ${endY}`
            : `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`}
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
      transitionElements.push(
        renderTransition(fromState, toState, symbols, hasReverse, 0)
      );
    });
  });

  // Auto-fit: compute a viewBox that contains every state (plus label padding)
  const PAD = 70;
  const xs = states.map((s) => s.x);
  const ys = states.map((s) => s.y);
  const minX = xs.length ? Math.min(...xs) - PAD : 0;
  const minY = ys.length ? Math.min(...ys) - PAD : 0;
  const maxX = xs.length ? Math.max(...xs) + PAD : 800;
  const maxY = ys.length ? Math.max(...ys) + PAD : 600;
  const viewBox = `${minX} ${minY} ${Math.max(maxX - minX, 200)} ${Math.max(maxY - minY, 200)}`;

  return (
    <svg
      ref={svgRef}
      className="w-full h-full bg-background rounded-xl"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={handleMouseMove}
      onPointerUp={handleMouseUp}
      onPointerLeave={handleMouseUp}
      onClick={handleBackgroundClick}
    >

      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="hsl(var(--muted-foreground))"
          />
        </marker>
        <filter id="glow-active">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

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
            onMouseDown={(e) => handleMouseDown(e, state.id)}
            filter={isActive ? "url(#glow-active)" : undefined}
          >
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
  );
};

export default AutomataGraph;
