/**
 * 重链剖分 / 树链剖分（Heavy-Light Decomposition）
 *
 * 两遍 dfs：
 *   1. dfs1(u)：求子树大小 size、重儿子 heavy（size 最大的儿子），顺带求深度；
 *   2. dfs2(u, top)：先走重儿子（同一条重链），再走轻儿子（开新链），
 *      按访问顺序给每个点分配 dfn（dfs 序），并记录所在链的链头 top。
 * 关键性质：子树、重链在 dfs 序上都是连续区间，于是树上操作可以转成序列区间操作
 * （配合线段树 / 树状数组，见「对应算法」）。
 *
 * 路径查询：u、v 往上跳，每次让链头更深的那个点跳到「链头的父亲」，
 * 同时把 [dfn[top[u]], dfn[u]] 这段区间计入答案；直到两点在同一条链上，
 * 此时区间为 [dfn[浅者], dfn[深者]]。跳链次数 O(log n)。
 */

export type Edge = { u: number; v: number; w: number }

export type Step = {
  index: number
  phase: "build" | "query"
  /** 当前正在处理的节点 */
  node: number
  size: number[]
  heavy: number[]
  depth: number[]
  dfn: number[]
  /** dfn → 节点编号 */
  inv: number[]
  top: number[]
  /** 有值的字段（用于前端高亮“刚计算出来的东西”） */
  fresh: (keyof Step)[] | string[]
  /** 当前查询中的两点 */
  query: [number, number] | null
  /** 本次涉及的节点（高亮） */
  highlight: number[]
  /** 已经计入答案的区间（dfn 区间，闭区间） */
  segments: [number, number][]
  /** 已累积的答案 */
  acc: number
  result: number | null
  describe: string
  codeLines: number[]
}

export type SimResult = {
  n: number
  edges: Edge[]
  adjacency: number[][]
  steps: Step[]
  results: number[]
  values: number[]
  fa: number[]
  /** 最终（全部完成时）的剖分结果，供侧栏展示 */
  dfn: number[]
  top: number[]
  depth: number[]
  size: number[]
  heavy: number[]
}

export const CODE = [
  "int sz[N], heavy[N], dep[N], fa[N];",
  "int top[N], dfn[N], inv[N], timer = 0;",
  "",
  "void dfs1(int u, int f) {                 // 1. 求 size / heavy",
  "  fa[u] = f; dep[u] = dep[f] + 1; sz[u] = 1;",
  "  for (int v : g[u]) if (v != f) {",
  "    dfs1(v, u); sz[u] += sz[v];",
  "    if (sz[v] > sz[heavy[u]]) heavy[u] = v;",
  "  }",
  "}",
  "",
  "void dfs2(int u, int t) {                 // 2. 分配 dfn 与链头",
  "  top[u] = t; dfn[u] = ++timer; inv[timer] = u;",
  "  if (heavy[u]) dfs2(heavy[u], t);        // 重儿子：同一条链",
  "  for (int v : g[u]) if (v != fa[u] && v != heavy[u])",
  "    dfs2(v, v);                           // 轻儿子：新开一条链",
  "}",
  "",
  "int queryPath(int u, int v) {             // 3. 沿链跳",
  "  int res = 0;",
  "  while (top[u] != top[v]) {",
  "    if (dep[top[u]] < dep[top[v]]) swap(u, v);",
  "    res += seg.query(dfn[top[u]], dfn[u]);  // 整段重链",
  "    u = fa[top[u]];",
  "  }",
  "  if (dep[u] > dep[v]) swap(u, v);",
  "  res += seg.query(dfn[u], dfn[v]);        // 同链的剩余部分",
  "  return res;",
  "}",
] as const

export function buildAdjacency(n: number, edges: Edge[]) {
  const g: { to: number; w: number }[][] = Array.from({ length: n }, () => [])
  for (const e of edges) {
    g[e.u].push({ to: e.v, w: e.w })
    g[e.v].push({ to: e.u, w: e.w })
  }
  return g
}

export function simulate(
  n: number,
  edges: Edge[],
  queries: [number, number][],
  weight?: number[]
): SimResult {
  // 点值：未指定时用 1..n，路径和 = 沿途点权和
  const value = weight ?? Array.from({ length: n }, (_, i) => i + 1)
  const g = buildAdjacency(n, edges)
  // 用标准化顺序排序邻接表，保证演示结果稳定（先小儿子）
  const adjacency = g.map((list) => list.map((e) => e.to).sort((a, b) => a - b))

  const size = new Array<number>(n).fill(0)
  const heavy = new Array<number>(n).fill(-1)
  const depth = new Array<number>(n).fill(0)
  const fa = new Array<number>(n).fill(-1)
  const dfn = new Array<number>(n).fill(0)
  const inv = new Array<number>(n).fill(-1)
  const top = new Array<number>(n).fill(-1)
  const steps: Step[] = []

  const push = (s: Omit<Step, "index" | "size" | "heavy" | "depth" | "dfn" | "inv" | "top">) =>
    steps.push({
      ...s,
      index: steps.length,
      size: [...size],
      heavy: [...heavy],
      depth: [...depth],
      dfn: [...dfn],
      inv: [...inv],
      top: [...top],
    })

  const base = {
    phase: "build" as const,
    node: -1,
    fresh: [] as string[],
    query: null as [number, number] | null,
    highlight: [] as number[],
    segments: [] as [number, number][],
    acc: 0,
    result: null as number | null,
  }

  push({ ...base, describe: `以 1 号点为根。第一遍 dfs1：自底向上求 size 与重儿子，同时记录深度与父亲。`, codeLines: [4, 5] })

  // ---- dfs1：迭代后序 ----
  const order: number[] = []
  const stack: [number, number, boolean][] = [[0, -1, false]]
  while (stack.length) {
    const [u, f, visited] = stack.pop()!
    if (!visited) {
      fa[u] = f
      size[u] = 1
      stack.push([u, f, true])
      for (const v of [...adjacency[u]].reverse()) if (v !== f) stack.push([v, u, false])
    } else {
      order.push(u)
      for (const v of adjacency[u]) {
        if (v === f) continue
        size[u] += size[v]
        if (heavy[u] < 0 || size[v] > size[heavy[u]]) heavy[u] = v
      }
      push({
        ...base,
        node: u,
        fresh: ["size", "heavy"],
        highlight: adjacency[u].filter((v) => v !== f).concat(u),
        describe: `dfs1 回溯到 ${u + 1}：size = 1 + Σsize(儿子) = ${size[u]}，重儿子 = ${heavy[u] >= 0 ? `${heavy[u] + 1}（size ${size[heavy[u]]}）` : "无"}，dep = ${depth[u]}，fa = ${f >= 0 ? f + 1 : "无"}。`,
        codeLines: [5, 6, 7, 8],
      })
    }
  }
  // 深度在前面记录里没有算：重新按 BFS 顺序赋值，保证显示正确
  depth[0] = 0
  const bfs = [0]
  for (let h = 0; h < bfs.length; h++) {
    const u = bfs[h]
    for (const v of adjacency[u]) {
      if (v === fa[u]) continue
      depth[v] = depth[u] + 1
      bfs.push(v)
    }
  }

  push({
    ...base,
    describe: `dfs1 完成：重儿子已确定（图中绿色粗边为重边）。一条重链由「重儿子」串联而成。`,
    codeLines: [4, 8],
  })

  // ---- dfs2：先重儿子后轻儿子，preorder 分配 dfn ----
  let timer = 0
  // 用显式栈模拟递归，保持「先重儿子、再轻儿子」
  const dfs2Stack: [number, number][] = [[0, 0]]
  while (dfs2Stack.length) {
    const [u, t] = dfs2Stack.pop()!
    top[u] = t
    dfn[u] = ++timer
    inv[timer] = u
    push({
      ...base,
      node: u,
      fresh: ["dfn", "top"],
      highlight: [u],
      describe: `dfs2 访问 ${u + 1}：top = ${t + 1}，dfn = ${timer}${t === u ? "（轻儿子开新链）" : "（沿重链继续）"}。`,
      codeLines: [12, 13, 14, 15],
    })
    // 先压轻儿子，再压重儿子 → 重儿子先出栈
    for (const v of [...adjacency[u]].reverse()) {
      if (v === fa[u] || v === heavy[u]) continue
      dfs2Stack.push([v, v])
    }
    if (heavy[u] >= 0) dfs2Stack.push([heavy[u], t])
  }

  push({
    ...base,
    describe: `dfs2 完成：每个子树对应一段连续 dfn 区间，每条重链也是一段连续区间——这就是「树转序列」的关键。`,
    codeLines: [12, 19],
  })

  // 节点 u 的值直接取 value[u]（本例默认等于编号）
  const val = new Array<number>(n).fill(0)
  for (let u = 0; u < n; u++) val[u] = value[u]

  const valByDfn = new Array<number>(n + 1).fill(0)
  for (let u = 0; u < n; u++) valByDfn[dfn[u]] = val[u]

  const results: number[] = []
  for (const [qu, qv] of queries) {
    let u = qu
    let v = qv
    const segments: [number, number][] = []
    let acc = 0
    const pathNodes: number[] = []
    push({
      ...base,
      phase: "query",
      query: [qu, qv],
      node: qu,
      highlight: [qu, qv],
      describe: `查询 ${qu + 1} 到 ${qv + 1} 路径上的点权和：top[${qu + 1}] = ${top[qu] + 1}，top[${qv + 1}] = ${top[qv] + 1}。`,
      codeLines: [18, 19],
    })
    let guard = 0
    while (top[u] !== top[v] && guard++ < 2 * n) {
      if (depth[top[u]] < depth[top[v]]) [u, v] = [v, u]
      const l = dfn[top[u]]
      const r = dfn[u]
      let sum = 0
      for (let d = l; d <= r; d++) {
        sum += valByDfn[d]
        pathNodes.push(inv[d])
      }
      segments.push([l, r])
      acc += sum
      push({
        ...base,
        phase: "query",
        query: [qu, qv],
        node: u,
        highlight: Array.from({ length: r - l + 1 }, (_, k) => inv[l + k]),
        segments: [...segments],
        acc,
        describe: `u = ${u + 1} 的链头 ${top[u] + 1} 更深：把重链上 ${top[u] + 1}…${u + 1} 这一段计入答案，dfn 区间 [${l}, ${r}]，本段和 ${sum}，累计 ${acc}。u 再跳到链头父亲 ${fa[top[u]] >= 0 ? fa[top[u]] + 1 : "（无，链头已是根）"}。`,
        codeLines: [19, 20, 21, 22],
      })
      u = fa[top[u]]
      if (u < 0) break
    }
    if (u >= 0 && v >= 0) {
      if (depth[u] > depth[v]) [u, v] = [v, u]
      const l = dfn[u]
      const r = dfn[v]
      let sum = 0
      for (let d = l; d <= r; d++) {
        sum += valByDfn[d]
        pathNodes.push(inv[d])
      }
      segments.push([l, r])
      acc += sum
      push({
        ...base,
        phase: "query",
        query: [qu, qv],
        node: u,
        highlight: Array.from({ length: r - l + 1 }, (_, k) => inv[l + k]),
        segments: [...segments],
        acc,
        result: acc,
        describe: `两点已在同一条链上（top = ${top[u] + 1}）：剩下 ${u + 1} 到 ${v + 1}，dfn 区间 [${l}, ${r}] 和为 ${sum}，路径答案 = ${acc}。`,
        codeLines: [24, 25, 26],
      })
    }
    results.push(acc)
  }

  return { n, edges, adjacency, steps, results, values: value, fa, dfn, top, depth, size, heavy }
}

/** 朴素：逐点求路径上的点权和（用于校验） */
export function brutePath(n: number, edges: Edge[], u: number, v: number, weight?: number[]): number {
  const value = weight ?? Array.from({ length: n }, (_, i) => i + 1)
  const adj: { to: number; w: number }[][] = Array.from({ length: n }, () => [])
  for (const e of edges) {
    adj[e.u].push({ to: e.v, w: e.w })
    adj[e.v].push({ to: e.u, w: e.w })
  }
  // 从 u 出发 BFS 找到 v，返回路径边权和
  const prev = new Array<number>(n).fill(-1)
  const seen = new Array<boolean>(n).fill(false)
  seen[u] = true
  const q = [u]
  for (let h = 0; h < q.length; h++) {
    const x = q[h]
    if (x === v) break
    for (const { to } of adj[x]) {
      if (seen[to]) continue
      seen[to] = true
      prev[to] = x
      q.push(to)
    }
  }
  let sum = 0
  let cur = v
  while (cur >= 0) {
    sum += value[cur]
    if (cur === u) return sum
    cur = prev[cur]
  }
  return -1
}

export type Preset = { name: string; n: number; edges: Edge[]; queries: [number, number][]; pos: [number, number][] }

export const PRESETS: Preset[] = [
  {
    name: "样例树",
    n: 8,
    pos: [
      [300, 40],
      [160, 120],
      [440, 120],
      [80, 200],
      [240, 200],
      [380, 200],
      [520, 200],
      [520, 300],
    ],
    edges: [
      { u: 0, v: 1, w: 3 },
      { u: 0, v: 2, w: 5 },
      { u: 1, v: 3, w: 2 },
      { u: 1, v: 4, w: 4 },
      { u: 2, v: 5, w: 1 },
      { u: 2, v: 6, w: 6 },
      { u: 6, v: 7, w: 2 },
    ],
    queries: [
      [3, 7],
      [4, 5],
      [7, 6],
    ],
  },
  {
    name: "偏重链的树",
    n: 9,
    pos: [
      [300, 40],
      [170, 120],
      [420, 120],
      [90, 200],
      [170, 200],
      [330, 300],
      [470, 300],
      [60, 290],
      [230, 310],
    ],
    edges: [
      { u: 0, v: 1, w: 1 },
      { u: 0, v: 2, w: 2 },
      { u: 1, v: 3, w: 3 },
      { u: 1, v: 4, w: 1 },
      { u: 1, v: 6, w: 4 },
      { u: 2, v: 5, w: 2 },
      { u: 2, v: 7, w: 5 },
      { u: 3, v: 8, w: 6 },
    ],
    queries: [
      [8, 7],
      [5, 3],
    ],
  },
  {
    name: "链",
    n: 6,
    pos: [
      [60, 200],
      [160, 200],
      [260, 200],
      [360, 200],
      [460, 200],
      [560, 200],
    ],
    edges: [
      { u: 0, v: 1, w: 1 },
      { u: 1, v: 2, w: 2 },
      { u: 2, v: 3, w: 3 },
      { u: 3, v: 4, w: 4 },
      { u: 4, v: 5, w: 5 },
    ],
    queries: [
      [0, 5],
      [2, 4],
    ],
  },
]

/** 生成小规模随机树（父节点小于子节点，天然是一棵树） */
export function randomTree(n: number): Preset {
  const edges: Edge[] = []
  for (let v = 1; v < n; v++) {
    const p = Math.floor(Math.random() * v)
    edges.push({ u: p, v, w: 1 + Math.floor(Math.random() * 9) })
  }
  const queries: [number, number][] = Array.from({ length: 3 }, () => [
    Math.floor(Math.random() * n),
    Math.floor(Math.random() * n),
  ])
  return { name: "随机", n, edges, queries, pos: [] }
}
