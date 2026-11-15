import { useMemo, useState } from "react"
import { Plus, RotateCcw, Shuffle, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CodePanel, DemoControls, PresetBar, SPEEDS, StatBox, StepNarration } from "@/components/demo-shell"
import { useStepKeys, useStepper } from "@/hooks/use-stepper"
import { cn } from "@/lib/utils"

import { CODE, PRESETS, buildTree, lowbit, managedRange, simulate, type Op } from "./engine"

export default function BitDemo() {
  const [a, setA] = useState<number[]>(PRESETS[0].a)
  const [ops, setOps] = useState<Op[]>(PRESETS[0].ops)
  const [presetName, setPresetName] = useState(PRESETS[0].name)
  const [speed, setSpeed] = useState(1)
  const [kind, setKind] = useState<Op["kind"]>("add")
  const [f, setF] = useState({ i: 3, v: 1, l: 2, r: 5 })

  const sim = useMemo(() => simulate(a, ops), [a, ops])
  const steps = sim.steps
  const stepper = useStepper({ count: steps.length, interval: SPEEDS[speed].ms })
  const { step, atEnd, playing } = stepper
  useStepKeys(stepper)
  const current = steps[Math.min(step, steps.length - 1)] ?? null
  const c = current?.c ?? buildTree(a)
  const curOp = current ? ops[current.opIndex] : null

  const update = (nextA: number[], nextOps: Op[], name?: string) => {
    setA(nextA)
    setOps(nextOps)
    setPresetName(name ?? "")
    stepper.reset()
  }

  const results = steps.filter((s) => s.result !== null && s.mode === "done")

  return (
    <div className="pt-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="flex flex-col overflow-hidden rounded-3xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs">
            <span className="text-muted-foreground">
              {current && curOp ? opLabel(curOp) : "树状数组状态"}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">n = {a.length}</span>
          </div>
          <div className="flex-1 p-3">
            <BitView a={current?.a.slice(1) ?? a} c={c} n={a.length} active={current?.active ?? []} target={curOp} />
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
            <StatBox label="累加值 / 当前 c[i]" value={current?.acc ?? "—"} highlight />
            <StatBox
              label="已得结果"
              value={results.length ? results[results.length - 1].result : "—"}
              hint={results.length ? results.map((r) => r.result).join(" · ") : "尚无结果"}
            />
          </div>
          <StepNarration
            badge={curOp ? current!.opIndex + 1 : 0}
            title={curOp ? opLabel(curOp) : "初始化"}
            text={current?.describe ?? "添加操作后开始回放。"}
          />
          <CodePanel code={CODE} active={current?.codeLines ?? []} />
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <div className="rounded-3xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">数组 a（1-based）</h2>
              <span className="text-[11px] text-muted-foreground">长度 {a.length}（2 ~ 12）</span>
            </div>
            <div className="flex flex-wrap items-end gap-1.5">
              {a.map((v, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <input
                    type="number"
                    value={v}
                    onChange={(e) => update(a.map((x, j) => (j === i ? Number(e.target.value) || 0 : x)), ops)}
                    className="w-14 rounded-lg border bg-background px-1.5 py-1 text-center font-mono text-sm focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none"
                    aria-label={`a[${i + 1}]`}
                  />
                  <span className="font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                </div>
              ))}
              <Button
                variant="outline"
                size="icon-xs"
                aria-label="追加元素"
                className="mb-3.5"
                isDisabled={a.length >= 12}
                onPress={() => update([...a, Math.floor(Math.random() * 9) + 1], ops)}
              >
                <Plus />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="删除最后一个元素"
                className="mb-3.5"
                isDisabled={a.length <= 2}
                onPress={() => update(a.slice(0, -1), ops.filter((o) => opFits(o, a.length - 1)))}
              >
                <Trash2 />
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium">添加操作</h2>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex items-center gap-0.5 rounded-xl border bg-muted/40 p-0.5">
                {(
                  [
                    ["add", "单点加"],
                    ["prefix", "前缀和"],
                    ["range", "区间和"],
                    ["lowbit", "lowbit"],
                  ] as const
                ).map(([k, label]) => (
                  <Button
                    key={k}
                    size="xs"
                    variant="ghost"
                    aria-pressed={kind === k}
                    className={cn("rounded-lg", kind === k && "bg-background shadow-xs hover:bg-background")}
                    onPress={() => setKind(k)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {kind === "range" ? (
                <>
                  <Num label="l" value={f.l} onChange={(l) => setF({ ...f, l })} />
                  <Num label="r" value={f.r} onChange={(r) => setF({ ...f, r })} />
                </>
              ) : (
                <Num label="i" value={f.i} onChange={(i) => setF({ ...f, i })} />
              )}
              {kind === "add" && <Num label="v" value={f.v} onChange={(v) => setF({ ...f, v })} />}
              <Button
                size="sm"
                onPress={() => {
                  const clamp = (x: number) => Math.max(1, Math.min(a.length, x))
                  const op: Op =
                    kind === "add"
                      ? { kind, i: clamp(f.i), v: f.v }
                      : kind === "prefix"
                        ? { kind, i: clamp(f.i) }
                        : kind === "lowbit"
                          ? { kind, i: Math.max(1, f.i) }
                          : { kind, l: Math.min(clamp(f.l), clamp(f.r)), r: Math.max(clamp(f.l), clamp(f.r)) }
                  update(a, [...ops, op])
                }}
              >
                <Plus /> 执行
              </Button>
            </div>
            <div className="mt-3 max-h-52 space-y-1 overflow-y-auto border-t pt-3">
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
                  <Button variant="ghost" size="icon-xs" aria-label={`删除操作 ${i + 1}`} onPress={() => update(a, ops.filter((_, k) => k !== i))}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
              {ops.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">还没有操作</p>}
            </div>
            <PresetBar presets={PRESETS} current={presetName} onPick={(name) => {
              const p = PRESETS.find((x) => x.name === name)!
              update(p.a, p.ops, p.name)
            }}>
              <Button variant="ghost" size="xs" onPress={() => {
                const n = 4 + Math.floor(Math.random() * 7)
                const nextA = Array.from({ length: n }, () => Math.floor(Math.random() * 10))
                const nextOps: Op[] = [
                  { kind: "add", i: 1 + Math.floor(Math.random() * n), v: Math.floor(Math.random() * 9) - 4 },
                  { kind: "prefix", i: 1 + Math.floor(Math.random() * n) },
                ]
                update(nextA, nextOps, "随机")
              }}>
                <Shuffle /> 随机
              </Button>
              <Button variant="ghost" size="xs" onPress={() => update(PRESETS[0].a, PRESETS[0].ops, PRESETS[0].name)}>
                <RotateCcw /> 重置
              </Button>
            </PresetBar>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border bg-card p-4">
            <h2 className="mb-2 text-sm font-medium">lowbit 与管辖区间</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] sm:grid-cols-3">
              {c.slice(1).map((v, k) => {
                const i = k + 1
                const [l, r] = managedRange(i)
                return (
                  <div key={i} className="flex justify-between border-b border-dashed pb-0.5 text-muted-foreground">
                    <span>
                      c[{i}]
                    </span>
                    <span>
                      a[{l}..{r}]
                    </span>
                    <span className="text-foreground">{v}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="rounded-3xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-medium">为什么要这样跳？</h2>
            <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
              <li>
                <span className="font-mono text-foreground">lowbit(i) = i &amp; −i</span> 取出 i 二进制中最低位的 1。c[i] 管辖长度为 lowbit(i) 的后缀区间 (i − lowbit(i), i]。
              </li>
              <li>修改 a[i] 会影响所有“管辖区间包含 i”的 c[j]，它们恰好是 i, i + lowbit(i), … 一路向上跳的结果。</li>
              <li>前缀和 prefix(i) 把 [1, i] 拆成 lowbit 长度的若干块，下标依次 i, i − lowbit(i), …，跳的次数不超过二进制位数。</li>
              <li>树状数组常数小、代码短，但只适合前缀信息可合并（如加法、最大值）的情况。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function opLabel(op: Op) {
  switch (op.kind) {
    case "add":
      return `a[${op.i}] ${op.v >= 0 ? "+" : "−"}= ${Math.abs(op.v)}`
    case "prefix":
      return `prefix(${op.i})`
    case "range":
      return `sum(${op.l}..${op.r})`
    case "lowbit":
      return `lowbit(${op.i})`
  }
}

function opFits(op: Op, n: number) {
  if (op.kind === "add" || op.kind === "prefix") return op.i <= n
  if (op.kind === "range") return op.r <= n
  return true
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

function BitView({
  a,
  c,
  n,
  active,
  target,
}: {
  a: number[]
  c: number[]
  n: number
  active: number[]
  target: Op | null
}) {
  const cellW = Math.max(38, Math.min(56, 520 / n))
  const left = 46
  const rowY = { a: 26, c: 92 }
  const width = left + (n + 1) * cellW + 12
  const height = 190
  const x = (i: number) => left + i * cellW

  // 目标区间
  let targetRange: [number, number] | null = null
  if (target) {
    if (target.kind === "add" || target.kind === "prefix") targetRange = [1, target.i]
    else if (target.kind === "range") targetRange = [target.l, target.r]
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto block h-auto text-foreground" style={{ minWidth: Math.min(width, 600) }}>
        <text x={4} y={rowY.a + 4} className="fill-current font-mono text-[10px] opacity-60">a[]</text>
        <text x={4} y={rowY.c + 4} className="fill-current font-mono text-[10px] opacity-60">c[]</text>

        {/* a 行 */}
        {a.map((v, k) => {
          const i = k + 1
          const inT = targetRange && i >= targetRange[0] && i <= targetRange[1]
          return (
            <g key={`a${i}`}>
              <rect
                x={x(i) + 2}
                y={rowY.a - 15}
                width={cellW - 4}
                height={30}
                rx={6}
                className={cn("transition-colors", inT ? "fill-amber-500/15 stroke-amber-500/50" : "fill-muted/40 stroke-border")}
                strokeWidth={1}
              />
              <text x={x(i) + cellW / 2} y={rowY.a + 4} textAnchor="middle" className="fill-current font-mono text-[11.5px]">
                {v}
              </text>
            </g>
          )
        })}

        {/* c 行 */}
        {c.slice(1).map((v, k) => {
          const i = k + 1
          const [l, r] = managedRange(i)
          const isActive = active.includes(i)
          return (
            <g key={`c${i}`}>
              <rect
                x={x(i) + 2}
                y={rowY.c - 15}
                width={cellW - 4}
                height={30}
                rx={6}
                className={cn("transition-[fill,stroke] duration-300", isActive ? "fill-primary/25 stroke-primary" : "fill-card stroke-border")}
                strokeWidth={isActive ? 2 : 1}
              />
              <text x={x(i) + cellW / 2} y={rowY.c + 4} textAnchor="middle" className="fill-current font-mono text-[11.5px] font-semibold">
                {v}
              </text>
              {/* 管辖区间括号 */}
              <path
                d={`M${x(l) + 4} ${rowY.c + 24} H${x(r + 1) - 4}`}
                stroke={isActive ? "var(--color-primary)" : "currentColor"}
                strokeOpacity={isActive ? 0.9 : 0.18}
                strokeWidth={isActive ? 2 : 1}
              />
              <text
                x={(x(l) + x(r + 1)) / 2}
                y={rowY.c + 37}
                textAnchor="middle"
                className="fill-current text-[9px]"
                opacity={isActive ? 0.9 : 0.45}
              >
                lb={lowbit(i)}
              </text>
            </g>
          )
        })}

        {/* 下标 */}
        {Array.from({ length: n }, (_, k) => k + 1).map((i) => (
          <text key={`ix${i}`} x={x(i) + cellW / 2} y={height - 8} textAnchor="middle" className="fill-current font-mono text-[9.5px] opacity-50">
            {i}
          </text>
        ))}
      </svg>
    </div>
  )
}
