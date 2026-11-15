import { useMemo } from "react"

import type { SegmentNode, Step } from "./engine"
import { cn } from "@/lib/utils"

type Placed = { node: SegmentNode; x: number; y: number }

const LEAF_GAP = 12

/** 计算完整的二叉树布局：叶子按顺序排列，内部节点位于两子节点中间 */
function layout(nodes: SegmentNode[]) {
  const byIndex = new Map(nodes.map((n) => [n.index, n]))
  const placed: Placed[] = []
  let leafCursor = 0

  const depthOf = (n: SegmentNode) => Math.floor(Math.log2(n.index))

  const walk = (index: number): number => {
    const node = byIndex.get(index)
    if (!node) return 0
    let x: number
    if (!node.children) {
      x = leafCursor * LEAF_GAP
      leafCursor++
    } else {
      const lx = walk(node.children[0])
      const rx = walk(node.children[1])
      x = (lx + rx) / 2
    }
    placed.push({ node, x, y: depthOf(node) })
    return x
  }
  if (byIndex.has(1)) walk(1)

  const byIndexPlaced = new Map(placed.map((p) => [p.node.index, p]))
  const maxDepth = placed.reduce((m, p) => Math.max(m, p.y), 0)
  return {
    placed,
    pos: (index: number) => byIndexPlaced.get(index),
    maxDepth,
    width: Math.max(1, leafCursor) * LEAF_GAP,
  }
}

const NODE_W = 62
const NODE_H = 36
const ROW_H = 54
const PAD = 28

export function TreeView({ step }: { step: Step | null }) {
  const tree = useMemo(() => layout(step?.tree ?? []), [step])

  if (!step || tree.placed.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
        还没有矩形，线段树为空
      </div>
    )
  }

  const height = (tree.maxDepth + 1) * ROW_H + 8
  const nodeBox = (index: number) => {
    const p = tree.pos(index)
    if (!p) return null
    return { x: p.x + PAD - NODE_W / 2, y: p.y * ROW_H }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${tree.width + PAD * 2} ${height}`}
          className="mx-auto block h-auto text-foreground"
          style={{ minWidth: Math.min(tree.width + PAD * 2, 640) }}
          role="img"
          aria-label="线段树覆盖状态"
        >
          {tree.placed.map(({ node }) => {
            if (!node.children) return null
            const from = nodeBox(node.index)
            if (!from) return null
            return node.children.map((c) => {
              const to = nodeBox(c)
              if (!to) return null
              return (
                <line
                  key={`${node.index}-${c}`}
                  x1={from.x + NODE_W / 2}
                  y1={from.y + NODE_H}
                  x2={to.x + NODE_W / 2}
                  y2={to.y}
                  stroke="currentColor"
                  strokeOpacity={0.18}
                />
              )
            })
          })}
          {tree.placed.map(({ node }) => {
            const box = nodeBox(node.index)
            if (!box) return null
            const covered = node.cover > 0
            return (
              <g
                key={node.index}
                opacity={node.touched ? 1 : 0.4}
                className="transition-opacity duration-300"
              >
                <rect
                  x={box.x}
                  y={box.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={7}
                  className={cn(
                    "transition-[fill,stroke] duration-300",
                    covered ? "fill-sky-500/20 stroke-sky-500/70" : "fill-muted stroke-border"
                  )}
                  strokeWidth={node.touched ? 1.6 : 1}
                  strokeDasharray={node.touched ? undefined : "3 3"}
                />
                <text
                  x={box.x + NODE_W / 2}
                  y={box.y + 14}
                  textAnchor="middle"
                  className="fill-current text-[9px] opacity-55"
                >
                  [{round(node.yLow)}, {round(node.yHigh)}]
                </text>
                <text
                  x={box.x + NODE_W / 2}
                  y={box.y + 28}
                  textAnchor="middle"
                  className="fill-current font-mono text-[10px]"
                >
                  c={node.cover} len={round(node.len)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm border border-sky-500/70 bg-sky-500/20" />
          cover &gt; 0（整段被覆盖）
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm border border-border bg-muted" />
          cover = 0
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm border border-dashed border-border opacity-60" />
          本次未访问
        </span>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        c = cover 计数，len = 该节点区间内被覆盖的长度。根节点的 len 即当前扫描线上的覆盖总长：
        <span className="ml-1 font-mono text-foreground">{round(step.coveredLength)}</span>
      </p>
    </div>
  )
}

function round(v: number) {
  return Math.round(v * 100) / 100
}
