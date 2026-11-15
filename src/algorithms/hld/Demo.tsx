import { useMemo, useState } from "react"
import { Plus, RotateCcw, Shuffle, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CodePanel, DemoControls, PresetBar, SPEEDS, StatBox, StepNarration } from "@/components/demo-shell"
import { GraphCanvas } from "@/components/graph-canvas"
import { useStepKeys, useStepper } from "@/hooks/use-stepper"
import { cn } from "@/lib/utils"

import { CODE, PRESETS, brutePath, randomTree, simulate, type Preset } from "./engine"

/** 9 套链头配色，按链头 id 取模 */
const CHAIN_COLORS = [
  "#38bdf8",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#22d3ee",
  "#f472b6",
  "#a3e635",
  "#f59e0b",
]

/** 树形布局：叶子均分横轴，父节点居中对齐（自包含，避免依赖外部宽度常量） */
function layoutTree(parent: number[], width = 600) {
  const n = parent.length
  const children: number[][] = Array.from({ length: n }, () => [])
  const root = parent.findIndex((p) => p < 0 || p === undefined)
  const r = root < 0 ? 0 : root
  for (let v = 0; v < n; v++) if (v !== r && parent[v] >= 0) children[parent[v]].push(v)
  const depth = new Array<number>(n).fill(0)
  const stack = [r]
  while (stack.length) {
    const u = stack.pop()!
    for (const c of children[u]) {
      depth[c] = depth[u] + 1
      stack.push(c)
    }
  }
  let leaves = 0
  const xs = new Map<number, number>()
  const walk = (u: number): number => {
    if (children[u].length === 0) {
      xs.set(u, leaves++)
      return xs.get(u)!
    }
    const cs = children[u].map(walk)
    const x = cs.reduce((a, b) => a + b, 0) / cs.length
    xs.set(u, x)
    return x
  }
  walk(r)
  const total = Math.max(1, leaves)
  const maxDepth = Math.max(0, ...depth)
  const rowH = Math.max(52, Math.min(78, 360 / Math.max(1, maxDepth + 1)))
  const nodes = Array.from({ length: n }, (_, id) => ({
    id,
    x: (width / total) * (xs.get(id)! + 0.5),
    y: 40 + depth[id] * rowH,
  }))
  return { nodes, height: 40 + maxDepth * rowH + 50 }
}

export default function HldDemo() {
  const [preset, setPreset] = useState<Preset>(PRESETS[0])
  const [weightMode, setWeightMode] = useState<"id" | "random">("id")
  const [seed, setSeed] = useState(0)
  const [presetName, setPresetName] = useState(PRESETS[0].name)
  const [speed, setSpeed] = useState(1)
  const [draft, setDraft] = useState<[number, number]>([0, 1])

  const n = preset.n
  // 点值：编号模式直接用 1..n；随机模式用 seed 派生，保证渲染稳定
  const values = useMemo(() => {
    if (weightMode === "id") return Array.from({ length: n }, (_, i) => i + 1)
    let s = seed * 9301 + 49297
    return Array.from({ length: n }, () => {
      s = (s * 9301 + 49297) % 233280
      return 1 + (s % 9)
    })
  }, [weightMode, n, seed])

  const sim = useMemo(() => simulate(n, preset.edges, preset.queries, values), [n, preset, values])
  const steps = sim.steps
  const stepper = useStepper({ count: steps.length, interval: SPEEDS[speed].ms })
  const { step, atEnd, playing } = stepper
  useStepKeys(stepper)
  const current = steps[Math.min(step, steps.length - 1)] ?? null

  // 父节点数组（建树用）：图中边方向以「离根更近」的一侧为父
  const parent = useMemo(() => {
    const n = preset.n
    const adj: number[][] = Array.from({ length: n }, () => [])
    for (const e of preset.edges) {
      adj[e.u].push(e.v)
      adj[e.v].push(e.u)
    }
    const par = new Array<number>(n).fill(-1)
    const seen = new Array<boolean>(n).fill(false)
    seen[0] = true
    const q = [0]
    for (let h = 0; h < q.length; h++) {
      const u = q[h]
      for (const v of adj[u]) {
        if (seen[v]) continue
        seen[v] = true
        par[v] = u
        q.push(v)
      }
    }
    return par
  }, [preset])

  const { nodes, height } = useMemo(() => layoutTree(parent), [parent])

  const top = current?.top ?? sim.top
  const heavy = current?.heavy ?? sim.heavy
  const dfn = current?.dfn ?? sim.dfn
  const depth = current?.depth ?? sim.depth

  const query = current?.query ?? null
  const highlight = new Set(current?.highlight ?? [])
  // 用字符串作为稳定 key，避免每次渲染都新建集合导致 useMemo 失效
  const segmentKey = (current?.segments ?? []).map(([l, r]) => `${l}-${r}`).join(",")

  const edges = useMemo(() => {
    const segments = new Set<number>()
    for (const part of segmentKey ? segmentKey.split(",") : []) {
      const [l, r] = part.split("-").map(Number)
      for (let d = l; d <= r; d++) segments.add(d)
    }
    return preset.edges.map((e, i) => {
        // 重边：v 是 u 的重儿子（或反之）
        const isHeavy = heavy[e.u] === e.v || heavy[e.v] === e.u
        const onSeg = segments.has(dfn[e.u]) && segments.has(dfn[e.v])
        return {
          id: `e${i}`,
          u: e.u,
          v: e.v,
          label: String(e.w),
          tone: onSeg ? ("chosen" as const) : isHeavy ? ("active" as const) : ("muted" as const),
          width: isHeavy ? 3 : 1.4,
        }
      })
  }, [preset.edges, heavy, dfn, segmentKey])

  const reset = () => stepper.reset()

  const update = (next: Preset, name?: string) => {
    setPreset(next)
    setPresetName(name ?? "")
    setDraft([0, Math.min(1, next.n - 1)])
    reset()
  }

  const addQuery = () => {
    const [a, b] = draft
    update({ ...preset, queries: [...preset.queries, [a, b]] }, presetName)
  }

  return (
    <div className="pt-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="flex flex-col overflow-hidden rounded-3xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs">
            <span className="flex flex-wrap items-center gap-3 text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-0.5 w-4 bg-primary" />重边
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-0.5 w-4 bg-emerald-500" />已计入答案
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block size-2 rounded-full ring-1 ring-current" />圆圈颜色 = 链头
              </span>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              n = {n} · {preset.queries.length} 个查询
            </span>
          </div>
          <div className="flex-1 p-2">
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              width={600}
              height={height}
              renderNode={(node) => {
                const id = node.id
                const head = top[id]
                const color = CHAIN_COLORS[head % CHAIN_COLORS.length]
                const isCur = current?.node === id
                const isHi = highlight.has(id)
                const isEndpoint = query && (query[0] === id || query[1] === id)
                return (
                  <>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={18}
                      fill={color}
                      fillOpacity={isHi ? 0.35 : 0.12}
                      stroke={color}
                      strokeWidth={isCur || isEndpoint ? 3 : 1.6}
                    />
                    {isCur && <circle cx={node.x} cy={node.y} r={24} className="fill-none stroke-primary" strokeWidth={1.5} strokeDasharray="3 3" />}
                    <text x={node.x} y={node.y + 4} textAnchor="middle" className="fill-current font-mono text-[11.5px] font-semibold">
                      {id + 1}
                    </text>
                    <text x={node.x} y={node.y - 24} textAnchor="middle" className="fill-current font-mono text-[9px] opacity-60">
                      dfn {dfn[id] || "–"}
                    </text>
                    <text x={node.x} y={node.y + 31} textAnchor="middle" className="fill-current font-mono text-[9px] opacity-60">
                      v={values[id]} · dep {depth[id]}
                    </text>
                  </>
                )
              }}
            />
          </div>
          <div className="border-t px-4 py-2">
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              <span className="text-muted-foreground">已计入区间</span>
              {(current?.segments ?? []).length === 0 && <span className="text-muted-foreground/60">—</span>}
              {(current?.segments ?? []).map(([l, r], i) => (
                <span key={i} className="rounded-md bg-emerald-500/10 px-1.5 py-0.5">
                  dfn[{l}, {r}]
                </span>
              ))}
              <span className="ml-auto text-muted-foreground">
                累计 <span className="text-foreground">{current?.acc ?? 0}</span>
              </span>
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
              label={current?.phase === "query" ? "当前点 / 链头" : "当前节点"}
              value={current && current.node >= 0 ? `${current.node + 1} / ${top[current.node] + 1}` : "—"}
              hint={current && current.node >= 0 ? `dfn ${dfn[current.node] || "–"} · size ${current.size[current.node]}` : ""}
              highlight
            />
            <StatBox
              label="查询结果"
              value={current?.result != null ? current.result : current?.phase === "query" ? current.acc : "—"}
              hint={query ? `路径 ${query[0] + 1} ↔ ${query[1] + 1}` : `${sim.results.length} 个查询`}
            />
          </div>
          <StepNarration
            badge={current?.phase === "query" ? "Q" : "B"}
            title={current?.phase === "query" ? "沿链跳转 · 区间求和" : "两遍 dfs 预处理"}
            text={current?.describe ?? "调整树结构后重新播放。"}
          />
          <CodePanel code={CODE} active={current?.codeLines ?? []} />
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <div className="rounded-3xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">点值</h2>
              <div className="flex items-center gap-0.5 rounded-xl border bg-muted/40 p-0.5">
                {(
                  [
                    ["id", "等于编号"],
                    ["random", "随机"],
                  ] as const
                ).map(([k, label]) => (
                  <Button
                    key={k}
                    size="xs"
                    variant="ghost"
                    aria-pressed={weightMode === k}
                    className={cn("rounded-lg", weightMode === k && "bg-background shadow-xs hover:bg-background")}
                    onPress={() => {
                      setWeightMode(k)
                      reset()
                    }}
                  >
                    {label}
                  </Button>
                ))}
                {weightMode === "random" && (
                  <Button
                    size="xs"
                    variant="ghost"
                    aria-label="重新随机点值"
                    className="rounded-lg"
                    onPress={() => {
                      setSeed((s) => s + 1)
                      reset()
                    }}
                  >
                    <Shuffle />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              每个点的值显示在节点下方。路径查询求的是路径上所有点权之和，用朴素 DFS 逐点相加即可校验。
            </p>
          </div>

          <div className="rounded-3xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">查询</h2>
              <span className="text-[11px] text-muted-foreground">点编号；左右端点会高亮</span>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                u
                <input
                  type="number"
                  min={1}
                  max={n}
                  value={draft[0] + 1}
                  onChange={(e) => setDraft([Math.max(0, Math.min(n - 1, Number(e.target.value) - 1)), draft[1]])}
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
                  onChange={(e) => setDraft([draft[0], Math.max(0, Math.min(n - 1, Number(e.target.value) - 1))])}
                  className="w-14 rounded-lg border bg-background px-1.5 py-1 text-center font-mono text-xs text-foreground"
                />
              </label>
              <Button size="xs" onPress={addQuery}>
                <Plus /> 添加查询
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {preset.queries.map(([a, b], i) => {
                const brute = brutePath(n, preset.edges, a, b, values)
                const got = sim.results[i]
                return (
                  <span
                    key={i}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 font-mono text-[11px]",
                      got === brute ? "bg-muted/40" : "border-rose-500/40 bg-rose-500/5"
                    )}
                  >
                    ({a + 1}, {b + 1}) = {got ?? "–"}
                    {got != null && got !== brute && <span className="text-rose-500">≠{brute}</span>}
                    <button
                      className="text-muted-foreground hover:text-rose-500"
                      aria-label={`删除查询 ${i + 1}`}
                      onClick={() => update({ ...preset, queries: preset.queries.filter((_, k) => k !== i) }, presetName)}
                    >
                      ×
                    </button>
                  </span>
                )
              })}
              {preset.queries.length === 0 && <span className="text-[11px] text-muted-foreground">还没有查询，只演示剖分</span>}
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">边列表（边权仅用于展示）</h2>
              <span className="text-[11px] text-muted-foreground">共 {preset.edges.length} 条</span>
            </div>
            <div className="max-h-40 overflow-y-auto rounded-xl border">
              {preset.edges.map((e, i) => (
                <div key={i} className="flex items-center gap-2 border-b px-2 py-1 font-mono text-[11px] last:border-0">
                  <span className="w-16">
                    {e.u + 1} — {e.v + 1}
                  </span>
                  <span className="text-muted-foreground">w={e.w}</span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="ml-auto"
                    aria-label={`删除边 ${e.u + 1}-${e.v + 1}`}
                    onPress={() => {
                      // 删除一条边后可能断成森林：只保留与 1 号点连通的部分
                      const kept = preset.edges.filter((_, k) => k !== i)
                      const adj: number[][] = Array.from({ length: n }, () => [])
                      for (const x of kept) {
                        adj[x.u].push(x.v)
                        adj[x.v].push(x.u)
                      }
                      const seen = new Array<boolean>(n).fill(false)
                      seen[0] = true
                      const q = [0]
                      for (let h = 0; h < q.length; h++) for (const v of adj[q[h]]) if (!seen[v]) { seen[v] = true; q.push(v) }
                      const alive = kept.filter((x) => seen[x.u] && seen[x.v])
                      if (alive.length === 0) return
                      update({ ...preset, edges: alive }, presetName)
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              {preset.edges.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">没有边</p>}
            </div>
            <PresetBar
              presets={PRESETS}
              current={presetName}
              onPick={(name) => {
                const p = PRESETS.find((x) => x.name === name)!
                update(p, p.name)
              }}
            >
              <Button
                variant="ghost"
                size="xs"
                onPress={() => update(randomTree(6 + Math.floor(Math.random() * 4)), "随机")}
              >
                <Shuffle /> 随机树
              </Button>
              <Button variant="ghost" size="xs" onPress={() => update(PRESETS[0], PRESETS[0].name)}>
                <RotateCcw /> 重置
              </Button>
            </PresetBar>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border bg-card p-4">
            <h2 className="mb-2 text-sm font-medium">剖分结果</h2>
            <p className="mb-2 text-[11px] text-muted-foreground">左到右按 dfn 排列；同色节点属于同一条重链</p>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: n }, (_, k) => k + 1)
                .filter((d) => dfn.indexOf(d) >= 0)
                .map((d) => {
                  const u = dfn.indexOf(d)
                  const head = top[u]
                  const color = CHAIN_COLORS[head % CHAIN_COLORS.length]
                  return (
                    <span
                      key={d}
                      className="flex min-w-10 flex-col items-center rounded-lg border px-1.5 py-0.5 font-mono text-[11px]"
                      style={{ backgroundColor: `${color}22`, borderColor: `${color}88` }}
                    >
                      <span className="font-semibold">{u + 1}</span>
                      <span className="text-[9px] opacity-60">dfn {d}</span>
                    </span>
                  )
                })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t pt-3 font-mono text-[11px] text-muted-foreground">
              <span>top = [{sim.top.map((t) => t + 1).join(",")}]</span>
              <span>heavy = [{sim.heavy.map((h) => (h < 0 ? "-" : h + 1)).join(",")}]</span>
              <span>dfn = [{sim.dfn.join(",")}]</span>
              <span>size = [{sim.size.join(",")}]</span>
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-medium">为什么要“重”链？</h2>
            <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
              <li>
                每个点选 size 最大的儿子作为重儿子，其余是轻儿子。一条重链从链头一路沿重儿子向下。
              </li>
              <li>
                从任意点跳到根，每经过一条轻边，所在子树大小至少减半，所以最多经过 O(log n) 条轻边，
                也就是最多跳 O(log n) 次链。
              </li>
              <li>
                第二遍 dfs 先走重儿子，能让同一棵子树的 dfn 连续、同一条重链的 dfn 也连续，
                于是树上路径 / 子树问题都能转成序列区间问题。
              </li>
              <li>配合线段树（或树状数组）后，路径查询 O(log² n)，子树查询 O(log n)。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
