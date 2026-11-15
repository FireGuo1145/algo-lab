import { useMemo, type ReactNode, useState } from "react"
import { Link } from "react-router"
import { Plus, RotateCcw, Shuffle, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CodePanel, DemoControls, PresetBar, SPEEDS, StatBox, StepNarration } from "@/components/demo-shell"
import { GraphCanvas, treeLayout } from "@/components/graph-canvas"
import { useStepKeys, useStepper } from "@/hooks/use-stepper"
import { cn } from "@/lib/utils"

import { CODE, PRESETS, childrenOf, simulate } from "./engine"

export default function LcaDemo() {
  const [parent, setParent] = useState<number[]>(PRESETS[0].parent)
  const [queries, setQueries] = useState<[number, number][]>(PRESETS[0].queries)
  const [presetName, setPresetName] = useState(PRESETS[0].name)
  const [speed, setSpeed] = useState(1)
  const [draft, setDraft] = useState<[number, number]>([0, 1])

  const n = parent.length
  const sim = useMemo(() => simulate(parent, queries), [parent, queries])
  const steps = sim.steps
  const stepper = useStepper({ count: steps.length, interval: SPEEDS[speed].ms })
  const { step, atEnd, playing } = stepper
  useStepKeys(stepper)
  const current = steps[Math.min(step, steps.length - 1)] ?? null

  const children = useMemo(() => childrenOf(parent), [parent])
  const { nodes, height } = useMemo(() => treeLayout(children, 0, 600, { top: 46, rowH: 70 }), [children])
  const edges = useMemo(
    () =>
      parent.flatMap((p, v) =>
        p >= 0 && v !== 0 ? [{ id: `e${v}`, u: p, v } as { id: string; u: number; v: number }] : []
      ),
    [parent]
  )

  const update = (nextParent: number[], nextQueries: [number, number][], name?: string) => {
    setParent(nextParent)
    setQueries(nextQueries)
    setPresetName(name ?? "")
    stepper.reset()
  }

  const marked = new Set(current?.marked ?? [])
  const query = current?.query ?? null
  const pathEdges = new Set<number>()
  if (query) {
    const [a, b] = query
    for (const x of [a, b]) {
      let cur = x
      while (cur !== 0) {
        pathEdges.add(cur)
        cur = parent[cur]
      }
    }
  }

  return (
    <div className="pt-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="flex flex-col overflow-hidden rounded-3xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs">
            <span className="text-muted-foreground">
              {current?.phase === "query" ? "查询中" : "预处理 · 倍增表构建"} · 节点下方显示深度
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              n = {n} · K = {sim.K}
            </span>
          </div>
          <div className="flex-1 p-2">
            <GraphCanvas
              nodes={nodes}
              edges={edges.map((e) => ({
                ...e,
                tone: pathEdges.has(e.v) ? ("highlight" as const) : undefined,
                dashed: !pathEdges.has(e.v),
              }))}
              width={600}
              height={height}
              renderNode={(node) => {
                const isU = current && current.phase === "query" && node.id === current.a
                const isV = current && current.phase === "query" && node.id === current.b
                const isMarked = marked.has(node.id)
                const isAnswer = current?.result != null && current.result === node.id
                return (
                  <>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={18}
                      className={cn(
                        "transition-[fill,stroke] duration-300",
                        isAnswer
                          ? "fill-emerald-500/30 stroke-emerald-500"
                          : isU
                            ? "fill-sky-500/25 stroke-sky-500"
                            : isV
                              ? "fill-violet-500/25 stroke-violet-500"
                              : isMarked
                                ? "fill-amber-500/20 stroke-amber-500"
                                : "fill-card stroke-border"
                      )}
                      strokeWidth={isU || isV || isAnswer ? 2.4 : 1.4}
                    />
                    <text x={node.x} y={node.y + 4} textAnchor="middle" className="fill-current font-mono text-[12px] font-semibold">
                      {node.id + 1}
                    </text>
                  </>
                )
              }}
              renderLabel={(node) => (
                <text x={node.x} y={node.y + 31} textAnchor="middle" className="fill-current font-mono text-[9px] opacity-55">
                  dep {sim.depth[node.id]}
                </text>
              )}
            />
          </div>
          <div className="border-t px-4 py-2">
            <div
              className="grid items-center gap-x-3 gap-y-1 font-mono text-[11px]"
              style={{ gridTemplateColumns: `auto repeat(${sim.K + 1}, minmax(0, 1fr))` }}
            >
              <span className="text-muted-foreground">up[v][k]</span>
              {Array.from({ length: sim.K + 1 }, (_, k) => (
                <span key={k} className="text-center text-muted-foreground">
                  2^{k}
                </span>
              ))}
              {Array.from({ length: n }, (_, v) => (
                <RowFragment key={v}>
                  <span className={cn("text-muted-foreground", (current?.a === v || current?.b === v) && "font-semibold text-foreground")}>
                    v{v + 1}
                  </span>
                  {Array.from({ length: sim.K + 1 }, (_, k) => (
                    <span
                      key={k}
                      className={cn(
                        "rounded px-1 text-center",
                        current?.phase === "query" &&
                          k === current.jumpK &&
                          (current.a === v || current.b === v) &&
                          "bg-primary/20"
                      )}
                    >
                      {sim.up[v][k] + 1}
                    </span>
                  ))}
                </RowFragment>
              ))}
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
            <StatBox
              label="当前两点"
              value={current ? `${current.a + 1} ↔ ${current.b + 1}` : "—"}
              hint={current ? `深度 ${sim.depth[current.a]} / ${sim.depth[current.b]}` : ""}
              highlight
            />
            <StatBox
              label="LCA"
              value={current?.result != null ? current.result + 1 : "—"}
              hint={queries.length ? `已求 ${sim.results.length} / ${queries.length}` : "无查询"}
            />
          </div>
          <StepNarration
            badge={current?.phase === "query" ? "Q" : "B"}
            title={current?.phase === "query" ? "查询" : "预处理"}
            text={current?.describe ?? "添加查询后重新播放。"}
          />
          <CodePanel code={CODE} active={current?.codeLines ?? []} />
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <div className="rounded-3xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">树的父节点</h2>
              <span className="text-[11px] text-muted-foreground">1 号为根，长度 {n}</span>
            </div>
            <div className="flex flex-wrap items-end gap-1.5">
              {parent.map((p, v) => (
                <div key={v} className="flex flex-col items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={n}
                    disabled={v === 0}
                    value={v === 0 ? "-" : p + 1}
                    onChange={(e) => {
                      const np = Math.max(0, Math.min(n - 1, Number(e.target.value) - 1))
                      if (np === v) return
                      update(parent.map((x, j) => (j === v ? np : x)), queries)
                    }}
                    className="w-14 rounded-lg border bg-background px-1.5 py-1 text-center font-mono text-sm disabled:opacity-50 focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none"
                    aria-label={`点 ${v + 1} 的父节点`}
                  />
                  <span className="font-mono text-[10px] text-muted-foreground">{v + 1}</span>
                </div>
              ))}
              <Button
                variant="outline"
                size="icon-xs"
                className="mb-3.5"
                aria-label="添加节点作为 1 号的孩子"
                isDisabled={n >= 12}
                onPress={() => update([...parent, 0], queries)}
              >
                <Plus />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="mb-3.5"
                aria-label="删除最后一个节点"
                isDisabled={n <= 2}
                onPress={() => update(parent.slice(0, -1), queries.filter(([a, b]) => a < n - 1 && b < n - 1))}
              >
                <Trash2 />
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium">查询</h2>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                u
                <input
                  type="number"
                  min={1}
                  max={n}
                  value={draft[0] + 1}
                  onChange={(e) => setDraft([Number(e.target.value) - 1, draft[1]])}
                  className="w-14 rounded-lg border bg-background px-1.5 py-1 text-center font-mono text-xs text-foreground"
                />
              </label>
              <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                v
                <input
                  type="number"
                  min={1}
                  max={n}
                  value={draft[1] + 1}
                  onChange={(e) => setDraft([draft[0], Number(e.target.value) - 1])}
                  className="w-14 rounded-lg border bg-background px-1.5 py-1 text-center font-mono text-xs text-foreground"
                />
              </label>
              <Button
                size="xs"
                onPress={() => {
                  const a = Math.max(0, Math.min(n - 1, draft[0]))
                  const b = Math.max(0, Math.min(n - 1, draft[1]))
                  update(parent, [...queries, [a, b]])
                }}
              >
                <Plus /> 添加查询
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {queries.map(([a, b], i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 px-2 py-0.5 font-mono text-[11px]">
                  ({a + 1}, {b + 1})
                  <button
                    className="text-muted-foreground hover:text-rose-500"
                    aria-label={`删除查询 ${i + 1}`}
                    onClick={() => update(parent, queries.filter((_, k) => k !== i))}
                  >
                    ×
                  </button>
                </span>
              ))}
              {queries.length === 0 && <span className="text-[11px] text-muted-foreground">只演示预处理</span>}
            </div>
            <PresetBar presets={PRESETS} current={presetName} onPick={(name) => {
              const p = PRESETS.find((x) => x.name === name)!
              update(p.parent, p.queries, p.name)
            }}>
              <Button
                variant="ghost"
                size="xs"
                onPress={() => {
                  const size = 6 + Math.floor(Math.random() * 4)
                  const np = [-1]
                  for (let v = 1; v < size; v++) np.push(Math.floor(Math.random() * v))
                  const qs: [number, number][] = Array.from({ length: 3 }, () => [
                    Math.floor(Math.random() * size),
                    Math.floor(Math.random() * size),
                  ])
                  update(np, qs, "随机")
                }}
              >
                <Shuffle /> 随机
              </Button>
              <Button variant="ghost" size="xs" onPress={() => update(PRESETS[0].parent, PRESETS[0].queries, PRESETS[0].name)}>
                <RotateCcw /> 重置
              </Button>
            </PresetBar>
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-medium">倍增求 LCA 的两步</h2>
          <ol className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
            <li>
              <b className="text-foreground">预处理</b>：深搜时记录 fa 与 dep，并递推 up[v][k] = up[ up[v][k-1] ][k-1]，
              表示 v 的第 2^k 级祖先。每个点 O(log n) 格，总 O(n log n)。
            </li>
            <li>
              <b className="text-foreground">对齐深度</b>：设深度差 diff，按二进制逐位跳 2^k 步，让两点等高。
              如果此时两点相同，答案就是它（其中一个是另一个的祖先）。
            </li>
            <li>
              <b className="text-foreground">同时上跳</b>：从大到小尝试 2^k 步，若两端祖先不同就一起跳；
              最终会停在 LCA 的两个不同孩子上，再往上一格就是答案。
            </li>
            <li>单次查询 O(log n)，与 ST 表一样是“倍增”思想的经典用法。</li>
          </ol>
          <p className="mt-3 border-t pt-3 text-[12px] leading-relaxed text-muted-foreground">
            想让 up[v][k] 更直观？可以配合
            <Link className="mx-1 text-primary underline-offset-2 hover:underline" to="/algo/st-table">
              ST 表
            </Link>
            的倍增表一起理解。
          </p>
        </div>
      </div>
    </div>
  )
}

function RowFragment({ children }: { children: ReactNode }) {
  return <>{children}</>
}
