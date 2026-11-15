import type { ComponentType } from "react"

import BITDemo from "@/algorithms/bit/Demo"
import DsuDemo from "@/algorithms/dsu/Demo"
import DsuOnTreeDemo from "@/algorithms/dsu-on-tree/Demo"
import HldDemo from "@/algorithms/hld/Demo"
import LcaDemo from "@/algorithms/lca/Demo"
import MstDemo from "@/algorithms/mst/Demo"
import SegmentTreeDemo from "@/algorithms/segment-tree/Demo"
import StTableDemo from "@/algorithms/st-table/Demo"
import SweepLineDemo from "@/algorithms/sweep-line/Demo"
import TopoSortDemo from "@/algorithms/topological-sort/Demo"

export type Category = "data-structure" | "tree" | "graph" | "geometry"

export type AlgorithmMeta = {
  /** URL 中的标识，路由为 /algo/:slug */
  slug: string
  title: string
  subtitle: string
  description: string
  /** 分类标签 */
  tags: string[]
  category: Category
  /** 时间复杂度展示 */
  complexity: string
  /** 卡片上的主色调（tailwind 类） */
  accent: "sky" | "violet" | "emerald" | "amber" | "rose"
  /**
   * 本算法前置依赖（先学会这些再看本算法）。
   * 反向会自动生成“被 XXX 使用”的关系。
   */
  deps?: string[]
  demo: ComponentType
}

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "data-structure", label: "数据结构" },
  { id: "tree", label: "树" },
  { id: "graph", label: "图论" },
  { id: "geometry", label: "计算几何" },
]

export const ALGORITHMS: AlgorithmMeta[] = [
  {
    slug: "rectangle-union-area",
    title: "扫描线 · 矩形面积并",
    subtitle: "Sweep Line · Area of Union of Rectangles",
    description:
      "把一个矩形拆成左右两条竖直边，用扫描线从左向右推进，借助线段树维护当前被覆盖的 y 长度，逐步累加面积。",
    tags: ["计算几何", "扫描线", "线段树"],
    category: "geometry",
    complexity: "O(n log n)",
    accent: "sky",
    deps: ["segment-tree"],
    demo: SweepLineDemo,
  },
  {
    slug: "segment-tree",
    title: "线段树 · 区间加与区间和",
    subtitle: "Segment Tree · Range Add & Range Sum",
    description:
      "用懒标记（lazy tag）在 O(log n) 内完成区间加与区间求和，逐步展示递归拆分、pushDown 下传和 pull 回溯的全过程。",
    tags: ["数据结构", "线段树", "懒标记"],
    category: "data-structure",
    complexity: "O(log n)",
    accent: "emerald",
    demo: SegmentTreeDemo,
  },
  {
    slug: "st-table",
    title: "ST 表 · 静态区间最值",
    subtitle: "Sparse Table · Range Minimum Query",
    description:
      "倍增预处理 st[i][k] 表示从 i 开始长度为 2^k 的区间最值，查询时用两段互相重叠的区间拼出答案，O(1) 回答 RMQ。",
    tags: ["数据结构", "倍增", "RMQ"],
    category: "data-structure",
    complexity: "预处理 O(n log n) · 查询 O(1)",
    accent: "violet",
    demo: StTableDemo,
  },
  {
    slug: "fenwick-tree",
    title: "树状数组 · 单点修改与区间和",
    subtitle: "Fenwick Tree / BIT · Point Update & Prefix Sum",
    description:
      "利用 lowbit 把下标分成若干层，c[i] 管辖 (i - lowbit(i), i] 这段区间。更新沿 lowbit 向上跳，查询沿 lowbit 向下跳，均为 O(log n)。",
    tags: ["数据结构", "lowbit", "前缀和"],
    category: "data-structure",
    complexity: "O(log n)",
    accent: "rose",
    demo: BITDemo,
  },
  {
    slug: "topological-sort",
    title: "拓扑排序 · Kahn 算法",
    subtitle: "Topological Sort · Kahn's Algorithm",
    description:
      "在入度为 0 的节点中不断取出一个并删除它的出边，得到满足所有依赖关系的线性顺序；若仍有节点剩余则说明有环。",
    tags: ["图论", "BFS", "DAG"],
    category: "graph",
    complexity: "O(V + E)",
    accent: "amber",
    demo: TopoSortDemo,
  },
  {
    slug: "lca",
    title: "最近公共祖先 · 倍增求 LCA",
    subtitle: "Lowest Common Ancestor · Binary Lifting",
    description:
      "先用深搜记下父子关系与深度，再用类似 ST 表的倍增表 up[v][k] 在 O(log n) 内把两个点提到同一深度、一起向上跳，找到最近公共祖先。",
    tags: ["树", "LCA", "倍增"],
    category: "tree",
    complexity: "预处理 O(n log n) · 查询 O(log n)",
    accent: "sky",
    deps: ["st-table"],
    demo: LcaDemo,
  },
  {
    slug: "heavy-light-decomposition",
    title: "重链剖分 · 树链剖分路径查询",
    subtitle: "Heavy-Light Decomposition · Path Query on Trees",
    description:
      "按子树大小选出重儿子，把树剖成若干条重链并给每个点分配 dfs 序，使重链与子树都变成连续区间；路径查询时沿链跳转并区间求和。",
    tags: ["树", "重链剖分", "dfs 序"],
    category: "tree",
    complexity: "预处理 O(n) · 路径 O(log² n)",
    accent: "amber",
    deps: ["lca"],
    demo: HldDemo,
  },
  {
    slug: "dsu-on-tree",
    title: "树上启发式合并 · LCA 计数",
    subtitle: "DSU on Tree / Small-to-Large · Counting LCA Pairs",
    description:
      "对每个节点保留重儿子（size 最大）的答案，轻儿子的信息暴力插入再合并，统计每个点作为 LCA 的点对数量：total(u) = C(size(u), 2) − Σ C(size(son), 2)。",
    tags: ["树", "启发式合并", "dfs 序"],
    category: "tree",
    complexity: "O(n log n)",
    accent: "emerald",
    demo: DsuOnTreeDemo,
  },
  {
    slug: "disjoint-set",
    title: "并查集 · 路径压缩与按秩合并",
    subtitle: "Disjoint Set Union · Path Compression & Union by Rank",
    description:
      "每个集合用一棵树表示，find 时把路径上的节点直接挂到根（路径压缩），merge 时把矮树挂到高树下（按秩合并），均摊复杂度接近 O(α(n))。",
    tags: ["数据结构", "并查集", "连通性"],
    category: "data-structure",
    complexity: "均摊 O(α(n))",
    accent: "violet",
    demo: DsuDemo,
  },
  {
    slug: "mst",
    title: "最小生成树 · Kruskal 算法",
    subtitle: "Minimum Spanning Tree · Kruskal's Algorithm",
    description:
      "把边从小到大排序，用并查集判断两个端点是否已连通：不连通就选入这条边，连通则跳过。选够 V − 1 条边即得到最小生成树。",
    tags: ["图论", "贪心", "并查集"],
    category: "graph",
    complexity: "O(E log E)",
    accent: "rose",
    deps: ["disjoint-set"],
    demo: MstDemo,
  },
]

export function getAlgorithm(slug: string | undefined) {
  return ALGORITHMS.find((a) => a.slug === slug)
}

/** 本算法的前置依赖 */
export function getDependencies(slug: string) {
  return (getAlgorithm(slug)?.deps ?? []).map(getAlgorithm).filter((a): a is AlgorithmMeta => !!a)
}

/** 哪些算法使用了本算法 */
export function getDependents(slug: string) {
  return ALGORITHMS.filter((a) => a.deps?.includes(slug))
}

/** 同分类下的其他算法 */
export function getSiblings(slug: string) {
  const algo = getAlgorithm(slug)
  if (!algo) return []
  return ALGORITHMS.filter((a) => a.category === algo.category && a.slug !== slug)
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
