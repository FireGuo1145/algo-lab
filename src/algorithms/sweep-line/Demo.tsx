import { useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
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
import { useStepKeys, useStepper } from "@/hooks/use-stepper"
import { cn } from "@/lib/utils"

import { GeometryCanvas, rectColor } from "./geometry-canvas"
import { TreeView } from "./tree-view"
import { PRESETS, randomRects, simulate, type Rect } from "./engine"

const SPEEDS = [
  { label: "0.5×", ms: 1000 },
  { label: "1×", ms: 620 },
  { label: "2×", ms: 320 },
  { label: "4×", ms: 150 },
] as const

let nextId = 100

export default function SweepLineDemo() {
  const [rects, setRects] = useState<Rect[]>(PRESETS[0].rects)
  const [presetName, setPresetName] = useState<string>(PRESETS[0].name)
  const [selected, setSelected] = useState<number | null>(null)
  const [speed, setSpeed] = useState(1)
  const [showAdvanced, setShowAdvanced] = useState(true)

  const sim = useMemo(() => simulate(rects), [rects])
  const steps = sim.steps
  const stepper = useStepper({ count: steps.length, interval: SPEEDS[speed].ms })
  const { step: stepIndex, atEnd, playing } = stepper
  useStepKeys(stepper)
  const current = steps[Math.min(stepIndex, steps.length - 1)]

  function updateRects(next: Rect[], name?: string) {
    setRects(next)
    setPresetName(name ?? "")
    setSelected(null)
    stepper.reset()
  }

  const areaSoFar = current?.totalArea ?? 0
  const strips = steps.filter((s) => s.kind === "update")
  const progress = steps.length > 1 ? stepIndex / (steps.length - 1) : 0

  return (
    <div className="pt-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* 左：几何图 */}
        <section className="flex flex-col overflow-hidden rounded-3xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex size-2">
                <span
                  className={cn(
                    "absolute inline-flex size-2 rounded-full bg-primary",
                    !atEnd && "animate-ping opacity-60"
                  )}
                />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              扫描线 x = <span className="font-mono text-foreground">{round(current?.sweepX ?? 0)}</span>
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              第 {Math.min(stepIndex, steps.length - 1)} / {steps.length - 1} 步
            </div>
          </div>
          <div className="flex-1 p-2">
            <GeometryCanvas
              rects={sim.rects}
              step={current}
              maxArea={sim.totalArea}
              selectedRect={selected}
              onSelectRect={setSelected}
            />
          </div>
          {/* 进度条 */}
          <div className="h-1 w-full bg-muted">
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </section>

        {/* 右：控制 + 信息 */}
        <section className="flex flex-col gap-4">
          {/* 播放控制 */}
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
              max={steps.length - 1}
              value={Math.min(stepIndex, steps.length - 1)}
              onChange={(e) => {
                stepper.pause()
                stepper.setStep(Number(e.target.value))
              }}
              className="mt-3 w-full accent-primary"
              aria-label="步骤进度"
            />
          </div>

          {/* 面积统计 */}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="覆盖长度" value={round(current?.coveredLength ?? 0)} suffix="单位" />
            <Stat
              label="本段面积"
              value={round(current?.stripArea ?? 0)}
              suffix={current?.nextX != null ? `${round(current!.nextX - current!.sweepX)} 宽` : "—"}
            />
            <Stat
              label="累计面积"
              value={round(areaSoFar)}
              suffix={`/${sim.totalArea}`}
              highlight
            />
          </div>

          {/* 解说 */}
          <div className="rounded-3xl border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium">
              <span className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-[10px] text-primary">
                {current?.kind === "init" ? "0" : current?.edgesProcessed}
              </span>
              {current?.kind === "init" ? "初始化" : "处理事件"}
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{current?.describe}</p>
            {current && current.eventsAtX.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {current.eventsAtX.map((e) => (
                  <span
                    key={e.order}
                    className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2 py-1 font-mono text-[11px]"
                  >
                    <span className={cn("size-2 rounded-sm", e.delta === 1 ? "bg-emerald-500" : "bg-rose-500")} />
                    {e.delta === 1 ? "in" : "out"} · R{e.rectId + 1} · [{round(e.y1)}, {round(e.y2)}]
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 线段树 */}
      <section className="mt-5 rounded-3xl border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium">线段树 · y 轴覆盖长度</h2>
            <p className="text-[11px] text-muted-foreground">
              叶子为离散化后的 y 区间，每次边事件在树上区间加 / 减 1
            </p>
          </div>
          <Button variant="ghost" size="xs" onPress={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? "收起" : "展开"}
          </Button>
        </div>
        {showAdvanced && <TreeView step={current} />}
      </section>

      {/* 数据面板 */}
      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="rounded-3xl border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium">矩形数据</h2>
          <div className="space-y-1.5">
            {sim.rects.map((r) => (
              <div
                key={r.id}
                onMouseEnter={() => setSelected(r.id)}
                onMouseLeave={() => setSelected(null)}
                className={cn(
                  "group flex items-center gap-2.5 rounded-xl border px-2.5 py-1.5 text-xs transition-colors",
                  selected === r.id ? "bg-muted/60" : "border-transparent"
                )}
              >
                <span className="size-2.5 shrink-0 rounded-sm" style={{ background: rectColor(r.id) }} />
                <span className="w-8 font-mono">R{r.id + 1}</span>
                <span className="flex-1 font-mono text-[11px] text-muted-foreground">
                  ({round(r.x1)}, {round(r.y1)}) → ({round(r.x2)}, {round(r.y2)})
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {round((r.x2 - r.x1) * (r.y2 - r.y1))}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`删除矩形 R${r.id + 1}`}
                  onPress={() => updateRects(rects.filter((x) => x.id !== r.id))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            {sim.rects.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">没有矩形，添加一个吧</p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
            <Button
              variant="outline"
              size="xs"
              onPress={() =>
                updateRects([
                  ...rects,
                  {
                    id: nextId++,
                    x1: Math.round(2 + Math.random() * 5),
                    y1: Math.round(2 + Math.random() * 5),
                    x2: Math.round(6 + Math.random() * 3),
                    y2: Math.round(6 + Math.random() * 3),
                  },
                ])
              }
            >
              <Plus /> 添加矩形
            </Button>
            <Button
              variant="outline"
              size="xs"
              onPress={() => updateRects(randomRects(5 + Math.floor(Math.random() * 3)), "随机")}
            >
              <Shuffle /> 随机
            </Button>
            <Button variant="ghost" size="xs" onPress={() => updateRects(PRESETS[0].rects, PRESETS[0].name)}>
              <RotateCcw /> 重置
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <Button
                key={p.name}
                size="xs"
                variant={presetName === p.name ? "secondary" : "ghost"}
                onPress={() => updateRects(p.rects, p.name)}
              >
                {p.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border bg-card p-4">
            <h2 className="mb-2 text-sm font-medium">事件序列（按 x 排序）</h2>
            <div className="max-h-56 overflow-y-auto rounded-xl border">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr className="text-muted-foreground">
                    <th className="px-2.5 py-1.5 font-normal">#</th>
                    <th className="px-2.5 py-1.5 font-normal">x</th>
                    <th className="px-2.5 py-1.5 font-normal">y1</th>
                    <th className="px-2.5 py-1.5 font-normal">y2</th>
                    <th className="px-2.5 py-1.5 font-normal">Δ</th>
                    <th className="px-2.5 py-1.5 font-normal">矩形</th>
                  </tr>
                </thead>
                <tbody>
                  {sim.events.map((e) => {
                    const done = e.order < (current?.edgesProcessed ?? 0)
                    const active = current?.eventsAtX.some((x) => x.order === e.order)
                    return (
                      <tr
                        key={e.order}
                        className={cn(
                          "border-t transition-colors",
                          active && "bg-primary/10",
                          !done && !active && "text-muted-foreground/70"
                        )}
                      >
                        <td className="px-2.5 py-1">{e.order}</td>
                        <td className="px-2.5 py-1">{round(e.x)}</td>
                        <td className="px-2.5 py-1">{round(e.y1)}</td>
                        <td className="px-2.5 py-1">{round(e.y2)}</td>
                        <td className={cn("px-2.5 py-1", e.delta === 1 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                          {e.delta === 1 ? "+1" : "−1"}
                        </td>
                        <td className="px-2.5 py-1">
                          <span className="inline-flex items-center gap-1">
                            <span className="size-1.5 rounded-sm" style={{ background: rectColor(e.rectId) }} />
                            R{e.rectId + 1}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              y 坐标离散化：<span className="font-mono text-foreground">[{sim.ys.map(round).join(", ")}]</span>
            </p>
          </div>

          <div className="rounded-3xl border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium">条带明细</h2>
              <span className="font-mono text-[11px] text-muted-foreground">
                共 {strips.length} 段 · 面积 {sim.totalArea}
              </span>
            </div>
            <div className="max-h-44 space-y-1 overflow-y-auto">
              {strips.map((s, i) => {
                const width = s.nextX! - s.sweepX
                const isCur = s.index === current?.index
                return (
                  <button
                    key={s.index}
                    onClick={() => {
                      stepper.pause()
                      stepper.setStep(s.index)
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left font-mono text-[11px] transition-colors hover:bg-muted",
                      isCur && "bg-muted"
                    )}
                  >
                    <span className="w-4 text-muted-foreground">{i + 1}</span>
                    <span className="w-24">
                      [{round(s.sweepX)}, {round(s.nextX!)})
                    </span>
                    <span className="flex-1 text-muted-foreground">
                      {round(s.coveredLength)} × {round(width)}
                    </span>
                    <span className="font-medium">= {round(s.stripArea)}</span>
                  </button>
                )
              })}
              {strips.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">暂无条带</p>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs">
              <span className="text-muted-foreground">校验（暴力离散网格）</span>
              <span className={cn("font-mono", Math.abs(sim.bruteArea - sim.totalArea) < 1e-6 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500")}>
                {round(sim.bruteArea)} {Math.abs(sim.bruteArea - sim.totalArea) < 1e-6 ? "✓" : "✗"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 原理说明 */}
      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-medium">算法思路</h2>
          <ol className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
            {[
              "每个矩形拆成两条竖边：左边 delta = +1，右边 delta = −1。",
              "所有 y 坐标离散化，得到 m 段基本区间 [y_i, y_{i+1}]，作为线段树叶子。",
              "事件按 x 排序；相邻事件 x 之间形成一个竖直条带，宽度为 dx。",
              "每个事件在树上做区间加：进入区间 cover += 1，离开 cover −= 1。",
              "维护 len：cover > 0 时 len 就是该节点区间全长，否则等于左右儿子 len 之和。",
              "条带面积 = 根节点 len × dx，累加即为面积并。",
            ].map((t, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[10px] text-foreground">
                  {i + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-3xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-medium">核心更新逻辑</h2>
          <pre className="overflow-x-auto rounded-xl bg-muted/60 p-3 font-mono text-[11.5px] leading-relaxed">
            <code>{`void update(node, l, r, ql, qr, delta):
  if ql <= l and r <= qr:
    cover[node] += delta
  else:
    mid = (l + r) / 2
    if ql <= mid: update(left,  l,   mid, ...)
    if qr >  mid: update(right, mid+1, r, ...)

  if cover[node] > 0:
    len[node] = y[r + 1] - y[l]
  elif l == r:
    len[node] = 0
  else:
    len[node] = len[left] + len[right]`}</code>
          </pre>
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            每个事件 O(log n)，共 2n 个事件，总复杂度
            <span className="mx-1 font-mono text-foreground">O(n log n)</span>
            ，空间
            <span className="mx-1 font-mono text-foreground">O(n)</span>。
          </p>
          {selected !== null && (
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <CornerDownLeft className="size-3.5" /> 已选中 R{selected + 1}，在图中高亮显示
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  suffix,
  highlight,
}: {
  label: string
  value: number
  suffix?: string
  highlight?: boolean
}) {
  return (
    <div className={cn("rounded-2xl border bg-card px-3 py-2", highlight && "border-primary/30 bg-primary/5")}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="truncate font-mono text-lg leading-tight font-semibold tabular-nums">{value}</div>
      {suffix && <div className="truncate font-mono text-[10px] text-muted-foreground">{suffix}</div>}
    </div>
  )
}

function round(v: number) {
  return Math.round(v * 100) / 100
}
