import { useMemo, useState } from "react"
import { Plus, RotateCcw, Shuffle, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CodePanel, DemoControls, PresetBar, SPEEDS, StatBox, StepNarration } from "@/components/demo-shell"
import { GraphCanvas, treeLayout } from "@/components/graph-canvas"
import { useStepKeys, useStepper } from "@/hooks/use-stepper"
import { cn } from "@/lib/utils"

import { CODE, PRESETS, simulate, type Op } from "./engine"

/** 由 parent 数组推出森林的子节点表，再按森林逐棵树布局 */
function forestLayout(parent: number[], n: number) {
  const children: number[][] = Array.from({ length: n }, () => [])
  parent.forEach((p, v) => {
    if (p !== v) children[p].push(v)
  })
  const roots = Array.from({ length: n }, (_, i) => i).filter((i) => parent[i] === i)
  const nodes: { id: number; x: number; y: number }[] = []
  const W = 600
  const perRow = Math.max(1, Math.ceil(roots.length / 2))
  const slotW = W / perRow
  roots.forEach((root, idx) => {
    const { nodes: local, height } = treeLayout(children, root, slotW - 20, { top: 40, rowH: 56 })
    const col = idx % perRow
    const row = Math.floor(idx / perRow)
    const yOffset = row * 175
    for (const nd of local) {
      nodes.push({ id: nd.id, x: nd.x + col * slotW + 10, y: nd.y + yOffset })
    }
    void height
  })
  return { nodes, height: 175 * Math.ceil(roots.length / perRow) + 10 }
}

export default function DsuDemo() {
  const [n, setN] = useState(PRESETS[0].n)
  const [ops, setOps] = useState<Op[]>(PRESETS[0].ops)
  const [presetName, setPresetName] = useState(PRESETS[0].name)
  const [speed, setSpeed] = useState(1)
  const [draft, setDraft] = useState<{ kind: Op["kind"]; a: number; b: number }>({ kind: "union", a: 0, b: 1 })

  const sim = useMemo(() => simulate(n, ops), [n, ops])
  const steps = sim.steps
  const stepper = useStepper({ count: steps.length, interval: SPEEDS[speed].ms })
  const { step, atEnd, playing } = stepper
  useStepKeys(stepper)
  const current = steps[Math.min(step, steps.length - 1)] ?? null

  const parent = current?.parent ?? sim.initialParent
  const rank = current?.rank ?? sim.initialRank
  const { nodes, height } = useMemo(() => forestLayout(parent, n), [parent, n])

  const edges = useMemo(
    () =>
      parent.flatMap((p, v) =>
        p !== v ? [{ id: `e${v}`, u: p, v }] : []
      ),
    [parent]
  )

  const update = (nextN: number, nextOps: Op[], name?: string) => {
    setN(nextN)
    setOps(nextOps)
    setPresetName(name ?? "")
    stepper.reset()
  }

  const pathSet = new Set(current?.path ?? [])
  const changed = new Set(current?.changed ?? [])
  const cur = current?.current

  return (
    <div className="pt-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="flex flex-col overflow-hidden rounded-3xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs">
            <span className="text-muted-foreground">每棵树是一个集合，箭头指向父节点</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              当前集合数 {new Set(Array.from({ length: n }, (_, i) => findRoot(parent, i))).size}
            </span>
          </div>
          <div className="flex-1 p-2">
            <GraphCanvas
              nodes={nodes}
              edges={edges.map((e) => ({ ...e, directed: true, tone: pathSet.has(e.v) ? "active" : "muted" }))}
              width={600}
              height={height}
              renderNode={(node) => {
                const isRoot = parent[node.id] === node.id
                const onPath = pathSet.has(node.id)
                const isCur = cur === node.id
                const isChanged = changed.has(node.id)
                return (
                  <>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={17}
                      className={cn(
                        "transition-[fill,stroke] duration-300",
                        isCur
                          ? "fill-primary/30 stroke-primary"
                          : isChanged
                            ? "fill-amber-500/30 stroke-amber-500"
                            : onPath
                              ? "fill-sky-500/15 stroke-sky-500/70"
                              : isRoot
                                ? "fill-emerald-500/10 stroke-emerald-500/60"
                                : "fill-card stroke-border"
                      )}
                      strokeWidth={isCur || isChanged ? 2.4 : 1.4}
                    />
                    <text x={node.x} y={node.y + 4} textAnchor="middle" className="fill-current font-mono text-[12px] font-semibold">
                      {node.id + 1}
                    </text>
                    <text x={node.x + 14} y={node.y - 12} textAnchor="middle" className="fill-current font-mono text-[9px] opacity-60">
                      r{rank[node.id]}
                    </text>
                  </>
                )
              }}
            />
          </div>
          <div className="border-t px-4 py-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
              <span className="text-muted-foreground">parent</span>
              {parent.map((p, i) => (
                <span key={i} className={cn("rounded px-1", pathSet.has(i) && "bg-sky-500/10", changed.has(i) && "bg-amber-500/20")}>
                  {i + 1}→{p + 1}
                </span>
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
            <StatBox label="当前节点" value={cur != null ? cur + 1 : "—"} hint={current?.root != null ? `根 ${current.root + 1}` : ""} highlight />
            <StatBox label="本次结果" value={current?.result ?? "—"} hint={current ? opLabel(current.op) : ""} />
          </div>
          <StepNarration
            badge={current ? current.opIndex + 1 : 0}
            title={current?.op.kind === "union" ? "合并" : "查找"}
            text={current?.describe ?? "添加操作后重新播放。"}
          />
          <CodePanel code={CODE} active={current?.codeLines ?? []} />
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="rounded-3xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">操作序列</h2>
            <span className="text-[11px] text-muted-foreground">节点数 {n}（2 ~ 12）</span>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex items-center gap-0.5 rounded-xl border bg-muted/40 p-0.5">
              {(["union", "find"] as const).map((k) => (
                <Button
                  key={k}
                  size="xs"
                  variant="ghost"
                  aria-pressed={draft.kind === k}
                  className={cn("rounded-lg", draft.kind === k && "bg-background shadow-xs hover:bg-background")}
                  onPress={() => setDraft({ ...draft, kind: k })}
                >
                  {k === "union" ? "合并" : "查找"}
                </Button>
              ))}
            </div>
            <Num label="x" value={draft.a + 1} onChange={(v) => setDraft({ ...draft, a: Math.max(0, Math.min(n - 1, v - 1)) })} />
            {draft.kind === "union" && (
              <Num label="y" value={draft.b + 1} onChange={(v) => setDraft({ ...draft, b: Math.max(0, Math.min(n - 1, v - 1)) })} />
            )}
            <Button
              size="xs"
              onPress={() =>
                update(n, [
                  ...ops,
                  draft.kind === "union" ? { kind: "union", a: draft.a, b: draft.b } : { kind: "find", a: draft.a },
                ])
              }
            >
              <Plus /> 添加
            </Button>
          </div>
          <div className="mt-3 max-h-56 space-y-1 overflow-y-auto border-t pt-3">
            {ops.map((op, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-2 py-1 font-mono text-[11px]",
                  current?.opIndex === i ? "bg-primary/10" : "hover:bg-muted/60"
                )}
              >
                <span className="w-4 text-muted-foreground">{i + 1}</span>
                <span className="flex-1">{opLabel(op)}</span>
                <Button variant="ghost" size="icon-xs" aria-label={`删除操作 ${i + 1}`} onPress={() => update(n, ops.filter((_, k) => k !== i))}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            {ops.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">还没有操作</p>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
            <Button
              variant="outline"
              size="xs"
              isDisabled={n >= 12}
              onPress={() => update(n + 1, ops)}
            >
              <Plus /> 节点
            </Button>
            <Button
              variant="ghost"
              size="xs"
              isDisabled={n <= 2}
              onPress={() =>
                update(
                  n - 1,
                  ops
                    .filter((o) => o.a < n - 1 && (o.b == null || o.b < n - 1))
                )
              }
            >
              <Trash2 /> 节点
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onPress={() => {
                const size = 5 + Math.floor(Math.random() * 6)
                const randomOps: Op[] = Array.from({ length: 6 }, () => {
                  const a = Math.floor(Math.random() * size)
                  const b = Math.floor(Math.random() * size)
                  return Math.random() < 0.75 ? { kind: "union", a, b } : { kind: "find", a }
                })
                update(size, randomOps, "随机")
              }}
            >
              <Shuffle /> 随机
            </Button>
            <Button variant="ghost" size="xs" onPress={() => update(PRESETS[0].n, PRESETS[0].ops, PRESETS[0].name)}>
              <RotateCcw /> 重置
            </Button>
          </div>
          <PresetBar
            presets={PRESETS.filter((p) => p.n === n)}
            current={presetName}
            onPick={(name) => {
              const p = PRESETS.find((x) => x.name === name)!
              update(p.n, p.ops, p.name)
            }}
          />
          {PRESETS.some((p) => p.n !== n) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {PRESETS.filter((p) => p.n !== n).map((p) => (
                <Button key={p.name} size="xs" variant="ghost" onPress={() => update(p.n, p.ops, p.name)}>
                  载入「{p.name}」（{p.n} 个点）
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-medium">两个优化是怎么生效的？</h2>
          <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
            <li>
              <b className="text-foreground">路径压缩</b>：find 时把路径上所有点的父指针直接改到根，
              树的形状被“压扁”，之后查询几乎一步到位。图中琥珀色节点就是被改挂的点。
            </li>
            <li>
              <b className="text-foreground">按秩合并</b>：秩近似代表树高，把秩小的根挂到秩大的根下面，
              避免出现长链。只有两棵一样高时新根的秩才 +1。
            </li>
            <li>
              两个优化一起用时，单次操作均摊复杂度为 O(α(n))，对任何实际规模都几乎等于常数。
            </li>
            <li>
              并查集是
              <span className="mx-1 text-foreground">Kruskal 最小生成树</span>
              的核心组件：用它判断加入一条边是否成环。
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function findRoot(parent: number[], x: number) {
  while (parent[x] !== x) x = parent[x]
  return x
}

function opLabel(op: Op) {
  return op.kind === "union" ? `unite(${op.a + 1}, ${(op.b ?? 0) + 1})` : `find(${op.a + 1})`
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
