import { useMemo, useState } from "react"
import { RotateCcw, Shuffle, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CodePanel, DemoControls, PresetBar, SPEEDS, StatBox, StepNarration } from "@/components/demo-shell"
import { GraphCanvas } from "@/components/graph-canvas"
import { useStepKeys, useStepper } from "@/hooks/use-stepper"
import { cn } from "@/lib/utils"

import { CODE, PRESETS, simulate, type Edge } from "./engine"

export default function MstDemo() {
  const [preset, setPreset] = useState(PRESETS[0])
  const [edges, setEdges] = useState<Edge[]>(PRESETS[0].edges)
  const [presetName, setPresetName] = useState(PRESETS[0].name)
  const [speed, setSpeed] = useState(1)
  const [draft, setDraft] = useState<Edge>({ u: 0, v: 1, w: 3 })

  const n = preset.n
  const sim = useMemo(() => simulate(n, edges), [n, edges])
  const steps = sim.steps
  const stepper = useStepper({ count: steps.length, interval: SPEEDS[speed].ms })
  const { step, atEnd, playing } = stepper
  useStepKeys(stepper)
  const current = steps[Math.min(step, steps.length - 1)] ?? null

  const nodes = preset.pos.map(([x, y], i) => ({ id: i, x, y }))
  const chosenEdges = new Set(current?.chosen ?? [])
  const curEdge = current?.edgeOrder ?? -1

  const toneOf = (e: Edge) => {
    const idx = sim.sorted.indexOf(e)
    if (chosenEdges.has(idx)) return "chosen" as const
    if (idx === curEdge) return current?.result === "skipped" ? ("rejected" as const) : ("highlight" as const)
    if (current && idx < curEdge) return "rejected" as const
    return "muted" as const
  }

  const update = (nextEdges: Edge[], name?: string) => {
    setEdges(nextEdges)
    setPresetName(name ?? "")
    stepper.reset()
  }

  const treeParent = current?.parent ?? Array.from({ length: n }, (_, i) => i)

  return (
    <div className="pt-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="flex flex-col overflow-hidden rounded-3xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs">
            <span className="flex items-center gap-3 text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-0.5 w-4 bg-emerald-500" />已选边
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-0.5 w-4 bg-amber-500" />当前边
              </span>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              V = {n} · E = {edges.length}
            </span>
          </div>
          <div className="flex-1 p-2">
            <GraphCanvas
              nodes={nodes}
              edges={edges.map((e, i) => ({ id: `e${i}`, u: e.u, v: e.v, label: String(e.w), tone: toneOf(e) }))}
              width={600}
              height={360}
              renderNode={(node) => {
                const root = findRoot(treeParent, node.id)
                const hue = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#fb7185", "#22d3ee", "#f472b6", "#a3e635"][root % 8]
                return (
                  <>
                    <circle cx={node.x} cy={node.y} r={17} className="fill-card stroke-border" strokeWidth={1.4} />
                    <circle cx={node.x} cy={node.y} r={17} fill={hue} fillOpacity={0.18} stroke={hue} strokeWidth={2} />
                    <text x={node.x} y={node.y + 4} textAnchor="middle" className="fill-current font-mono text-[12px] font-semibold">
                      {node.id + 1}
                    </text>
                  </>
                )
              }}
            />
          </div>
          <div className="border-t px-4 py-2">
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              <span className="text-muted-foreground">已选</span>
              {(current?.chosen ?? []).length === 0 && <span className="text-muted-foreground/60">—</span>}
              {(current?.chosen ?? []).map((idx) => {
                const e = sim.sorted[idx]
                return (
                  <span key={idx} className="rounded-md bg-emerald-500/10 px-1.5 py-0.5">
                    {e.u + 1}-{e.v + 1}·{e.w}
                  </span>
                )
              })}
            </div>
          </div>
          <div className="h-1 w-full bg-muted">
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{ width: `${steps.length > 1 ? (step / (steps.length - 1)) * 100 : 0}%` }}
            />
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
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="已选边数" value={`${(current?.chosen ?? []).length} / ${n - 1}`} highlight />
            <StatBox label="总权值" value={current?.total ?? 0} hint={current?.result === "done" ? (sim.connected ? "最小生成树" : "图不连通") : ""} />
          </div>
          <StepNarration
            badge={curEdge >= 0 ? curEdge + 1 : "—"}
            title={
              current?.result === "chosen"
                ? "选入这条边"
                : current?.result === "skipped"
                  ? "跳过（会成环）"
                  : current?.result === "done"
                    ? "结束"
                    : "排序"
            }
            text={current?.describe ?? "调整边后重新播放。"}
          />
          {current?.result === "done" && (
            <div
              className={cn(
                "rounded-2xl border px-3 py-2 text-xs",
                sim.connected
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                  : "border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400"
              )}
            >
              {sim.connected ? `最小生成树权值 = ${sim.total}` : "图不连通，无法得到生成树"}
            </div>
          )}
          <CodePanel code={CODE} active={current?.codeLines ?? []} />
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="rounded-3xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">边列表（按权值排序）</h2>
            <span className="text-[11px] text-muted-foreground">顶点数 {n}</span>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Num label="u" value={draft.u + 1} onChange={(v) => setDraft({ ...draft, u: Math.max(0, Math.min(n - 1, v - 1)) })} />
            <Num label="v" value={draft.v + 1} onChange={(v) => setDraft({ ...draft, v: Math.max(0, Math.min(n - 1, v - 1)) })} />
            <Num label="w" value={draft.w} onChange={(w) => setDraft({ ...draft, w })} />
            <Button
              size="xs"
              onPress={() => {
                if (draft.u === draft.v) return
                update([...edges, { ...draft }])
              }}
            >
              添加边
            </Button>
          </div>
          <div className="mt-3 max-h-56 space-y-1 overflow-y-auto border-t pt-3">
            {sim.sorted.map((e, i) => {
              const original = edges.indexOf(e)
              const state = chosenEdges.has(i) ? "chosen" : current && i < curEdge ? "rejected" : i === curEdge ? "current" : "pending"
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1 font-mono text-[11px]",
                    state === "current" && "bg-primary/10",
                    state === "chosen" && "bg-emerald-500/10",
                    state === "rejected" && "text-muted-foreground/50"
                  )}
                >
                  <span className="w-4 text-muted-foreground">{i + 1}</span>
                  <span className="w-20">
                    {e.u + 1} — {e.v + 1}
                  </span>
                  <span className="w-8 text-muted-foreground">w={e.w}</span>
                  <span className="flex-1">
                    {state === "chosen" && <span className="text-emerald-600 dark:text-emerald-400">✓ 选入</span>}
                    {state === "rejected" && "跳过"}
                    {state === "current" && <span className="text-primary">{current?.result === "skipped" ? "跳过" : "选入"}</span>}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="删除边"
                    onPress={() => update(edges.filter((_, k) => k !== original))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              )
            })}
            {edges.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">没有边</p>}
          </div>
          <PresetBar
            presets={PRESETS}
            current={presetName}
            onPick={(name) => {
              const p = PRESETS.find((x) => x.name === name)!
              setPreset(p)
              update(p.edges, p.name)
            }}
          >
            <Button
              variant="ghost"
              size="xs"
              onPress={() => {
                const next: Edge[] = []
                for (let i = 0; i < n; i++)
                  for (let j = i + 1; j < n; j++) if (Math.random() < 0.6) next.push({ u: i, v: j, w: 1 + Math.floor(Math.random() * 9) })
                update(next, "随机")
              }}
            >
              <Shuffle /> 随机权值
            </Button>
            <Button variant="ghost" size="xs" onPress={() => update(PRESETS[0].edges, PRESETS[0].name)}>
              <RotateCcw /> 重置
            </Button>
          </PresetBar>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border bg-card p-4">
            <h2 className="mb-2 text-sm font-medium">并查集状态</h2>
            <p className="mb-2 text-[11px] text-muted-foreground">同色节点表示当前在同一个集合</p>
            <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
              {treeParent.map((p, i) => (
                <span key={i} className="rounded-md border px-1.5 py-0.5">
                  {i + 1}→{p + 1}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-medium">为什么 Kruskal 是对的？</h2>
            <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
              <li>按权值从小到大考虑边，第一条连接两个不同连通块的边一定是该割的最小边（割性质）。</li>
              <li>一旦两端已连通，加入它必然成环，而环上的最大边可以被它替换，所以跳过不会失去最优解。</li>
              <li>并查集让“判断是否成环”和“合并连通块”都接近 O(1)，主导复杂度的是排序 O(E log E)。</li>
              <li>若选不满 n − 1 条边，说明图本身不连通，不存在生成树。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function findRoot(parent: number[], x: number) {
  let r = x
  while (parent[r] !== r) r = parent[r]
  return r
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-14 rounded-lg border bg-background px-1.5 py-1 text-center font-mono text-xs text-foreground"
      />
    </label>
  )
}
