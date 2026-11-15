/**
 * 最小生成树 —— Kruskal 算法
 *
 * 1. 把所有边按权值从小到大排序；
 * 2. 依次考虑每条边 (u, v, w)：若 u、v 不在同一集合（用并查集判断），就选入；
 * 3. 选够 n − 1 条边为止；若遍历完仍不够，说明图不连通。
 */

export type Edge = { u: number; v: number; w: number }

export type Step = {
  index: number
  /** 已排序边列表中的位置 */
  edgeOrder: number
  edge: Edge | null
  parent: number[]
  /** 已选入的边（在排序后列表中的位置） */
  chosen: number[]
  total: number
  result: "chosen" | "skipped" | "done" | "init"
  describe: string
  codeLines: number[]
  disconnected: boolean
}

export type SimResult = {
  n: number
  edges: Edge[]
  sorted: Edge[]
  steps: Step[]
  chosen: number[]
  total: number
  connected: boolean
}

export const CODE = [
  "struct Edge { int u, v, w; };",
  "sort(edges, [](Edge a, Edge b) { return a.w < b.w; });",
  "",
  "long long kruskal() {",
  "  long long sum = 0; int cnt = 0;",
  "  for (Edge e : edges) {",
  "    if (find(e.u) == find(e.v)) continue;   // 成环，跳过",
  "    unite(e.u, e.v);",
  "    sum += e.w;",
  "    if (++cnt == n - 1) break;              // 已选够 n-1 条",
  "  }",
  "  return cnt == n - 1 ? sum : -1;           // -1 表示不连通",
  "}",
] as const

export function simulate(n: number, edges: Edge[]): SimResult {
  const sorted = [...edges].sort((a, b) => a.w - b.w)
  const parent = Array.from({ length: n }, (_, i) => i)
  const steps: Step[] = []
  const chosen: number[] = []
  let total = 0

  const find = (x: number) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }

  const push = (s: Omit<Step, "index" | "parent" | "chosen" | "total" | "disconnected"> & { disconnected?: boolean }) =>
    steps.push({
      ...s,
      index: steps.length,
      parent: [...parent],
      chosen: [...chosen],
      total,
      disconnected: s.disconnected ?? false,
    })

  push({
    edgeOrder: -1,
    edge: null,
    result: "init",
    describe: `把 ${edges.length} 条边按权值升序排序：${sorted.map((e) => `${e.u + 1}-${e.v + 1}(${e.w})`).join("，")}。`,
    codeLines: [1, 2],
  })

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]
    if (chosen.length === n - 1) break
    const ru = find(e.u)
    const rv = find(e.v)
    if (ru === rv) {
      push({
        edgeOrder: i,
        edge: e,
        result: "skipped",
        describe: `边 ${e.u + 1}–${e.v + 1}（${e.w}）：两端已经在同一集合（根都是 ${ru + 1}），加入会成环，跳过。`,
        codeLines: [6, 7],
      })
    } else {
      parent[rv] = ru
      chosen.push(i)
      total += e.w
      push({
        edgeOrder: i,
        edge: e,
        result: "chosen",
        describe: `边 ${e.u + 1}–${e.v + 1}（${e.w}）：两端属于不同集合（${ru + 1} 与 ${rv + 1}），选入，合并后权值和 = ${total}。`,
        codeLines: [7, 8, 9, 10],
      })
    }
  }

  const connected = chosen.length === n - 1
  push({
    edgeOrder: -1,
    edge: null,
    result: "done",
    describe: connected
      ? `已选 ${chosen.length} = n − 1 条边，最小生成树总权值 = ${total}。`
      : `只选出了 ${chosen.length} 条边（需要 n − 1 = ${n - 1} 条），图不连通，不存在生成树。`,
    codeLines: connected ? [10, 12] : [12],
    disconnected: !connected,
  })

  return { n, edges, sorted, steps, chosen, total, connected }
}

export type Preset = { name: string; n: number; edges: Edge[]; pos: [number, number][] }

export const PRESETS: Preset[] = [
  {
    name: "六点样例",
    n: 6,
    pos: [
      [80, 80],
      [300, 50],
      [520, 100],
      [110, 280],
      [320, 220],
      [500, 300],
    ],
    edges: [
      { u: 0, v: 1, w: 4 },
      { u: 0, v: 3, w: 5 },
      { u: 1, v: 2, w: 2 },
      { u: 1, v: 4, w: 6 },
      { u: 2, v: 5, w: 3 },
      { u: 3, v: 4, w: 7 },
      { u: 4, v: 5, w: 1 },
      { u: 1, v: 3, w: 9 },
    ],
  },
  {
    name: "正方形 + 对角线",
    n: 4,
    pos: [
      [140, 80],
      [460, 80],
      [140, 320],
      [460, 320],
    ],
    edges: [
      { u: 0, v: 1, w: 2 },
      { u: 0, v: 2, w: 5 },
      { u: 1, v: 3, w: 1 },
      { u: 2, v: 3, w: 3 },
      { u: 0, v: 3, w: 8 },
      { u: 1, v: 2, w: 4 },
    ],
  },
  {
    name: "不连通图",
    n: 5,
    pos: [
      [90, 90],
      [250, 70],
      [180, 260],
      [400, 110],
      [470, 280],
    ],
    edges: [
      { u: 0, v: 1, w: 1 },
      { u: 1, v: 2, w: 2 },
      { u: 0, v: 2, w: 3 },
      { u: 3, v: 4, w: 4 },
    ],
  },
]
