import type { NodeRender, NodeState, TreeEdge, TreeNode } from "@/lib/ltree-demo-data";

const GREEN = "oklch(0.72 0.14 165)";

const NODE_HEIGHT = 32;
const CHAR_WIDTH = 7.8;
const NODE_PADDING = 26;
const MIN_WIDTH = 60;

function nodeWidth(label: string): number {
  return Math.max(MIN_WIDTH, label.length * CHAR_WIDTH + NODE_PADDING);
}

interface NodeColors {
  fill: string;
  stroke: string;
  text: string;
}

function colorsFor(state: NodeState): NodeColors {
  switch (state) {
    case "primary":
      return { fill: GREEN, stroke: GREEN, text: "oklch(0.18 0 0)" };
    case "secondary":
      return { fill: "oklch(0.72 0.14 165 / 0.14)", stroke: GREEN, text: "var(--foreground)" };
    case "normal":
      return { fill: "var(--card)", stroke: "var(--foreground)", text: "var(--foreground)" };
    case "dim":
      return { fill: "var(--muted)", stroke: "var(--border)", text: "var(--muted-foreground)" };
  }
}

interface LtreeTreeProps {
  nodes: readonly TreeNode[];
  edges: readonly TreeEdge[];
  render: Record<string, NodeRender>;
  /** Accessible description of the current highlight state. */
  ariaLabel: string;
}

export function LtreeTree({ nodes, edges, render, ariaLabel }: LtreeTreeProps) {
  return (
    <svg
      viewBox="0 0 760 360"
      role="img"
      aria-label={ariaLabel}
      className="h-auto w-full select-none"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Edges */}
      {edges.map((edge) => {
        const active =
          render[edge.from.path].state !== "dim" && render[edge.to.path].state !== "dim";
        return (
          <line
            key={`${edge.from.path}->${edge.to.path}`}
            x1={edge.from.x}
            y1={edge.from.y + NODE_HEIGHT / 2}
            x2={edge.to.x}
            y2={edge.to.y - NODE_HEIGHT / 2}
            stroke={active ? GREEN : "var(--border)"}
            strokeWidth={active ? 1.75 : 1}
            className="transition-[stroke,stroke-width] duration-500 motion-reduce:transition-none"
            style={{ opacity: active ? 1 : 0.6 }}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const r = render[node.path];
        const colors = colorsFor(r.state);
        const w = nodeWidth(node.label);
        const dimmed = r.state === "dim";
        return (
          <g
            key={node.path}
            className="transition-opacity duration-500 motion-reduce:transition-none"
            style={{ opacity: dimmed ? 0.5 : 1 }}
            aria-hidden="true"
          >
            <rect
              x={node.x - w / 2}
              y={node.y - NODE_HEIGHT / 2}
              width={w}
              height={NODE_HEIGHT}
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={1.25}
              className="transition-[fill,stroke] duration-500 motion-reduce:transition-none"
            />
            <text
              x={node.x}
              y={node.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
              fontFamily="var(--font-mono)"
              fill={colors.text}
              className="transition-[fill] duration-500 motion-reduce:transition-none"
            >
              {node.label}
            </text>

            {r.badge ? (
              <>
                <circle
                  cx={node.x + w / 2}
                  cy={node.y - NODE_HEIGHT / 2}
                  r={10}
                  fill={GREEN}
                  stroke="var(--background)"
                  strokeWidth={1.5}
                />
                <text
                  x={node.x + w / 2}
                  y={node.y - NODE_HEIGHT / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontFamily="var(--font-mono)"
                  fill="oklch(0.18 0 0)"
                >
                  {r.badge}
                </text>
              </>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
