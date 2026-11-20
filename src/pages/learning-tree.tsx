import { useState } from "react"
import { Link } from "react-router"
import { ArrowUpRight, GitBranch } from "lucide-react"
import { ALGORITHMS, ACCENT_CLASSES, CATEGORIES } from "@/lib/algorithms"
import { cn } from "@/lib/utils"

// 最长依赖路径决定层级。共享前置节点只显示一次，保留所有依赖边。
function buildGraph() {
  const bySlug = new Map(ALGORITHMS.map(a => [a.slug, a]))
  const levels = new Map<string, number>()
  const visiting = new Set<string>()
  const issues = new Set<string>()
  function level(slug: string): number {
    const cached = levels.get(slug)
    if (cached !== undefined) return cached
    if (visiting.has(slug)) { issues.add(`依赖关系存在环：${slug}`); return 0 }
    visiting.add(slug)
    let depth = 0
    for (const dep of bySlug.get(slug)?.deps ?? []) {
      if (!bySlug.has(dep)) { issues.add(`找不到前置算法：${dep}`); continue }
      depth = Math.max(depth, level(dep) + 1)
    }
    visiting.delete(slug)
    levels.set(slug, depth)
    return depth
  }
  for (const a of ALGORITHMS) level(a.slug)
  const groups: string[][] = []
  for (const a of ALGORITHMS) {
    const d = levels.get(a.slug) ?? 0
    ;(groups[d] ??= []).push(a.slug)
  }
  const edges = ALGORITHMS.flatMap(a => [...new Set(a.deps ?? [])].filter(dep => bySlug.has(dep)).map(dep => ({ from: dep, to: a.slug })))
  return { groups, edges, issues: [...issues] }
}
const graph = buildGraph()
const CARD_W = 252, CARD_H = 100, GAP_X = 76, GAP_Y = 22, PAD = 24, HEADER = 62
const width = PAD * 2 + graph.groups.length * CARD_W + (graph.groups.length - 1) * GAP_X
const height = PAD * 2 + HEADER + Math.max(...graph.groups.map(g => g.length)) * (CARD_H + GAP_Y)
const positions = new Map(graph.groups.flatMap((g, col) => g.map((slug, row) => [slug, { x: PAD + col * (CARD_W + GAP_X), y: PAD + HEADER + row * (CARD_H + GAP_Y) }] as const)))

export default function LearningTreePage() {
  const [selected, setSelected] = useState<string | null>(null)
  const related = new Set<string>()
  if (selected) {
    related.add(selected)
    // 高亮当前算法的全部上游和下游，避免把无关分支混入。
    const walk = (slug: string, upstream: boolean, seen: Set<string>) => {
      if (seen.has(slug)) return
      seen.add(slug)
      for (const e of graph.edges) {
        if ((upstream ? e.to : e.from) !== slug) continue
        const next = upstream ? e.from : e.to
        related.add(next); walk(next, upstream, seen)
      }
    }
    walk(selected, true, new Set()); walk(selected, false, new Set())
  }
  const chosen = ALGORITHMS.find(a => a.slug === selected)
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-5 py-8">
      <div className="space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground"><GitBranch className="size-3.5" />按依赖自动生成</span>
        <h1 className="text-3xl font-semibold tracking-tight">算法学习树</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">从左向右学习：连线表示“先了解左侧算法，再学习右侧算法”。没有前置依赖的算法位于起点；共享前置知识只显示一次，多依赖保留全部连线。</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/30 px-4 py-3 text-xs">
        <span className="text-muted-foreground">{ALGORITHMS.length} 个算法 · {graph.edges.length} 条依赖 · {graph.groups.length} 个层级</span>
        <label className="flex items-center gap-2">高亮学习路径
          <select aria-label="高亮学习路径" value={selected ?? ""} onChange={e=>setSelected(e.target.value || null)} className="max-w-52 rounded-lg border bg-background px-2 py-1">
            <option value="">查看全部</option>{ALGORITHMS.map(a=><option key={a.slug} value={a.slug}>{a.title}</option>)}
          </select>
        </label>
      </div>
      {graph.issues.length > 0 && <div role="alert" className="rounded-xl border border-rose-500/30 p-3 text-sm text-rose-500">{graph.issues.join("；")}</div>}
      <section className="overflow-x-auto rounded-3xl border bg-card" aria-label="算法依赖学习图">
        <div className="relative" style={{width, height}}>
          <svg className="pointer-events-none absolute inset-0 h-full w-full text-muted-foreground" width={width} height={height} aria-hidden="true">
            <defs><marker id="learning-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="currentColor" /></marker></defs>
            {graph.edges.map(e=>{
              const p = positions.get(e.from)!, q = positions.get(e.to)!
              const x = p.x + CARD_W, y = p.y + CARD_H / 2, endY = q.y + CARD_H / 2
              const active = selected && related.has(e.from) && related.has(e.to)
              return <path key={`${e.from}-${e.to}`} d={`M${x} ${y} C${x+GAP_X/2} ${y},${q.x-GAP_X/2} ${endY},${q.x-5} ${endY}`} fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} opacity={selected ? active ? 1 : 0.12 : 0.45} markerEnd="url(#learning-arrow)" />
            })}
          </svg>
          {graph.groups.map((g,col)=><div key={col} className="absolute text-xs font-medium text-muted-foreground" style={{left: PAD+col*(CARD_W+GAP_X),top:PAD,width:CARD_W}}><span className="mr-2 rounded-md bg-muted px-2 py-1 font-mono">{col+1}</span>{col===0 ? "学习起点 · 无前置依赖" : `进阶层级 ${col}`}<span className="ml-2 text-[10px]">{g.length} 个</span></div>)}
          {ALGORITHMS.map(a=>{
            const p = positions.get(a.slug)!, accent = ACCENT_CLASSES[a.accent]
            const category = CATEGORIES.find(c=>c.id===a.category)?.label
            return <Link key={a.slug} to={`/algo/${a.slug}`} className={cn("group absolute flex flex-col justify-between rounded-2xl border bg-background p-3 transition-all hover:border-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary", selected && !related.has(a.slug) && "opacity-30", selected === a.slug && "ring-2 ring-primary")} style={{left:p.x,top:p.y,width:CARD_W,height:CARD_H}} aria-label={`学习 ${a.title}`}>
              <div className="flex items-start gap-2"><span className="text-sm font-semibold leading-snug">{a.title}</span><ArrowUpRight className="ml-auto size-4 shrink-0 text-muted-foreground group-hover:text-primary" /></div>
              <div className="flex items-center justify-between gap-2"><span className={cn("rounded-full px-2 py-0.5 text-[10px] ring-1 ring-inset",accent.chip)}>{category}</span><span className="text-[10px] text-muted-foreground">{a.deps?.length ? `${a.deps.length} 项前置知识` : "可直接开始"}</span></div>
            </Link>
          })}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">点击节点进入算法演示；小屏幕可横向滚动查看完整学习树。高亮选择会显示该节点的所有前置知识和后续算法。</p>
      {chosen && <section className="space-y-2 rounded-2xl border bg-card p-4"><h2 className="text-sm font-semibold">{chosen.title}</h2><p className="text-sm leading-relaxed text-muted-foreground">{chosen.description}</p><Link to={`/algo/${chosen.slug}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">开始学习 <ArrowUpRight className="size-4" /></Link></section>}
    </div>
  )
}
