import { Link } from "react-router"
import { ArrowLeft, ArrowRight, CornerUpLeft } from "lucide-react"

import { ACCENT_CLASSES, getDependencies, getDependents, type AlgorithmMeta } from "@/lib/algorithms"
import { cn } from "@/lib/utils"

function AlgoChip({
  algo,
  kind,
}: {
  algo: AlgorithmMeta
  kind: "dependency" | "dependent"
}) {
  const accent = ACCENT_CLASSES[algo.accent]
  return (
    <Link
      to={`/algo/${algo.slug}`}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[11.5px] transition-all hover:-translate-y-px hover:border-foreground/25 hover:shadow-sm",
        kind === "dependency" && "border-dashed"
      )}
    >
      <ArrowLeft className={cn("size-3 text-muted-foreground", kind === "dependent" && "hidden")} />
      <ArrowRight className={cn("hidden size-3 text-muted-foreground", kind === "dependent" && "inline")} />
      <span className={cn("size-1.5 rounded-full", accent.text.replace("text-", "bg-"))} />
      <span className="text-foreground">{algo.title}</span>
      <span className="text-muted-foreground/70">{algo.complexity.split(" · ").pop()}</span>
    </Link>
  )
}

/** 页面顶部的“依赖 / 被依赖”快速跳转条 */
export function RelatedAlgorithms({ slug }: { slug: string }) {
  const deps = getDependencies(slug)
  const dependents = getDependents(slug)
  if (deps.length === 0 && dependents.length === 0) return null

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-muted/30 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
      {deps.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <CornerUpLeft className="size-3" /> 前置知识
          </span>
          {deps.map((a) => (
            <AlgoChip key={a.slug} algo={a} kind="dependency" />
          ))}
        </div>
      )}
      {dependents.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">被这些算法使用</span>
          {dependents.map((a) => (
            <AlgoChip key={a.slug} algo={a} kind="dependent" />
          ))}
        </div>
      )}
    </div>
  )
}

/** 卡片 / 列表里的紧凑提示（首页用） */
export function RelatedHint({ algo }: { algo: AlgorithmMeta }) {
  const deps = getDependencies(algo.slug)
  const dependents = getDependents(algo.slug)
  if (deps.length === 0 && dependents.length === 0) return null
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground/80">
      {deps.length > 0 && <>依赖 {deps.map((d) => d.title.split(" · ")[0]).join("、")}</>}
      {deps.length > 0 && dependents.length > 0 && <span>·</span>}
      {dependents.length > 0 && <>被 {dependents.length} 个算法使用</>}
    </span>
  )
}
