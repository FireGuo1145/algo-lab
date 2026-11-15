import type { ComponentType } from "react"

import SegmentTreeDemo from "@/algorithms/segment-tree/Demo"
import SweepLineDemo from "@/algorithms/sweep-line/Demo"

export type AlgorithmMeta = {
  /** URL 中的标识，路由为 /algo/:slug */
  slug: string
  title: string
  subtitle: string
  description: string
  /** 分类标签 */
  tags: string[]
  /** 时间复杂度展示 */
  complexity: string
  /** 卡片上的主色调（tailwind 类） */
  accent: "sky" | "violet" | "emerald" | "amber" | "rose"
  demo: ComponentType
}

export const ALGORITHMS: AlgorithmMeta[] = [
  {
    slug: "rectangle-union-area",
    title: "扫描线 · 矩形面积并",
    subtitle: "Sweep Line · Area of Union of Rectangles",
    description:
      "把一个矩形拆成左右两条竖直边，用扫描线从左向右推进，借助线段树维护当前被覆盖的 y 长度，逐步累加面积。",
    tags: ["计算几何", "扫描线", "线段树"],
    complexity: "O(n log n)",
    accent: "sky",
    demo: SweepLineDemo,
  },
  {
    slug: "segment-tree",
    title: "线段树 · 区间加与区间和",
    subtitle: "Segment Tree · Range Add & Range Sum",
    description:
      "用懒标记（lazy tag）在 O(log n) 内完成区间加与区间求和，逐步展示递归拆分、pushDown 下传和 pull 回溯的全过程。",
    tags: ["数据结构", "线段树", "懒标记"],
    complexity: "O(log n)",
    accent: "emerald",
    demo: SegmentTreeDemo,
  },
]

export function getAlgorithm(slug: string | undefined) {
  return ALGORITHMS.find((a) => a.slug === slug)
}

export const ACCENT_CLASSES: Record<
  AlgorithmMeta["accent"],
  { chip: string; glow: string; text: string }
> = {
  sky: {
    chip: "bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400",
    glow: "from-sky-400/25 via-sky-400/5 to-transparent",
    text: "text-sky-500",
  },
  violet: {
    chip: "bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400",
    glow: "from-violet-400/25 via-violet-400/5 to-transparent",
    text: "text-violet-500",
  },
  emerald: {
    chip: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400",
    glow: "from-emerald-400/25 via-emerald-400/5 to-transparent",
    text: "text-emerald-500",
  },
  amber: {
    chip: "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400",
    glow: "from-amber-400/25 via-amber-400/5 to-transparent",
    text: "text-amber-500",
  },
  rose: {
    chip: "bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400",
    glow: "from-rose-400/25 via-rose-400/5 to-transparent",
    text: "text-rose-500",
  },
}
