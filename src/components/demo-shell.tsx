import type { ReactNode } from "react"
import { ChevronLeft, ChevronRight, Pause, Play, SkipBack, SkipForward } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const SPEEDS = [
  { label: "0.5×", ms: 1000 },
  { label: "1×", ms: 600 },
  { label: "2×", ms: 300 },
  { label: "4×", ms: 140 },
] as const

export type Stepper = ReturnType<typeof import("@/hooks/use-stepper").useStepper>

export function DemoControls({
  stepper,
  total,
  speed,
  onSpeedChange,
  playing,
  atEnd,
  extra,
}: {
  stepper: Stepper
  /** 步数减一，即最后一步的下标 */
  total: number
  speed: number
  onSpeedChange: (i: number) => void
  playing: boolean
  atEnd: boolean
  extra?: ReactNode
}) {
  return (
    <div className="rounded-3xl border bg-card p-3">
      <div className="flex items-center justify-center gap-1.5">
        <Button variant="ghost" size="icon" aria-label="回到开始" onPress={stepper.first}>
          <SkipBack />
        </Button>
        <Button variant="outline" size="icon" aria-label="上一步" onPress={stepper.prev}>
          <ChevronLeft />
        </Button>
        <Button size="lg" className="min-w-24" onPress={stepper.toggle} aria-label={playing ? "暂停" : "播放"}>
          {playing ? <Pause /> : <Play />}
          {playing ? "暂停" : atEnd ? "重播" : "播放"}
        </Button>
        <Button variant="outline" size="icon" aria-label="下一步" onPress={stepper.next}>
          <ChevronRight />
        </Button>
        <Button variant="ghost" size="icon" aria-label="跳到结尾" onPress={stepper.end}>
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
              onPress={() => onSpeedChange(i)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={total}
        value={Math.min(stepper.step, total)}
        onChange={(e) => {
          stepper.pause()
          stepper.setStep(Number(e.target.value))
        }}
        className="mt-3 w-full accent-primary"
        aria-label="步骤进度"
      />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="font-mono">
          第 {Math.min(stepper.step, total)} / {total} 步
        </span>
        <span className="font-mono">← → 单步 · 空格 播放</span>
      </div>
      {extra}
    </div>
  )
}

export function StepNarration({
  badge,
  title,
  text,
  children,
}: {
  badge: ReactNode
  title: string
  text: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-3xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium">
        <span className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-[10px] text-primary">
          {badge}
        </span>
        {title}
      </div>
      <p className="min-h-10 text-sm leading-relaxed text-foreground/90">{text}</p>
      {children}
    </div>
  )
}

export function CodePanel({
  code,
  active,
  title = "对应代码",
}: {
  code: readonly string[]
  active: readonly number[]
  title?: string
}) {
  return (
    <div className="rounded-3xl border bg-card p-3">
      <h2 className="mb-2 px-1 text-xs font-medium text-muted-foreground">{title}</h2>
      <div className="overflow-x-auto rounded-xl bg-muted/50 p-2">
        <pre className="font-mono text-[11px] leading-[1.55]">
          <code>
            {code.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "whitespace-pre rounded px-1.5 transition-colors",
                  active.includes(i) && "bg-primary/15 text-foreground"
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
  )
}

export function StatBox({
  label,
  value,
  hint,
  highlight,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  highlight?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card px-3 py-2",
        highlight && "border-primary/30 bg-primary/5",
        className
      )}
    >
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="truncate font-mono text-lg leading-tight font-semibold tabular-nums">{value}</div>
      {hint != null && <div className="truncate font-mono text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function PresetBar({
  presets,
  current,
  onPick,
  children,
}: {
  presets: { name: string }[]
  current: string
  onPick: (name: string) => void
  children?: ReactNode
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {presets.map((p) => (
        <Button key={p.name} size="xs" variant={current === p.name ? "secondary" : "ghost"} onPress={() => onPick(p.name)}>
          {p.name}
        </Button>
      ))}
      {children}
    </div>
  )
}
