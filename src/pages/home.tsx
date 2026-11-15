import { useMemo, useState } from "react"
import { Link, useLocation, useSearchParams } from "react-router"
import { ArrowUpRight, Sparkles, Timer, Waypoints } from "lucide-react"

import { ACCENT_CLASSES, ALGORITHMS, CATEGORIES, getDependencies, getDependents, type Category } from "@/lib/algorithms"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const [params, setParams] = useSearchParams()
  // 依赖 location.key，保证每次切换筛选都重新计算（setParams 自身状态有时不触发重渲染）
  const { key: navKey } = useLocation()
  const raw = params.get("category")
  const active = CATEGORIES.some((c) => c.id === raw) ? (raw as Category) : null
  const list = useMemo(
    () => (active ? ALGORITHMS.filter((a) => a.category === active) : ALGORITHMS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, navKey, params]
  )
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)) ||
        a.description.toLowerCase().includes(q)
    )
  }, [list, query])

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      {/* Hero */}
      <section className="relative mb-12">
        <div className="pointer-events-none absolute -top-16 -left-16 -z-10 size-64 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -top-8 right-0 -z-10 size-56 rounded-full bg-violet-400/15 blur-3xl" />
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          <Sparkles className="size-3" /> 交互式算法可视化
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          看见算法的<span className="bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent">每一步</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          把抽象的数据结构、几何过程拆解成可播放的动画。拖动进度、单步执行、观察状态变化，
          比只看代码更快建立直觉。
        </p>
        <div className="mt-6 flex flex-wrap gap-5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Waypoints className="size-3.5" /> 当前收录 {ALGORITHMS.length} 个算法
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Timer className="size-3.5" /> 支持逐帧回放与速度调节
          </span>
        </div>
      </section>

      {/* 筛选 */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            算法列表 <span className="font-mono text-sm font-normal text-muted-foreground">({filtered.length})</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索名称 / 标签…"
              className="h-8 w-40 rounded-xl border bg-card px-2.5 text-xs placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none sm:w-52"
              aria-label="搜索算法"
            />
            <div className="flex flex-wrap items-center gap-0.5 rounded-xl border bg-muted/40 p-0.5">
              <button
                onClick={() => setParams({})}
                className={cn(
                  "rounded-lg px-2 py-1 text-xs transition-colors",
                  !active ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                全部
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setParams({ category: c.id })}
                  className={cn(
                    "rounded-lg px-2 py-1 text-xs transition-colors",
                    active === c.id ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((algo) => {
            const accent = ACCENT_CLASSES[algo.accent]
            const deps = getDependencies(algo.slug)
            const dependents = getDependents(algo.slug)
            return (
              <Link
                key={algo.slug}
                to={`/algo/${algo.slug}`}
                className="group relative overflow-hidden rounded-3xl border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg"
              >
                <div
                  className={cn(
                    "pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-gradient-to-br opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100",
                    accent.glow
                  )}
                />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <h3 className="text-base font-semibold tracking-tight">{algo.title}</h3>
                      <p className="font-mono text-[11px] text-muted-foreground">{algo.subtitle}</p>
                    </div>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background/60 transition-transform duration-300 group-hover:rotate-45">
                      <ArrowUpRight className="size-4" />
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                    {algo.description}
                  </p>
                  {(deps.length > 0 || dependents.length > 0) && (
                    <div className="mt-3 flex flex-wrap items-center gap-1 text-[10.5px] text-muted-foreground/80">
                      {deps.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5">
                          依赖 {deps.map((d) => d.title.split(" · ")[0]).join("、")}
                        </span>
                      )}
                      {dependents.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5">
                          被 {dependents.length} 个算法使用
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                    <span className={cn("rounded-full px-2 py-0.5 font-mono text-[11px] ring-1 ring-inset", accent.chip)}>
                      {algo.complexity}
                    </span>
                    {algo.tags.map((t) => (
                      <span key={t} className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            )
          })}

          {filtered.length === 0 && (
            <div className="flex min-h-40 items-center justify-center rounded-3xl border border-dashed p-5 text-sm text-muted-foreground sm:col-span-2">
              没有匹配的算法
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
