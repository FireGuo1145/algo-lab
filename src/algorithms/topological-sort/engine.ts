/**
 * 拓扑排序 —— Kahn 算法
 *
 * 1. 统计每个点的入度，把入度为 0 的点放入队列；
 * 2. 每次取出队首 u，加入结果序列，再删除 u 的所有出边（v 的入度 −1）；
 * 3. 若 v 入度变成 0 就入队；
 * 4. 结束时若结果长度 < V，说明图中有环。
 */

export type Step = {
  index: number
  removed: number[]
  queue: number[]
  indegree: number[]
  order: number[]
  /** 本次取出 / 删除的边（从 from 出发） */
  current: number | null
  /** 本次递减入度的点 */
  touched: number[]
  describe: string
  codeLines: number[]
  done: boolean
}

export type SimResult = { n: number; edges: [number, number][]; steps: Step[]; order: number[]; hasCycle: boolean }

export const CODE = [
  "int indeg[N]; vector<int> q, order;",
  "for (auto [u, v] : edges) indeg[v]++;",
  "for (int i = 0; i < n; i++)",
  "  if (indeg[i] == 0) q.push_back(i);",
  "",
  "for (int h = 0; h < q.size(); h++) {   // 队列",
  "  int u = q[h];",
  "  order.push_back(u);",
  "  for (int v : adj[u])",
  "    if (--indeg[v] == 0) q.push_back(v);",
  "}",
  "if (order.size() < n) /* 有环 */;",
] as const

export function simulate(n: number, edges: [number, number][]): SimResult {
  const adj: number[][] = Array.from({ length: n }, () => [])
  const indeg = new Array<number>(n).fill(0)
  for (const [u, v] of edges) {
    adj[u].push(v)
    indeg[v]++
  }

  const steps: Step[] = []
  const queue: number[] = []
  const order: number[] = []
  const removed: number[] = []

  const push = (s: Omit<Step, "index" | "indegree" | "removed" | "queue" | "order" | "done"> & { done?: boolean }) =>
    steps.push({
      ...s,
      index: steps.length,
      indegree: [...indeg],
      removed: [...removed],
      queue: [...queue],
      order: [...order],
      done: s.done ?? false,
    })

  for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i)
  push({
    current: null,
    touched: [],
    describe: `统计入度后，入度为 0 的点 ${queue.length ? queue.map((v) => v + 1).join("、") : "（无）"} 可以直接开始，放入队列。`,
    codeLines: [1, 2, 3, 4],
  })

  for (let h = 0; h < queue.length; h++) {
    const u = queue[h]
    if (removed.includes(u)) continue
    removed.push(u)
    order.push(u)
    push({
      current: u,
      touched: [],
      describe: `取出队首 ${u + 1}，加入拓扑序（第 ${order.length} 个），并删除它的 ${adj[u].length} 条出边。`,
      codeLines: [6, 7, 8],
    })
    const touched: number[] = []
    for (const v of adj[u]) {
      indeg[v]--
      touched.push(v)
      if (indeg[v] === 0) queue.push(v)
    }
    push({
      current: u,
      touched,
      describe: touched.length
        ? `删除 ${u + 1} 的出边：${touched.map((v) => `${v + 1}`).join("、")} 的入度分别减 1${touched.some((v) => indeg[v] === 0) ? `，其中 ${touched.filter((v) => indeg[v] === 0).map((v) => v + 1).join("、")} 入度变为 0 入队` : ""}。`
        : `点 ${u + 1} 没有出边，直接继续。`,
      codeLines: [9, 10],
    })
  }

  const hasCycle = order.length < n
  push({
    current: null,
    touched: [],
    describe: hasCycle
      ? `队列已空，但只输出了 ${order.length} / ${n} 个点，说明剩下的点互相依赖，图中存在环。`
      : `全部 ${n} 个点都输出完毕，得到合法拓扑序。`,
    codeLines: hasCycle ? [11] : [5],
    done: true,
  })

  return { n, edges, steps, order, hasCycle }
}

/** 从 0 开始编号的示例图 */
export type Preset = { name: string; n: number; edges: [number, number][] }

export const PRESETS: Preset[] = [
  {
    name: "课程依赖",
    n: 7,
    edges: [
      [0, 2],
      [0, 3],
      [1, 3],
      [1, 4],
      [2, 5],
      [3, 5],
      [4, 6],
      [5, 6],
    ],
  },
  {
    name: "含环",
    n: 5,
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 1],
      [0, 4],
    ],
  },
  {
    name: "链 + 独立点",
    n: 6,
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [4, 5],
    ],
  },
]

/** 简单的分层布局：按最长路径层级排列，环上的点归为一层 */
export function layout(n: number, edges: [number, number][], width = 580, height = 380) {
  const indeg = new Array<number>(n).fill(0)
  const adj: number[][] = Array.from({ length: n }, () => [])
  for (const [u, v] of edges) {
    adj[u].push(v)
    indeg[v]++
  }
  const level = new Array<number>(n).fill(-1)
  const q = indeg.map((d, i) => (d === 0 ? i : -1)).filter((i) => i >= 0)
  q.forEach((i) => (level[i] = 0))
  for (let h = 0; h < q.length; h++) {
    const u = q[h]
    for (const v of adj[u]) {
      level[v] = Math.max(level[v], level[u] + 1)
      if (--indeg[v] === 0) q.push(v)
    }
  }
  // 环上未访问的点放到最大层之后一列
  const maxLevel = Math.max(0, ...level.filter((l) => l >= 0))
  let extra = 0
  for (let i = 0; i < n; i++) if (level[i] < 0) level[i] = maxLevel + 1 + Math.floor(extra++ / 2)

  const groups = new Map<number, number[]>()
  level.forEach((l, i) => {
    if (!groups.has(l)) groups.set(l, [])
    groups.get(l)!.push(i)
  })
  const levels = [...groups.keys()].sort((a, b) => a - b)
  const positions: { x: number; y: number }[] = new Array(n)
  const colW = width / Math.max(1, levels.length)
  levels.forEach((l, li) => {
    const ids = groups.get(l)!
    ids.forEach((id, k) => {
      positions[id] = {
        x: colW * (li + 0.5),
        y: 56 + ((height - 90) / Math.max(1, ids.length)) * (k + 0.5),
      }
    })
  })
  return positions
}
