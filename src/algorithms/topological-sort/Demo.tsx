import { useMemo, useState } from "react"
import { RotateCcw, Shuffle, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CodePanel, DemoControls, PresetBar, SPEEDS, StepNarration } from "@/components/demo-shell"
import { GraphCanvas } from "@/components/graph-canvas"
import { useStepKeys, useStepper } from "@/hooks/use-stepper"
import { cn } from "@/lib/utils"

import { CODE, PRESETS, layout, simulate } from "./engine"

export default function TopoSortDemo() {
  const [preset, setPreset] = useState(PRESETS[0])
  const [edges, setEdges] = useState<[number, number][]>(PRESETS[0].edges)
  const [presetName, setPresetName] = useState(PRESETS[0].name)
  const [speed, setSpeed] = useState(1)
  const [draft, setDraft] = useState<[number, number]>([6, 0])

  const n = preset.n
  const sim = useMemo(() => simulate(n, edges), [n, edges])
  const steps = sim.steps
  const stepper = useStepper({ count: steps.length, interval: SPEEDS[speed].ms })
  const { step, atEnd, playing } = stepper
  useStepKeys(stepper)
  const current = steps[Math.min(step, steps.length - 1)] ?? null

  const pos = useMemo(() => layout(n, edges), [n, edges])
  const nodes = pos.map((p, i) => ({ id: i, x: p.x, y: p.y }))
  const removed = new Set(current?.removed ?? [])
  const lastRemoved = current?.current ?? null

  const update = (nextEdges: [number, number][], name?: string) => {
    setEdges(nextEdges)
    setPresetName(name ?? "")
    stepper.reset()
  }

  const edgeTone = (u: number, v: number) => {
    if (!current) return "muted" as const
    if (current.current === u && current.touched.includes(v)) return "highlight" as const
    if (removed.has(u)) return "rejected" as const
    if (current.current === u) return "active" as const
    return "muted" as const
  }

  return (
    <div className="pt-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="flex flex-col overflow-hidden rounded-3xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs">
            <span className="text-muted-foreground">有向图 · 节点内数字为入度</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              V = {n} · E = {edges.length}
            </span>
          </div>
          <div className="flex-1 p-2">
            <GraphCanvas
              nodes={nodes}
              edges={edges.map(([u, v], i) => ({ id: `e${i}`, u, v, directed: true, tone: edgeTone(u, v) }))}
              hiddenNodes={removed}
              width={580}
              height={380}
              renderNode={(node) => {
                const indeg = current?.indegree[node.id] ?? 0
                const isCur = lastRemoved === node.id
                const isTouched = current?.touched.includes(node.id)
                const isQueued = current?.queue.includes(node.id) && !removed.has(node.id)
                return (
                  <>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={17}
                      className={cn(
                        "transition-[fill,stroke] duration-300",
                        isCur
                          ? "fill-primary/25 stroke-primary"
                          : isTouched
                            ? "fill-amber-500/25 stroke-amber-500"
                            : isQueued
                              ? "fill-emerald-500/15 stroke-emerald-500/70"
                              : "fill-card stroke-border"
                      )}
                      strokeWidth={isCur || isTouched ? 2.3 : 1.4}
                    />
                    <text x={node.x} y={node.y + 4} textAnchor="middle" className="fill-current font-mono text-[12px] font-semibold">
                      {node.id + 1}
                    </text>
                    <circle cx={node.x + 13} cy={node.y - 13} r={8} className="fill-background stroke-border" strokeWidth={1} />
                    <text x={node.x + 13} y={node.y - 9.5} textAnchor="middle" className="fill-current font-mono text-[9.5px]">
                      {indeg}
                    </text>
                  </>
                )
              }}
            />
          </div>
          <div className="border-t px-4 py-2">
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              <span className="text-muted-foreground">队列</span>
              {(current?.queue ?? []).length === 0 && <span className="text-muted-foreground/60">空</span>}
              {(current?.queue ?? []).map((v, i) => (
                <span
                  key={`${v}-${i}`}
                  className={cn(
                    "rounded-md border px-1.5 py-0.5",
                    removed.has(v) ? "text-muted-foreground/50 line-through" : "bg-emerald-500/10"
                  )}
                >
                  {v + 1}
                </span>
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              <span className="text-muted-foreground">拓扑序</span>
              {(current?.order ?? []).map((v, i) => (
                <span key={i} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-primary">
                  {v + 1}
                </span>
              ))}
              {(current?.order ?? []).length === 0 && <span className="text-muted-foreground/60">—</span>}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <DemoControls
            stepper={stepper}
            total={Math.max(0, steps.length - 1)}
            speed={speed}
            onSpeedChange={setSpeed}
            playing={playing}
            atEnd={atEnd}
          />
          <StepNarration
            badge={current ? Math.max(1, current.order.length) : 0}
            title={current?.done ? "结束" : "出队与删边"}
            text={current?.describe ?? "调整边后重新播放。"}
          />
          {current?.done && (
            <div
              className={cn(
                "rounded-2xl border px-3 py-2 text-xs",
                sim.hasCycle
                  ? "border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400"
                  : "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
              )}
            >
              {sim.hasCycle ? "检测到环，不存在拓扑序" : `合法拓扑序：${sim.order.map((v) => v + 1).join(" → ")}`}
            </div>
          )}
          <CodePanel code={CODE} active={current?.codeLines ?? []} />
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="rounded-3xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">边列表</h2>
            <span className="text-[11px] text-muted-foreground">u → v 表示 u 必须在 v 之前</span>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
              u
              <input
                type="number"
                min={1}
                max={n}
                value={draft[0]}
                onChange={(e) => setDraft([Number(e.target.value), draft[1]])}
                className="w-14 rounded-lg border bg-background px-1.5 py-1 text-center font-mono text-xs text-foreground"
              />
            </label>
            <span className="pb-1 text-muted-foreground">→</span>
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
              v
              <input
                type="number"
                min={1}
                max={n}
                value={draft[1]}
                onChange={(e) => setDraft([draft[0], Number(e.target.value)])}
                className="w-14 rounded-lg border bg-background px-1.5 py-1 text-center font-mono text-xs text-foreground"
              />
            </label>
            <Button
              size="xs"
              onPress={() => {
                const u = Math.max(1, Math.min(n, draft[0])) - 1
                const v = Math.max(1, Math.min(n, draft[1])) - 1
                if (u === v || edges.some(([a, b]) => a === u && b === v)) return
                update([...edges, [u, v]])
              }}
            >
              添加边
            </Button>
          </div>
          <div className="mt-3 max-h-56 space-y-1 overflow-y-auto border-t pt-3">
            {edges.map(([u, v], i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1 font-mono text-[11px] hover:bg-muted/60">
                <span className="text-muted-foreground">{i + 1}</span>
                <span>
                  {u + 1} → {v + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="ml-auto"
                  aria-label={`删除边 ${u + 1} → ${v + 1}`}
                  onPress={() => update(edges.filter((_, k) => k !== i))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            {edges.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">没有边</p>}
          </div>
          <PresetBar presets={PRESETS} current={presetName} onPick={(name) => {
            const p = PRESETS.find((x) => x.name === name)!
            setPreset(p)
            update(p.edges, p.name)
          }}>
            <Button
              variant="ghost"
              size="xs"
              onPress={() => {
                const randomEdges: [number, number][] = []
                for (let i = 0; i < 7; i++) {
                  const u = Math.floor(Math.random() * n)
                  const v = Math.floor(Math.random() * n)
                  if (u !== v) randomEdges.push([u, v])
                }
                update(randomEdges, "随机")
              }}
            >
              <Shuffle /> 随机
            </Button>
            <Button variant="ghost" size="xs" onPress={() => update(PRESETS[0].edges, PRESETS[0].name)}>
              <RotateCcw /> 重置
            </Button>
          </PresetBar>
        </div>

        <div className="rounded-3xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-medium">Kahn 算法为什么正确？</h2>
          <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
            <li>入度为 0 的点没有任何前驱，可以安全地放到最前面。</li>
            <li>删掉它的出边后，问题性质不变，可以继续对剩余图重复这一过程。</li>
            <li>若最后仍有剩余点，它们之间必有环：环上每个点入度都 ≥ 1，永远无法入队。</li>
            <li>同一个图可能有多个合法拓扑序，队列中取点的顺序不同会得到不同结果。</li>
            <li>复杂度 O(V + E)：每条边恰好被扫描一次。</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
