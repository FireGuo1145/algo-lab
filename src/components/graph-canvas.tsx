import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type GraphNode = {
  id: number
  label?: string
  x: number
  y: number
}

export type GraphEdge = {
  /** 边的唯一 key */
  id: string
  u: number
  v: number
  /** 是否为有向边（在 v 端画箭头） */
  directed?: boolean
  label?: string
  /** 自定义样式 */
  tone?: "muted" | "active" | "chosen" | "rejected" | "highlight"
  width?: number
  dashed?: boolean
}

const EDGE_STYLES: Record<NonNullable<GraphEdge["tone"]>, { stroke: string; opacity: number; label?: string }> = {
  muted: { stroke: "currentColor", opacity: 0.22 },
  active: { stroke: "var(--color-primary)", opacity: 1 },
  chosen: { stroke: "rgb(16 185 129)", opacity: 1 },
  rejected: { stroke: "currentColor", opacity: 0.15 },
  highlight: { stroke: "rgb(245 158 11)", opacity: 1 },
}

export function GraphCanvas({
  nodes,
  edges,
  width = 560,
  height = 380,
  hiddenNodes,
  nodeRadius = 17,
  renderNode,
  renderLabel,
  className,
  ariaLabel,
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width?: number
  height?: number
  /** 已删除 / 不可见的节点（边也随之淡化） */
  hiddenNodes?: Set<number>
  nodeRadius?: number
  /** 覆盖节点内部绘制（如填色、数值） */
  renderNode?: (node: GraphNode) => ReactNode
  /** 节点下方的附加文字 */
  renderLabel?: (node: GraphNode) => ReactNode
  className?: string
  ariaLabel?: string
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const hidden = hiddenNodes ?? new Set<number>()

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-auto w-full text-foreground select-none", className)}
      role="img"
      aria-label={ariaLabel ?? "图"}
    >
      <defs>
        <marker id="gc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
        </marker>
      </defs>

      {edges.map((e) => {
        const u = byId.get(e.u)
        const v = byId.get(e.v)
        if (!u || !v) return null
        const dead = hidden.has(e.u) || hidden.has(e.v)
        const tone = EDGE_STYLES[e.tone ?? "muted"]
        const dx = v.x - u.x
        const dy = v.y - u.y
        const len = Math.hypot(dx, dy) || 1
        const ux = dx / len
        const uy = dy / len
        // 两端各缩进节点半径，避免箭头压在节点上
        const x1 = u.x + ux * nodeRadius
        const y1 = u.y + uy * nodeRadius
        const x2 = v.x - ux * (nodeRadius + (e.directed ? 4 : 0))
        const y2 = v.y - uy * (nodeRadius + (e.directed ? 4 : 0))
        const mx = (u.x + v.x) / 2
        const my = (u.y + v.y) / 2
        return (
          <g key={e.id} opacity={dead ? 0.12 : 1} className="transition-opacity duration-300">
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={tone.stroke}
              strokeOpacity={tone.opacity}
              strokeWidth={e.width ?? (e.tone && e.tone !== "muted" ? 2.4 : 1.4)}
              strokeDasharray={e.dashed ? "5 4" : undefined}
              markerEnd={e.directed ? "url(#gc-arrow)" : undefined}
              className="transition-[stroke,stroke-opacity] duration-300"
            />
            {e.label && (
              <text
                x={mx}
                y={my - 5}
                textAnchor="middle"
                className="fill-current text-[10px] font-medium"
                opacity={dead ? 0.3 : 0.75}
              >
                {e.label}
              </text>
            )}
          </g>
        )
      })}

      {nodes.map((n) => {
        const isHidden = hidden.has(n.id)
        return (
          <g key={n.id} opacity={isHidden ? 0.2 : 1} className="transition-opacity duration-300">
            <circle
              cx={n.x}
              cy={n.y}
              r={nodeRadius}
              className="fill-card stroke-border"
              strokeWidth={1.4}
              strokeDasharray={isHidden ? "3 3" : undefined}
            />
            {renderNode ? (
              renderNode(n)
            ) : (
              <text x={n.x} y={n.y + 4} textAnchor="middle" className="fill-current font-mono text-[12px] font-semibold">
                {n.label ?? n.id + 1}
              </text>
            )}
            {renderLabel?.(n)}
          </g>
        )
      })}
    </svg>
  )
}

/** 常用：环形布局 */
export function circleLayout(n: number, cx: number, cy: number, r: number): GraphNode[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    return { id: i, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
}

/**
 * 树布局：按中序遍历给叶子横向编号，父节点居中。
 * 返回节点坐标与深度信息。
 */
export function treeLayout(
  children: number[][],
  root = 0,
  width = 560,
  opts: { top?: number; rowH?: number } = {}
) {
  const positions = new Map<number, { x: number; y: number; depth: number }>()
  let leaf = 0
  const maxDepth = { v: 0 }
  const walk = (v: number, depth: number): number => {
    maxDepth.v = Math.max(maxDepth.v, depth)
    if (children[v].length === 0) {
      const x = leaf++
      positions.set(v, { x, y: depth, depth })
      return x
    }
    const xs = children[v].map((c) => walk(c, depth + 1))
    const x = xs.reduce((a, b) => a + b, 0) / xs.length
    positions.set(v, { x, y: depth, depth })
    return x
  }
  walk(root, 0)
  const leaves = Math.max(1, leaf)
  const gap = width / leaves
  const top = opts.top ?? 40
  const rowH = opts.rowH ?? 62
  const nodes: GraphNode[] = []
  positions.forEach((p, id) => {
    nodes.push({ id, x: gap * (p.x + 0.5), y: top + p.y * rowH })
  })
  return { nodes, height: top + maxDepth.v * rowH + 30, positions }
}
