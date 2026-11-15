import { useMemo, useState } from "react"
import {
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useStepKeys, useStepper } from "@/hooks/use-stepper"
import { CODE, PRESETS, bruteForce, pointValue, simulate, type Op } from "./engine"
import { TreeCanvas } from "./tree-canvas"

const SPEEDS = [
  { label: "0.5×", ms: 1000 },
  { label: "1×", ms: 600 },
  { label: "2×", ms: 300 },
  { label: "4×", ms: 140 },
] as const

const MAX_N = 10

export default function SegmentTreeDemo() {
  const [base, setBase] = useState<number[]>(PRESETS[0].base)
  const [ops, setOps] = useState<Op[]>(PRESETS[0].ops)
  const [presetName, setPresetName] = useState(PRESETS[0].name)
  const [speed, setSpeed] = useState(1)

  // 操作编辑器
  const [draftKind, setDraftKind] = useState<Op["kind"]>("add")
  const [draftL, setDraftL] = useState(0)
  const [draftR, setDraftR] = useState(3)
  const [draftV, setDraftV] = useState(1)

  const sim = useMemo(() => simulate(base, ops), [base, ops])
  const steps = sim.steps
  const stepper = useStepper({
    count: steps.length,
    interval: SPEEDS[speed].ms,
  })
  const { step: stepIndex, atEnd, playing } = stepper
  const current = steps[Math.min(stepIndex, steps.length - 1)] ?? null
  useStepKeys(stepper)

  function update(nextBase: number[], nextOps: Op[], name?: string) {
    setBase(nextBase)
    setOps(nextOps)
    setPresetName(name ?? "")
    stepper.reset()
    setDraftL(0)
    setDraftR(Math.min(nextBase.length, 3))
  }

  function applyValueEdit(i: number, value: number) {
    const next = [...base]
    next[i] = value
    update(next, ops)
  }

  function addOp() {
    const l = Math.max(0, Math.min(draftL, base.length - 1))
    const r = Math.max(l + 1, Math.min(draftR, base.length))
    const op: Op = draftKind === "add" ? { kind: "add", l, r, value: draftV } : { kind: "sum", l, r, value: 0 }
    update(base, [...ops, op])
  }

  function randomize() {
    const n = 4 + Math.floor(Math.random() * 5)
    const nextBase = Array.from({ length: n }, () => Math.floor(Math.random() * 20) - 5)
    const nextOps: Op[] = Array.from({ length: 3 + Math.floor(Math.random() * 2) }, () => {
      const l = Math.floor(Math.random() * n)
      const r = l + 1 + Math.floor(Math.random() * (n - l))
      return Math.random() < 0.6
        ? { kind: "add" as const, l, r, value: Math.floor(Math.random() * 11) - 5 }
        : { kind: "sum" as const, l, r, value: 0 }
    })
    update(nextBase, nextOps, "随机")
  }

  const brute = useMemo(() => bruteForce(base, ops), [base, ops])
  const sumResults = steps.filter((s) => s.result !== null).map((s) => s.result as number)
  const sumOps = ops.filter((o) => o.kind === "sum")
  const doneTree = steps[steps.length - 1]?.tree ?? sim.initialTree
  const finalValues = doneTree.length ? base.map((_, i) => pointValue(doneTree, base.length, i)) : []
  const verified =
    JSON.stringify(sumResults) === JSON.stringify(brute.sums) &&
    JSON.stringify(finalValues) === JSON.stringify(brute.final)

  const progress = steps.length > 1 ? stepIndex / (steps.length - 1) : 0
  const currentOpIndex = current?.opIndex ?? -1

  return (
    <div className="pt-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* 树 */}
        <section className="flex flex-col overflow-hidden rounded-3xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex size-2">
                <span
                  className={cn("absolute inline-flex size-2 rounded-full bg-primary", !atEnd && "animate-ping opacity-60")}
                />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              {current ? (
                <>
                  {current.op.kind === "add" ? "区间加" : "区间求和"} ·{" "}
                  <span className="font-mono text-foreground">
                    [{current.op.l}, {current.op.r})
                    {current.op.kind === "add" && current.op.value !== 0 ? ` += ${current.op.value}` : ""}
                  </span>
                </>
              ) : (
                "暂无操作"
              )}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              第 {Math.min(stepIndex, Math.max(0, steps.length - 1))} / {Math.max(0, steps.length - 1)} 步
            </div>
          </div>
          <div className="flex-1 p-3">
            <TreeCanvas step={current} n={base.length} />
          </div>
          <div className="h-1 w-full bg-muted">
            <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
          </div>
        </section>

        {/* 控制 + 解说 */}
        <section className="flex flex-col gap-4">
          <div className="rounded-3xl border bg-card p-3">
            <div className="flex items-center justify-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                aria-label="回到开始"
                onPress={stepper.first}
              >
                <SkipBack />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="上一步"
                onPress={stepper.prev}
              >
                <ChevronLeft />
              </Button>
              <Button size="lg" className="min-w-24" onPress={stepper.toggle} aria-label={playing ? "暂停" : "播放"}>
                {playing ? <Pause /> : <Play />}
                {playing ? "暂停" : atEnd ? "重播" : "播放"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="下一步"
                onPress={stepper.next}
              >
                <ChevronRight />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="跳到结尾"
                onPress={stepper.end}
              >
                <SkipForward />
              </Button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
              <span className="text-[11px] text-muted-foreground">速度</span>
              <div className="flex items-center gap-0.5 rounded-xl border bg-muted/40 p-0.5">
                {SPEEDS.map((s, i) => (
                  <Button
                    key={s.label}
                    size="xs"
                    variant="ghost"
                    aria-pressed={speed === i}
                    className={cn("rounded-lg px-2", speed === i && "bg-background shadow-xs hover:bg-background")}
                    onPress={() => setSpeed(i)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, steps.length - 1)}
              value={Math.min(stepIndex, Math.max(0, steps.length - 1))}
              onChange={(e) => {
                stepper.pause()
                stepper.setStep(Number(e.target.value))
              }}
              className="mt-3 w-full accent-primary"
              aria-label="步骤进度"
            />
            <p className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                操作 {currentOpIndex >= 0 ? currentOpIndex + 1 : 0} / {ops.length}
              </span>
              <span className="font-mono">← → 单步 · 空格 播放</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border bg-card px-3 py-2">
              <div className="text-[10px] text-muted-foreground">当前访问节点</div>
              <div className="truncate font-mono text-lg leading-tight font-semibold">
                {current ? `#${current.node}` : "—"}
              </div>
              <div className="truncate font-mono text-[10px] text-muted-foreground">
                {current ? `路径 ${current.path.join(" → ")}` : ""}
              </div>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 px-3 py-2">
              <div className="text-[10px] text-muted-foreground">
                {current?.op.kind === "sum" ? "累计答案" : "已打 tag 节点"}
              </div>
              <div className="truncate font-mono text-lg leading-tight font-semibold tabular-nums">
                {current?.op.kind === "sum"
                  ? current.accumulating
                  : new Set(current?.tagged ?? []).size}
              </div>
              <div className="truncate font-mono text-[10px] text-muted-foreground">
                {current?.op.kind === "sum"
                  ? current.result !== null
                    ? `结果 ${current.result}`
                    : "计算中…"
                  : current?.tagged.length
                    ? [...new Set(current.tagged)].map((t) => `#${t}`).join(" ")
                    : "—"}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium">
              <span className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-[10px] text-primary">
                {current?.opIndex != null ? current.opIndex + 1 : 0}
              </span>
              {current?.op.kind === "add" ? "区间加" : current?.op.kind === "sum" ? "区间求和" : "初始化"}
            </div>
            <p className="min-h-10 text-sm leading-relaxed text-foreground/90">
              {current?.describe ?? "添加一个操作后开始回放。"}
            </p>
          </div>

          <div className="rounded-3xl border bg-card p-3">
            <h2 className="mb-2 px-1 text-xs font-medium text-muted-foreground">对应代码</h2>
            <div className="overflow-x-auto rounded-xl bg-muted/50 p-2">
              <pre className="font-mono text-[11px] leading-[1.55]">
                <code>
                  {CODE.map((line, i) => (
                    <div
                      key={i}
                      className={cn(
                        "whitespace-pre rounded px-1.5 transition-colors",
                        current?.codeLines.includes(i) && "bg-primary/15 text-foreground"
                      )}
                    >
                      <span className="mr-3 inline-block w-4 text-right text-muted-foreground/60 select-none">
                        {i + 1}
                      </span>
                      {line || " "}
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        </section>
      </div>

      {/* 操作编辑器 */}
      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <div className="rounded-3xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">初始数组</h2>
              <span className="text-[11px] text-muted-foreground">长度 {base.length}（最多 {MAX_N}）</span>
            </div>
            <div className="flex flex-wrap items-end gap-1.5">
              {base.map((v, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <input
                    type="number"
                    value={v}
                    onChange={(e) => applyValueEdit(i, Number(e.target.value) || 0)}
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
                isDisabled={base.length >= MAX_N}
                onPress={() => update([...base, 0], ops)}
              >
                <Plus />
              </Button>
              {base.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="删除最后一个元素"
                  className="mb-3.5"
                  onPress={() => update(base.slice(0, -1), ops)}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
              <Button variant="outline" size="xs" onPress={randomize}>
                <Shuffle /> 随机数据与操作
              </Button>
              <Button variant="ghost" size="xs" onPress={() => update(PRESETS[0].base, PRESETS[0].ops, PRESETS[0].name)}>
                <RotateCcw /> 重置
              </Button>
              {PRESETS.map((p) => (
                <Button
                  key={p.name}
                  size="xs"
                  variant={presetName === p.name ? "secondary" : "ghost"}
                  onPress={() => update(p.base, p.ops, p.name)}
                >
                  {p.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium">添加操作</h2>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex items-center gap-0.5 rounded-xl border bg-muted/40 p-0.5">
                {(["add", "sum"] as const).map((k) => (
                  <Button
                    key={k}
                    size="xs"
                    variant="ghost"
                    aria-pressed={draftKind === k}
                    className={cn("rounded-lg", draftKind === k && "bg-background shadow-xs hover:bg-background")}
                    onPress={() => setDraftKind(k)}
                  >
                    {k === "add" ? "区间加" : "区间和"}
                  </Button>
                ))}
              </div>
              <NumberField label="l" value={draftL} onChange={setDraftL} />
              <NumberField label="r" value={draftR} onChange={setDraftR} />
              {draftKind === "add" && <NumberField label="v" value={draftV} onChange={setDraftV} />}
              <Button size="sm" onPress={addOp}>
                <Plus /> 执行
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              区间为左闭右开，表示对下标 [l, r) 操作；右侧将逐步回放整个过程。
            </p>
            <div className="mt-3 max-h-56 space-y-1 overflow-y-auto border-t pt-3">
              {ops.map((op, i) => {
                const isCurrent = i === currentOpIndex
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-2 py-1 font-mono text-[11px] transition-colors",
                      isCurrent ? "bg-primary/10" : "hover:bg-muted/60"
                    )}
                  >
                    <span className="w-4 text-muted-foreground">{i + 1}</span>
                    <span className={cn("w-12", op.kind === "add" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
                      {op.kind === "add" ? "add" : "sum"}
                    </span>
                    <span>
                      [{op.l}, {op.r})
                    </span>
                    {op.kind === "add" && <span className="text-muted-foreground">{op.value >= 0 ? `+${op.value}` : op.value}</span>}
                    <span className="ml-auto flex gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="上移"
                        isDisabled={i === 0}
                        onPress={() => {
                          const next = [...ops]
                          ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                          update(base, next)
                        }}
                      >
                        <ArrowDownToLine className="rotate-180" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`删除操作 ${i + 1}`}
                        onPress={() => update(base, ops.filter((_, k) => k !== i))}
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  </div>
                )
              })}
              {ops.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">还没有操作</p>
              )}
            </div>
          </div>
        </div>

        {/* 校验与原理 */}
        <div className="space-y-4">
          <div className="rounded-3xl border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium">结果校验</h2>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                  verified
                    ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400"
                )}
              >
                {verified ? "与暴力法一致 ✓" : "不一致 ✗"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="rounded-xl border p-2">
                <div className="mb-1 text-[10px] text-muted-foreground">区间和结果</div>
                {sumResults.length ? (
                  <ul className="space-y-0.5">
                    {sumResults.map((v, i) => (
                      <li key={i} className="flex justify-between">
                        <span className="text-muted-foreground">
                          sum([{sumOps[i]?.l}, {sumOps[i]?.r}))
                        </span>
                        <span className="font-semibold">{v}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div className="rounded-xl border p-2">
                <div className="mb-1 text-[10px] text-muted-foreground">最终数组（暴力法）</div>
                <div className="break-all">[{brute.final.join(", ")}]</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-medium">为什么这样设计？</h2>
            <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
              {[
                "每个节点存区间和 sum；区间被整体修改时不往下走，而是在节点上打一个 tag（懒标记）。",
                "需要进入子区间之前，先把父节点的 tag 下传（pushDown），保证孩子看到的是最新值。",
                "递归回来时用两个孩子重新计算 sum（pull），所以根节点永远等于全数组之和。",
                "一次区间修改 / 查询只会访问 O(log n) 条路径上的 O(log n) 个节点。",
                "本例区间为左闭右开 [l, r)，叶子是单个元素 [i, i+1)。",
              ].map((t, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[10px] text-foreground">
                    {i + 1}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t pt-3 text-[12px] leading-relaxed text-muted-foreground">
              单次操作时间复杂度 <span className="font-mono text-foreground">O(log n)</span>，建树{" "}
              <span className="font-mono text-foreground">O(n)</span>，空间{" "}
              <span className="font-mono text-foreground">O(n)</span>。
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-14 rounded-lg border bg-background px-1.5 py-1 text-center font-mono text-xs text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none"
      />
    </label>
  )
}
