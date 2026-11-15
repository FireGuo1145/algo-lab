import { useEffect } from "react"
import { ArrowLeft, ChevronRight, Home } from "lucide-react"
import { Link, useParams } from "react-router"

import { RelatedAlgorithms } from "@/components/related-algorithms"
import { ACCENT_CLASSES, CATEGORIES, getAlgorithm } from "@/lib/algorithms"
import { cn } from "@/lib/utils"
import NotFoundPage from "@/pages/not-found"

export default function AlgoDetailPage() {
  const { slug } = useParams()
  const algo = getAlgorithm(slug)

  useEffect(() => {
    if (!algo) return
    document.title = `${algo.title} · 算法演示 · Algo Lab`
  }, [algo])

  if (!algo) return <NotFoundPage />

  const Demo = algo.demo
  const accent = ACCENT_CLASSES[algo.accent]
  const category = CATEGORIES.find((c) => c.id === algo.category)?.label ?? "算法"

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pt-8 pb-5">
      {/* 面包屑 */}
      <nav className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="面包屑">
        <Link to="/" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
          <Home className="size-3.5" /> 算法列表
        </Link>
        <ChevronRight className="size-3.5 opacity-50" />
        <Link to={`/?category=${algo.category}`} className="transition-colors hover:text-foreground">
          {category}
        </Link>
        <ChevronRight className="size-3.5 opacity-50" />
        <span className="text-foreground">{algo.title.split(" · ")[0]}</span>
      </nav>

      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", accent.chip)}>
                {category}
              </span>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{algo.title}</h1>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", accent.chip)}>
                {algo.complexity}
              </span>
            </div>
            <p className="font-mono text-xs text-muted-foreground">{algo.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {algo.tags.map((t) => (
              <span key={t} className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        </div>

        <RelatedAlgorithms slug={algo.slug} />

        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> 全部算法
        </Link>
      </div>

      <Demo />
    </div>
  )
}
