import { useMemo, useState } from "react"
import { Plus, RotateCcw, Shuffle, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CodePanel, DemoControls, PresetBar, SPEEDS, StatBox, StepNarration } from "@/components/demo-shell"
import { GraphCanvas, treeLayout } from "@/components/graph-canvas"
import { useStepKeys, useStepper } from "@/hooks/use-stepper"
import { cn } from "@/lib/utils"

import { CODE, PRESETS, childrenOf, simulate } from "./engine"

export default function DsuOnTreeDemo() {
  const [parent, setParent] = useState<number[]>(PRESETS[0].parent)
  const [presetName, setPresetName] = useState(PRESETS[0].name)
  const [speed, setSpeed] = useState(1)

  const n = parent.length
  const sim = useMemo(() => simulate(parent), [parent])
  const steps = sim.steps
  const stepper = useStepper({ count: steps.length, interval: SPEEDS[speed].ms })
  const { step, atEnd, playing } = stepper
  useStepKeys(stepper)
  const current = steps[Math.min(step, steps.length - 1)] ?? null

  const children = useMemo(() => childrenOf(parent), [parent])
  const { nodes, height } = useMemo(() => treeLayout(children, 0, 600, { top: 48, rowH: 72 }), [children])
  const edges = useMemo(
    () =>
      parent.flatMap((p, v) =>
        p >= 0 && v !== 0
          ? [{ id: `e${v}`, u: p, v, tone: sim.heavy[p] === v ? ("chosen" as const) : undefined }]
          : []
      ),
    [parent, sim.heavy]
  )

  const bucket = new Set(current?.bucket ?? [])
  const highlight = new Set(current?.highlight ?? [])
  const done = new Set(current?.done ?? [])
  const cur = current?.node ?? -1

  return (
    <div className="pt-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="flex flex-col overflow-hidden rounded-3xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs">
            <span className="flex items-center gap-3 text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-0.5 w-4 bg-emerald-500" />重边
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block size-2 rounded-full bg-primary" />桶内节点
              </span>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              n = {n} · 桶大小 {bucket.size}
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
                const inBucket = bucket.has(id)
                const isCur = id === cur
                const isHi = highlight.has(id)
                return (
                  <>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={18}
                      className={cn(
                        "transition-[fill,stroke] duration-300",
                        isCur
                          ? "fill-primary/30 stroke-primary"
                          : isHi
                            ? "fill-amber-500/25 stroke-amber-500"
                            : inBucket
                              ? "fill-emerald-500/15 stroke-emerald-500/70"
                              : "fill-card stroke-border"
                      )}
                      strokeWidth={isCur ? 2.4 : 1.4}
                    />
                    <text x={node.x} y={node.y + 4} textAnchor="middle" className="fill-current font-mono text-[12px] font-semibold">
                      {id + 1}
                    </text>
                    {done.has(id) && (
                      <g>
                        <rect x={node.x - 13} y={node.y + 20} width={26} height={15} rx={7} className="fill-emerald-500" />
                        <text x={node.x} y={node.y + 31} textAnchor="middle" className="fill-white font-mono text-[9px]">
                          {current?.pairs[id]}
                        </text>
                      </g>
                    )}
                  </>
                )
              }}
              renderLabel={(node) =>
                !done.has(node.id) ? (
                  <text x={node.x} y={node.y + 31} textAnchor="middle" className="fill-current font-mono text-[9px] opacity-50">
                    sz {sim.size[node.id]}
                  </text>
                ) : null
              }
            />
          </div>
          <div className="border-t px-4 py-2">
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              <span className="text-muted-foreground">桶</span>
              {(current?.bucket ?? []).length === 0 && <span className="text-muted-foreground/60">空</span>}
              {(current?.bucket ?? []).map((v, i) => (
                <span key={`${v}-${i}`} className="rounded-md bg-emerald-500/10 px-1.5 py-0.5">
                  {v + 1}
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
            <StatBox label="当前节点" value={cur >= 0 ? cur + 1 : "—"} hint={cur >= 0 ? `size ${sim.size[cur]} · 重儿子 ${sim.heavy[cur] >= 0 ? sim.heavy[cur] + 1 : "无"}` : ""} />
            <StatBox
              label="已完成节点"
              value={`${done.size}/${n}`}
              hint="节点下方绿标为作为 LCA 的点对数"
              highlight
            />
          </div>
          <StepNarration
            badge={cur >= 0 ? cur + 1 : 0}
            title={actionTitle(current?.action)}
            text={current?.describe ?? "调整树结构后重新播放。"}
          />
          <CodePanel code={CODE} active={current?.codeLines ?? []} />
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="rounded-3xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">父节点</h2>
            <span className="text-[11px] text-muted-foreground">1 号为根</span>
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
                    setParent(parent.map((x, j) => (j === v ? np : x)))
                    setPresetName("")
                    stepper.reset()
                  }}
                  className="w-14 rounded-lg border bg-background px-1.5 py-1 text-center font-mono text-sm focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none disabled:opacity-50"
                  aria-label={`点 ${v + 1} 的父节点`}
                />
                <span className="font-mono text-[10px] text-muted-foreground">{v + 1}</span>
              </div>
            ))}
            <Button
              variant="outline"
              size="icon-xs"
              className="mb-3.5"
              aria-label="添加节点"
              isDisabled={n >= 12}
              onPress={() => {
                setParent([...parent, 0])
                setPresetName("")
                stepper.reset()
              }}
            >
              <Plus />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="mb-3.5"
              aria-label="删除最后一个节点"
              isDisabled={n <= 2}
              onPress={() => {
                setParent(parent.slice(0, -1).map((p) => Math.min(p, n - 2)))
                setPresetName("")
                stepper.reset()
              }}
            >
              <Trash2 />
            </Button>
          </div>
          <PresetBar
            presets={PRESETS}
            current={presetName}
            onPick={(name) => {
              const p = PRESETS.find((x) => x.name === name)!
              setParent(p.parent)
              setPresetName(p.name)
              stepper.reset()
            }}
          >
            <Button
              variant="ghost"
              size="xs"
              onPress={() => {
                const size = 5 + Math.floor(Math.random() * 6)
                const np = [-1]
                for (let v = 1; v < size; v++) np.push(Math.floor(Math.random() * v))
                setParent(np)
                setPresetName("随机")
                stepper.reset()
              }}
            >
              <Shuffle /> 随机
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onPress={() => {
                setParent(PRESETS[0].parent)
                setPresetName(PRESETS[0].name)
                stepper.reset()
              }}
            >
              <RotateCcw /> 重置
            </Button>
          </PresetBar>

          <div className="mt-4 border-t pt-3">
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">每个点作为 LCA 的点对数</h3>
            <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px] sm:grid-cols-4">
              {sim.pairs.map((p, i) => (
                <div key={i} className="flex justify-between rounded-md border px-1.5 py-0.5">
                  <span className="text-muted-foreground">{i + 1}</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-medium">为什么轻儿子要被“清空”？</h2>
          <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
            <li>
              对父节点统计时，需要桶里恰好是“整个子树”的点。所以每处理完一个轻儿子，它的数据就必须撤掉，
              否则兄弟子树之间会互相污染。
            </li>
            <li>
              重儿子最后处理并保留，是因为它接下来会被父节点直接继承，不用重复插入。
            </li>
            <li>
              每个点只有在祖先链上是“轻儿子”时才会被暴力插入一次，而每经过一条轻边，所在子树大小至少减半，
              所以每个点最多被插入 O(log n) 次，总复杂度 O(n log n)。
            </li>
            <li>
              本例的答案可以直接由 size 推出：total(u) = C(size,2) − Σ C(size(son),2)，
              正好对应“经过 u 的点对”。
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function actionTitle(action: string | undefined) {
  switch (action) {
    case "enter":
      return "递归进入"
    case "keep-heavy":
      return "保留重儿子"
    case "add-light":
      return "暴力加入轻儿子"
    case "add-self":
      return "加入自身"
    case "clear":
      return "清空桶"
    case "answer":
      return "统计答案"
    case "exit":
      return "完成"
    default:
      return "准备"
  }
}
