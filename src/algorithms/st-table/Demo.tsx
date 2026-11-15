import { useMemo, useState } from "react"
import { Plus, RotateCcw, Shuffle, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CodePanel, DemoControls, PresetBar, SPEEDS, StatBox, StepNarration } from "@/components/demo-shell"
import { useStepKeys, useStepper } from "@/hooks/use-stepper"
import { cn } from "@/lib/utils"

import { CODE, PRESETS, simulate } from "./engine"

export default function StTableDemo() {
  const [a, setA] = useState<number[]>(PRESETS[0].a)
  const [queries, setQueries] = useState<[number, number][]>(PRESETS[0].queries)
  const [presetName, setPresetName] = useState(PRESETS[0].name)
  const [speed, setSpeed] = useState(1)
  const [draft, setDraft] = useState<[number, number]>([0, 3])

  const sim = useMemo(() => simulate(a, queries), [a, queries])
  const steps = sim.steps
  const stepper = useStepper({ count: steps.length, interval: SPEEDS[speed].ms })
  const { step, atEnd, playing } = stepper
  useStepKeys(stepper)
  const current = steps[Math.min(step, steps.length - 1)] ?? null

  const update = (nextA: number[], nextQ: [number, number][], name?: string) => {
    setA(nextA)
    setQueries(nextQ)
    setPresetName(name ?? "")
    stepper.reset()
  }

  const queryIndex = current ? steps.slice(0, current.index + 1).filter((s) => s.phase === "query" && s.value != null && s.cells.length === 2).length - 1 : -1
  const lastQuery = current?.phase === "query" ? current.query : null

  return (
    <div className="pt-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="flex flex-col overflow-hidden rounded-3xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs">
            <span className="text-muted-foreground">
              {current?.phase === "query" ? "查询阶段" : "构建阶段"} · 第
              <span className="mx-1 font-mono text-foreground">{Math.min(step, Math.max(0, steps.length - 1))}</span>/
              {Math.max(0, steps.length - 1)} 步
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">n = {a.length} · K = {sim.maxK}</span>
          </div>
          <div className="flex-1 p-3">
            <StTableView
              a={a}
              table={current?.table ?? sim.st.map(() => a.map(() => undefined))}
              cells={current?.cells ?? []}
              query={lastQuery}
            />
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
            <StatBox label="当前值" value={current?.value ?? "—"} highlight />
            <StatBox
              label={current?.phase === "query" ? "查询结果" : "层数"}
              value={current?.phase === "query" ? (queryIndex >= 0 ? sim.queryResults[queryIndex]?.result : "—") : sim.maxK + 1}
              hint={
                current?.phase === "query" && lastQuery
                  ? `[${lastQuery[0]}, ${lastQuery[1]}]`
                  : `已完成的查询 ${Math.max(0, queryIndex)} / ${queries.length}`
              }
            />
          </div>
          <StepNarration
            badge={current?.phase === "query" ? "Q" : "B"}
            title={current?.phase === "query" ? "查询" : "预处理"}
            text={current?.describe ?? "调整数组或查询后重新播放。"}
          />
          <CodePanel code={CODE} active={current?.codeLines ?? []} />
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="rounded-3xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">数组与查询</h2>
            <span className="text-[11px] text-muted-foreground">长度 {a.length}（2 ~ 14）</span>
          </div>
          <div className="flex flex-wrap items-end gap-1.5">
            {a.map((v, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <input
                  type="number"
                  value={v}
                  onChange={(e) => update(a.map((x, j) => (j === i ? Number(e.target.value) || 0 : x)), queries)}
                  className="w-14 rounded-lg border bg-background px-1.5 py-1 text-center font-mono text-sm focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none"
                  aria-label={`a[${i}]`}
                />
                <span className="font-mono text-[10px] text-muted-foreground">{i}</span>
              </div>
            ))}
            <Button
              variant="outline"
              size="icon-xs"
              aria-label="追加元素"
              className="mb-3.5"
              isDisabled={a.length >= 14}
              onPress={() => update([...a, Math.floor(Math.random() * 20)], queries)}
            >
              <Plus />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="删除最后一个元素"
              className="mb-3.5"
              isDisabled={a.length <= 2}
              onPress={() => update(a.slice(0, -1), queries.filter(([, r]) => r < a.length - 1))}
            >
              <Trash2 />
            </Button>
          </div>

          <div className="mt-4 border-t pt-3">
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">查询列表（闭区间）</h3>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                l
                <input
                  type="number"
                  min={0}
                  max={a.length - 1}
                  value={draft[0]}
                  onChange={(e) => setDraft([Number(e.target.value), draft[1]])}
                  className="w-14 rounded-lg border bg-background px-1.5 py-1 text-center font-mono text-xs text-foreground"
                />
              </label>
              <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                r
                <input
                  type="number"
                  min={0}
                  max={a.length - 1}
                  value={draft[1]}
                  onChange={(e) => setDraft([draft[0], Number(e.target.value)])}
                  className="w-14 rounded-lg border bg-background px-1.5 py-1 text-center font-mono text-xs text-foreground"
                />
              </label>
              <Button
                size="xs"
                onPress={() => {
                  const l = Math.max(0, Math.min(a.length - 1, Math.min(draft[0], draft[1])))
                  const r = Math.max(0, Math.min(a.length - 1, Math.max(draft[0], draft[1])))
                  update(a, [...queries, [l, r]])
                }}
              >
                <Plus /> 添加查询
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {queries.map(([l, r], i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 px-2 py-0.5 font-mono text-[11px]"
                >
                  [{l}, {r}]
                  <button
                    className="text-muted-foreground hover:text-rose-500"
                    aria-label={`删除查询 ${i + 1}`}
                    onClick={() => update(a, queries.filter((_, k) => k !== i))}
                  >
                    ×
                  </button>
                </span>
              ))}
              {queries.length === 0 && <span className="text-[11px] text-muted-foreground">还没有查询，只演示构建</span>}
            </div>
            <PresetBar presets={PRESETS} current={presetName} onPick={(name) => {
              const p = PRESETS.find((x) => x.name === name)!
              update(p.a, p.queries, p.name)
            }}>
              <Button variant="ghost" size="xs" onPress={() => {
                const n = 6 + Math.floor(Math.random() * 5)
                const nextA = Array.from({ length: n }, () => Math.floor(Math.random() * 40))
                const qs: [number, number][] = Array.from({ length: 3 }, () => {
                  const l = Math.floor(Math.random() * n)
                  return [l, l + Math.floor(Math.random() * (n - l))]
                })
                update(nextA, qs, "随机")
              }}>
                <Shuffle /> 随机
              </Button>
              <Button variant="ghost" size="xs" onPress={() => update(PRESETS[0].a, PRESETS[0].queries, PRESETS[0].name)}>
                <RotateCcw /> 重置
              </Button>
            </PresetBar>
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-medium">为什么两段重叠区间能覆盖整个查询区间？</h2>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            取 <span className="font-mono text-foreground">k = ⌊log₂ len⌋</span>，两段长度都是{" "}
            <span className="font-mono text-foreground">2^k</span>，且{" "}
            <span className="font-mono text-foreground">2^k ≤ len &lt; 2^(k+1)</span>。
            左段从 l 开始，右段以 r 结束，两段总长超过 len，所以必定覆盖 [l, r] 全部元素；
            而 min 是幂等的，重叠部分重复计算不影响答案。
          </p>
          <div className="mt-3 rounded-xl bg-muted/50 p-3 font-mono text-[11.5px] leading-relaxed">
            <div>左段：[l, l + 2^k − 1]</div>
            <div>右段：[r − 2^k + 1, r]</div>
            <div>答案：min( st[k][l], st[k][r − 2^k + 1] )</div>
          </div>
          <ul className="mt-3 space-y-1.5 text-[12px] leading-relaxed text-muted-foreground">
            <li>· 只支持静态数组：数组一旦改变就要重建。</li>
            <li>· 线上求 k 常用预处理的 log2 表，避免每次调用 log。</li>
            <li>· 与线段树相比：预处理更贵（O(n log n)），但查询是 O(1)。</li>
            <li>· 这里的倍增思想也是「LCA 倍增」的基础，见相关算法。</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function StTableView({
  a,
  table,
  cells,
  query,
}: {
  a: number[]
  table: (number | undefined)[][]
  cells: { l: number; r: number }[]
  query: [number, number] | null
}) {
  const n = a.length
  const colW = Math.max(40, Math.min(56, 560 / n))
  const rowH = 30
  const labelW = 58
  const width = labelW + colW * n + 16
  const height = (table.length + 1) * rowH + 30
  const inCells = (l: number, r: number) => cells.some((c) => c.l === l && c.r === r)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto block h-auto text-foreground" style={{ minWidth: Math.min(width, 620) }}>
        {/* 表头：下标 */}
        <text x={4} y={rowH - 6} className="fill-current text-[10px] opacity-50">i →</text>
        {Array.from({ length: n }, (_, i) => {
          const inQ = query && i >= query[0] && i <= query[1]
          return (
            <g key={`h${i}`}>
              <rect
                x={labelW + i * colW + 2}
                y={2}
                width={colW - 4}
                height={rowH - 8}
                rx={5}
                className={cn("transition-colors", inQ ? "fill-emerald-500/20" : "fill-muted/50")}
              />
              <text x={labelW + i * colW + colW / 2} y={rowH - 11} textAnchor="middle" className="fill-current font-mono text-[10px]">
                {i}
              </text>
            </g>
          )
        })}

        {table.map((row, k) => {
          const len = 1 << k
          return (
            <g key={`r${k}`} transform={`translate(0, ${rowH + k * rowH})`}>
              <text x={4} y={rowH / 2 + 4} className="fill-current font-mono text-[9.5px] opacity-60">
                st[{k}]·{len}
              </text>
              {row.map((v, i) => {
                const valid = i + len <= n
                if (!valid) {
                  return (
                    <rect
                      key={`c${i}`}
                      x={labelW + i * colW + 2}
                      y={2}
                      width={colW - 4}
                      height={rowH - 4}
                      rx={5}
                      className="fill-current opacity-[0.03]"
                    />
                  )
                }
                const active = inCells(i, i + len)
                const inQ = query && i <= query[1] && i + len - 1 >= query[0]
                return (
                  <g key={`c${i}`}>
                    <rect
                      x={labelW + i * colW + 2}
                      y={2}
                      width={colW - 4}
                      height={rowH - 4}
                      rx={5}
                      className={cn(
                        "transition-[fill,stroke] duration-300",
                        active ? "fill-primary/30 stroke-primary" : inQ ? "fill-amber-500/15 stroke-amber-500/40" : "fill-card stroke-border"
                      )}
                      strokeWidth={active ? 1.8 : 1}
                    />
                    <text
                      x={labelW + i * colW + colW / 2}
                      y={rowH / 2 + 2}
                      textAnchor="middle"
                      className={cn("font-mono text-[11px]", active && "font-semibold")}
                      fill="currentColor"
                    >
                      {v}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}
        <text x={labelW} y={height - 10} className="fill-current text-[10px] opacity-50">
          橙色 = 与查询区间相交 · 深色 = 当前使用的格子
        </text>
      </svg>
    </div>
  )
}
