import { useMemo } from "react"

import type { Step } from "./engine"
import { pointValue } from "./engine"
import { cn } from "@/lib/utils"

type Placed = { index: number; l: number; r: number; sum: number; tag: number; x: number; y: number }

const LEAF_GAP = 74
const NODE_W = 66
const NODE_H = 40
const ROW_H = 72
const PAD = 30

function layout(nodes: Step["tree"]) {
  const byIndex = new Map(nodes.map((n) => [n.index, n]))
  const placed: Placed[] = []
  let leafCursor = 0

  const walk = (index: number, depth: number): number => {
    const n = byIndex.get(index)
    if (!n) return 0
    const isLeaf = n.r - n.l === 1
    let x: number
    if (isLeaf) {
      x = leafCursor * LEAF_GAP
      leafCursor++
    } else {
      const lx = walk(index * 2, depth + 1)
      const rx = walk(index * 2 + 1, depth + 1)
      x = (lx + rx) / 2
    }
    placed.push({ ...n, x, y: depth })
    return x
  }
  if (byIndex.has(1)) walk(1, 0)
  const maxDepth = placed.reduce((m, p) => Math.max(m, p.y), 0)
  return { placed, byIndex: new Map(placed.map((p) => [p.index, p])), maxDepth, width: Math.max(1, leafCursor) * LEAF_GAP }
}

export function TreeCanvas({ step, n }: { step: Step | null; n: number }) {
  const layoutData = useMemo(() => layout(step?.tree ?? []), [step])

  const query = step?.op
  const isSum = query?.kind === "sum"

  if (!step || layoutData.placed.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
        数组为空
      </div>
    )
  }

  const { placed, byIndex, maxDepth, width } = layoutData
  const height = (maxDepth + 1) * ROW_H + 10
  const svgWidth = Math.max(width + PAD * 2, 640)
  const boxX = (p: Placed) => p.x + (svgWidth - width) / 2 - NODE_W / 2 + PAD / 2
  const boxY = (p: Placed) => p.y * ROW_H + 4

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          className="mx-auto block h-auto w-full text-foreground"
          role="img"
          aria-label="线段树状态"
        >
          {/* 查询区间指示条：位于叶子上方 */}
          {query && query.r > query.l && (
            <g>
              {Array.from({ length: query.r - query.l }, (_, k) => query.l + k).map((i) => {
                const leaf = placed.find((p) => p.r - p.l === 1 && p.l === i)
                if (!leaf) return null
                return (
                  <rect
                    key={i}
                    x={boxX(leaf) + 6}
                    y={boxY(leaf) - 12}
                    width={NODE_W - 12}
                    height={4}
                    rx={2}
                    className="fill-current opacity-30"
                  />
                )
              })}
            </g>
          )}

          {/* 连线 */}
          {placed.map((p) => {
            if (p.r - p.l === 1) return null
            return [p.index * 2, p.index * 2 + 1].map((c) => {
              const child = byIndex.get(c)
              if (!child) return null
              const inPath = step.path.includes(p.index) && step.path.includes(c)
              const onPathEdge = step.path.some((x, k) => x === p.index && step.path[k + 1] === c)
              return (
                <line
                  key={`${p.index}-${c}`}
                  x1={boxX(p) + NODE_W / 2}
                  y1={boxY(p) + NODE_H}
                  x2={boxX(child) + NODE_W / 2}
                  y2={boxY(child)}
                  stroke="currentColor"
                  strokeOpacity={inPath || onPathEdge ? 0.75 : 0.15}
                  strokeWidth={onPathEdge ? 2 : 1}
                />
              )
            })
          })}

          {placed.map((p) => {
            const isCurrent = step.node === p.index
            const inPath = step.path.includes(p.index)
            const tagged = step.tagged.includes(p.index)
            const inQuery = query && p.r - p.l >= 1 && query.l <= p.l && p.r <= query.r
            const partial = query && p.l < query.r && query.l < p.r && !inQuery
            const touched = inPath || tagged || isCurrent || inQuery || partial

            const fill = isCurrent
              ? "fill-primary/15 stroke-primary"
              : tagged
                ? "fill-sky-500/20 stroke-sky-500/80"
                : isSum && inQuery
                  ? "fill-emerald-500/15 stroke-emerald-500/70"
                  : inQuery
                    ? "fill-amber-500/15 stroke-amber-500/60"
                    : "fill-card stroke-border"

            return (
              <g key={p.index} opacity={touched ? 1 : 0.42} className="transition-opacity duration-200">
                <rect
                  x={boxX(p)}
                  y={boxY(p)}
                  width={NODE_W}
                  height={NODE_H}
                  rx={9}
                  className={cn(fill, "transition-[fill,stroke] duration-200")}
                  strokeWidth={isCurrent ? 2.2 : 1.2}
                  strokeDasharray={touched ? undefined : "3 3"}
                />
                <text
                  x={boxX(p) + NODE_W / 2}
                  y={boxY(p) + 14}
                  textAnchor="middle"
                  className="fill-current text-[9px] opacity-55"
                >
                  {p.index} · [{p.l}, {p.r})
                </text>
                <text
                  x={boxX(p) + NODE_W / 2}
                  y={boxY(p) + 28}
                  textAnchor="middle"
                  className="fill-current font-mono text-[11px] font-semibold"
                >
                  sum={p.sum}
                </text>
                {p.tag !== 0 && (
                  <g>
                    <rect
                      x={boxX(p) + NODE_W - 6}
                      y={boxY(p) - 7}
                      width={30}
                      height={15}
                      rx={7.5}
                      className="fill-rose-500"
                    />
                    <text
                      x={boxX(p) + NODE_W + 9}
                      y={boxY(p) + 3.5}
                      textAnchor="middle"
                      className="fill-white text-[9px] font-medium"
                    >
                      tag {p.tag > 0 ? `+${p.tag}` : p.tag}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* 数组原始值 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">a[]</span>
        <div className="flex gap-1">
          {Array.from({ length: n }, (_, i) => i).map((i) => {
            const inQuery = query && query.kind === "sum" && i >= query.l && i < query.r
            const inAdd = query && query.kind === "add" && i >= query.l && i < query.r
            return (
              <div
                key={i}
                className={cn(
                  "flex min-w-9 flex-col items-center rounded-lg border px-1.5 py-1 font-mono text-[11px] transition-colors",
                  inQuery && "border-emerald-500/60 bg-emerald-500/10",
                  inAdd && "border-amber-500/60 bg-amber-500/10",
                  !inQuery && !inAdd && "bg-muted/40"
                )}
              >
                <span className="text-[9px] text-muted-foreground">{i}</span>
                <span className="font-semibold">{pointValue(step.tree, n, i)}</span>
              </div>
            )
          })}
        </div>
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
          {isSum ? "绿框为查询区间" : "黄框为修改区间"}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <Legend className="fill-card stroke-border" label="未访问" />
        <Legend className="fill-amber-500/20 stroke-amber-500/70" label="被操作区间完全覆盖" />
        <Legend className="fill-sky-500/20 stroke-sky-500/80" label="打了 tag（区间加）" />
        <Legend className="fill-primary/20 stroke-primary" label="当前访问" />
      </div>
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block h-2.5 w-4 rounded-sm border", className)} />
      {label}
    </span>
  )
}

