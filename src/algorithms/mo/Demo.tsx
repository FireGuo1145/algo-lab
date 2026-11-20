import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { CodePanel, DemoControls, SPEEDS, StatBox, StepNarration } from "@/components/demo-shell"
import { useStepKeys, useStepper } from "@/hooks/use-stepper"
import { cn } from "@/lib/utils"
import { CODE, PRESETS, simulate, type Query } from "./engine"

export default function MoDemo() {
  const [a, setA] = useState(PRESETS[0].a)
  const [queries, setQueries] = useState<Query[]>(PRESETS[0].queries)
  const [speed, setSpeed] = useState(1)
  const [arrayText, setArrayText] = useState(a.join(", "))
  const [draftL, setDraftL] = useState(0)
  const [draftR, setDraftR] = useState(4)
  const [error, setError] = useState("")
  const sim = useMemo(() => simulate(a, queries), [a, queries])
  const stepper = useStepper({ count: sim.steps.length, interval: SPEEDS[speed].ms })
  useStepKeys(stepper)
  const current = sim.steps[stepper.step]
  const target = current.queryId === null ? null : queries[current.queryId]
  const update = (next: number[], qs: Query[]) => {
    setA(next); setQueries(qs); setArrayText(next.join(", ")); setError(""); stepper.reset()
  }
  return (
    <div className="space-y-5 pt-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="space-y-5 rounded-3xl border bg-card p-4">
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><h2>当前窗口与目标区间（0-based 闭区间）</h2><span>B = {sim.blockSize}</span></div>
          <div className="flex flex-wrap gap-2" aria-label="数组窗口">
            {a.map((v,i) => (
              <div key={i} className={cn("relative flex w-12 flex-col items-center rounded-xl border p-2 font-mono", i >= current.l && i <= current.r ? "border-sky-500 bg-sky-500/15" : "bg-muted/30", current.changed === i && "ring-2 ring-amber-500")}>
                <span className="text-[10px] text-muted-foreground">{i}</span><strong>{v}</strong>
                <span className="text-[9px] text-muted-foreground">块 {Math.floor(i / sim.blockSize)}</span>
                {target && i >= target.l && i <= target.r && <span className="mt-1 h-1 w-full rounded bg-violet-500" />}
                <span className="text-[10px] text-sky-600 dark:text-sky-400">{i === current.l ? "L" : ""}{i === current.r ? " R" : ""}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">蓝框：当前窗口；紫条：目标区间；金色描边：本次加入或移除。{current.r < current.l && "当前窗口为空。"}</p>
          <div><h2 className="mb-2 text-sm font-medium">频次桶 cnt[value]</h2><div className="flex flex-wrap gap-2">
            {current.counts.map(([v,c]) => <div key={v} className={cn("rounded-xl border px-3 py-2 text-center font-mono text-xs", c > 0 && "border-emerald-500/50 bg-emerald-500/10")}><div className="text-muted-foreground">值 {v}</div><strong>{c}</strong></div>)}
          </div></div>
          <div className="grid grid-cols-3 gap-2"><StatBox label="窗口" value={`[${current.l}, ${current.r}]`} /><StatBox label="不同数字" value={current.distinct} highlight /><StatBox label="移动次数" value={current.moves} /></div>
          <h2 className="text-sm font-medium">莫队处理顺序</h2>
          <div className="space-y-1">{sim.sorted.map((q,order) => <div key={q.id} className={cn("flex flex-wrap justify-between rounded-lg px-2 py-1.5 font-mono text-xs", current.queryId === q.id && "bg-primary/10")}><span>{order+1}. Q{q.id+1} [{q.l}, {q.r}] · 块 {q.block}</span><span>{current.answers[q.id] === null ? "待处理" : `答案 ${current.answers[q.id]}`}</span></div>)}</div>
        </section>
        <section className="space-y-4">
          <DemoControls stepper={stepper} total={sim.steps.length-1} speed={speed} onSpeedChange={setSpeed} playing={stepper.playing && !stepper.atEnd} atEnd={stepper.atEnd} />
          <StepNarration badge={current.queryId === null ? "B" : current.queryId+1} title={current.queryId === null ? "分块排序" : "移动窗口 / 写回答案"} text={current.describe} />
          <CodePanel code={CODE} active={[current.line]} />
        </section>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="space-y-3 rounded-3xl border bg-card p-4">
          <h2 className="text-sm font-medium">编辑数组与查询</h2>
          <label className="block text-xs text-muted-foreground">数组（1～20 个整数，以空格或逗号分隔）<input aria-label="数组数据" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 font-mono text-sm" value={arrayText} onChange={e => setArrayText(e.target.value)} /></label>
          <Button size="xs" onPress={() => {
            const text = arrayText.trim()
            const next = text ? text.split(/[\s,，]+/).map(Number) : []
            if (!next.length || next.length > 20 || next.some(v => !Number.isSafeInteger(v))) { setError("请输入 1～20 个安全整数。"); return }
            update(next, queries.filter(q => q.r < next.length))
          }}>应用数组（移除越界查询）</Button>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs">l <input aria-label="查询左端点" type="number" value={draftL} onChange={e=>setDraftL(Number(e.target.value))} className="w-14 rounded-lg border bg-background p-1" /></label>
            <label className="text-xs">r <input aria-label="查询右端点" type="number" value={draftR} onChange={e=>setDraftR(Number(e.target.value))} className="w-14 rounded-lg border bg-background p-1" /></label>
            <Button size="xs" onPress={() => {
              if (!Number.isInteger(draftL) || !Number.isInteger(draftR) || draftL < 0 || draftR >= a.length || draftL > draftR) { setError(`需要 0 ≤ l ≤ r < ${a.length}。`); return }
              if (queries.length >= 20) { setError("最多 20 个查询。"); return }
              update(a, [...queries, { l: draftL, r: draftR }])
            }}>添加查询</Button>
          </div>
          {error && <p role="alert" className="text-xs text-rose-500">{error}</p>}
          <div className="space-y-1">{queries.map((q,i) => <div key={i} className="flex items-center justify-between gap-2 text-xs"><span>Q{i+1} [{q.l}, {q.r}] = {current.answers[i] ?? "—"}</span><Button variant="ghost" size="xs" aria-label={`删除查询 ${i+1}`} onPress={()=>update(a,queries.filter((_,j)=>j!==i))}>删除</Button></div>)}</div>
          <div className="flex flex-wrap gap-1">{PRESETS.map(p => <Button key={p.name} variant="secondary" size="xs" onPress={()=>update(p.a,p.queries)}>{p.name}</Button>)}<Button variant="ghost" size="xs" onPress={()=>{
            const next = Array.from({length:12},()=>1+Math.floor(Math.random()*5))
            const qs = Array.from({length:5},()=>{const l=Math.floor(Math.random()*12); return {l,r:l+Math.floor(Math.random()*(12-l))}})
            update(next,qs)
          }}>随机</Button></div>
        </section>
        <section className="space-y-3 rounded-3xl border bg-card p-4">
          <h2 className="text-sm font-medium">离线查询：用移动代替重复扫描</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">普通莫队适用于静态数组上的离线区间查询，且答案可以通过加入、移除一个元素快速维护。本例 cnt 从 0 变 1 时不同数字个数加一，从 1 变 0 时减一。</p>
          <p className="text-sm leading-relaxed text-muted-foreground">左端点按长度 B 分块，同一块内按右端点排序。奇偶块交替方向减少 R 往返。总移动量 O(n²/B + mB)，取 B ≈ √n 时为 O((n+m)√n)，排序另需 O(m log m)，每次 add/remove 为 O(1)。</p>
          <p className="text-xs text-muted-foreground">这不是带修改莫队；修改演示数组会重新计算整个过程。莫队不依赖线段树或树状数组，因此不标注为前置依赖。</p>
          <h3 className="text-sm font-medium">最终答案校验（原查询顺序）</h3>
          {queries.length === 0 && <p className="text-xs text-muted-foreground">没有查询，可观察空窗口或添加查询。</p>}
          {queries.map((q,i) => {const brute = new Set(a.slice(q.l,q.r+1)).size; return <p key={i} className="font-mono text-xs">Q{i+1}：莫队 {sim.answers[i]} / 暴力 {brute} {brute === sim.answers[i] ? "✓" : "✗"}</p>})}
        </section>
      </div>
    </div>
  )
}
