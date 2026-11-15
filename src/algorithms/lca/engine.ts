/**
 * 最近公共祖先（LCA）—— 倍增法
 *
 * 预处理：
 *   - 从根深搜，得到每个点的父节点 fa[v] 和深度 dep[v]
 *   - up[v][0] = fa[v]，up[v][k] = up[ up[v][k-1] ][k-1]（走 2^k 步）
 * 查询 lca(u, v)：
 *   - 先让较深的点向上跳到与另一点同深度
 *   - 若已经相等则返回
 *   - 从大到小尝试同时跳 2^k 步，若跳完仍不同就跳
 *   - 答案为 up[u][0]
 */

export type Step = {
  index: number
  phase: "build" | "query"
  u: number
  v: number
  /** 当前在跳的节点对 */
  a: number
  b: number
  /** 本次跳的步长 2^k（null 表示不跳 / 说明性步骤） */
  jumpK: number | null
  /** 本次真正发生了哪些移动 */
  moved: number[]
  /** 已标记为祖先的节点（向上标记法的高亮） */
  marked: number[]
  /** 答案 */
  result: number | null
  describe: string
  codeLines: number[]
  query: [number, number] | null
}

export type SimResult = { n: number; parent: number[]; depth: number[]; up: number[][]; K: number; steps: Step[]; results: number[] }

export const CODE = [
  "void dfs(int u, int fa) {",
  "  up[u][0] = fa; dep[u] = dep[fa] + 1;",
  "  for (int k = 1; k <= K; k++)",
  "    up[u][k] = up[ up[u][k-1] ][k-1];",
  "  for (int v : adj[u]) if (v != fa) dfs(v, u);",
  "}",
  "",
  "int lca(int u, int v) {",
  "  if (dep[u] < dep[v]) swap(u, v);",
  "  int diff = dep[u] - dep[v];           // 1. 提到同深度",
  "  for (int k = K; k >= 0; k--)",
  "    if (diff >> k & 1) u = up[u][k];",
  "  if (u == v) return u;",
  "  for (int k = K; k >= 0; k--)          // 2. 同时上跳",
  "    if (up[u][k] != up[v][k]) u = up[u][k], v = up[v][k];",
  "  return up[u][0];",
  "}",
] as const

export function simulate(input: number[], queries: [number, number][]): SimResult {
  const parent = [...input]
  const n = parent.length
  const log2 = Math.log2
  const depth = new Array<number>(n).fill(0)
  const K = Math.max(1, Math.ceil(log2(Math.max(2, n))))
  const up: number[][] = []
  for (let i = 0; i < n; i++) up.push(new Array<number>(K + 1).fill(0))

  // 先求根（parent < 0 或指向自己），再从根 BFS 求深度与处理顺序
  let root = parent.findIndex((p) => p < 0 || p === undefined)
  if (root < 0) root = 0
  const children: number[][] = Array.from({ length: n }, () => [])
  for (let v = 0; v < n; v++) if (parent[v] >= 0 && parent[v] !== v && v !== root) children[parent[v]].push(v)
  const order: number[] = []
  const bfs = [root]
  for (let h = 0; h < bfs.length; h++) {
    const u = bfs[h]
    order.push(u)
    for (const c of children[u]) {
      depth[c] = depth[u] + 1
      bfs.push(c)
    }
  }

  const steps: Step[] = []
  const push = (s: Omit<Step, "index">) => {
    steps.push({ ...s, index: steps.length })
  }
  const base: Omit<Step, "index" | "describe" | "codeLines"> = {
    u: -1,
    v: -1,
    a: -1,
    b: -1,
    jumpK: null,
    moved: [],
    marked: [],
    result: null,
    query: null,
    phase: "build",
  }

  up[root][0] = root
  for (const v of order) {
    if (v !== root) up[v][0] = parent[v]
    for (let k = 1; k <= K; k++) up[v][k] = up[up[v][k - 1]][k - 1]
    push({
      ...base,
      marked: [v],
      describe: `处理点 ${v + 1}：深度 dep = ${depth[v]}，2^k 级祖先 up[${v + 1}][k] = ${Array.from({ length: K + 1 }, (_, k) => `${up[v][k] + 1}`).join(" / ")}。`,
      codeLines: [1, 3, 4],
    })
  }

  push({
    ...base,
    describe: `倍增表构建完成：up[v][k] 表示 v 的第 2^k 级祖先，共 ${K + 1} 列，空间 O(n log n)。`,
    codeLines: [2, 3, 4, 5],
  })

  const results: number[] = []
  for (const [qu, qv] of queries) {
    const q: [number, number] = [qu, qv]
    // 让 u 恒为较深的点；dep 相同时保持原顺序
    const u0 = depth[qu] >= depth[qv] ? qu : qv
    const v0 = u0 === qu ? qv : qu
    let u = u0
    let v = v0

    const snap = (describe: string, codeLines: number[], extra: Partial<Step> = {}) => {
      steps.push({
        index: steps.length,
        phase: "query",
        u,
        v,
        a: u,
        b: v,
        jumpK: null,
        moved: [],
        marked: [],
        result: null,
        query: q,
        describe,
        codeLines,
        ...extra,
      })
    }

    snap(
      `查询 lca(${qu + 1}, ${qv + 1})：dep[${qu + 1}] = ${depth[qu]}，dep[${qv + 1}] = ${depth[qv]}。先让较深的点 ${u0 + 1} 向上跳到与 ${v0 + 1} 同深度。`,
      [8, 9, 10]
    )

    // ---- 步骤 1：把 u 提到与 v 同深度 ----
    // 深度差 diff 的二进制为 1 的位对应的 2^k 步就要跳：up[u][k] 恰好跳到深度 dep[u] - 2^k
    let diff = depth[u] - depth[v]
    for (let k = K; k >= 0; k--) {
      const anc = up[u][k]
      if ((diff >> k) & 1) {
        const from = u
        u = anc
        diff -= 1 << k
        snap(
          `深度差 ${diff} 的第 ${k} 位是 1，u 向上跳 2^${k} = ${1 << k} 步：${from + 1} → ${u + 1}（深度 ${depth[from]} → ${depth[u]}），还差 ${diff - (1 << k)}。`,
          [11, 12],
          { jumpK: k, moved: [from] }
        )
      } else if (diff < (1 << k)) {
        snap(`深度差 ${diff} 的第 ${k} 位是 0，不能跳 2^${k} = ${1 << k} 步（会跳过头），跳过。`, [11], { jumpK: k })
      } else {
        snap(`这一步已经到达 ${v + 1} 的深度，越界判断：up[u][k] = ${anc + 1}，跳过去深度会是 ${depth[anc]}，不跳。`, [11], { jumpK: k })
      }
    }
    snap(
      `现在 ${u + 1} 与 ${v + 1} 深度相同（${depth[u]}）。${u === v ? "两点重合，最近公共祖先就是它自己。" : "两者不同，需要同时向上跳。"}`,
      [11, 13]
    )

    if (u === v) {
      results.push(u)
      snap(`lca(${qu + 1}, ${qv + 1}) = ${u + 1}（其中一个是另一个的祖先）。`, [13], { marked: [u], result: u })
      continue
    }

    // ---- 步骤 2：同时上跳，不能越过 LCA ----
    for (let k = K; k >= 0; k--) {
      const ua = up[u][k]
      const vb = up[v][k]
      if (ua !== vb) {
        const fu = u
        const fv = v
        u = ua
        v = vb
        snap(
          `同时向上跳 2^${k} = ${1 << k} 步：${fu + 1} → ${ua + 1}，${fv + 1} → ${vb + 1}。跳完仍然不同，说明没越过 LCA，可以跳。`,
          [14, 15],
          { jumpK: k, moved: [fu, fv] }
        )
      } else {
        snap(
          `试跳 2^${k} 步会跳进同一个点 ${ua + 1}，那就越过（或正好到达）LCA 了，这一步不跳。`,
          [14],
          { jumpK: k }
        )
      }
    }
    const ans = up[u][0]
    results.push(ans)
    snap(`此时 ${u + 1} 与 ${v + 1} 的父节点相同，lca(${qu + 1}, ${qv + 1}) = ${ans + 1}。`, [16], {
      marked: [u, v, ans],
      result: ans,
    })
  }

  return { n, parent, depth, up, K, steps, results }
}

/** 样例树：父节点数组（-1 表示根） */
export type Preset = { name: string; parent: number[]; queries: [number, number][] }

export const PRESETS: Preset[] = [
  {
    name: "样例树",
    parent: [-1, 0, 0, 1, 1, 2, 2, 3, 5],
    queries: [
      [7, 8],
      [3, 6],
      [4, 4],
    ],
  },
  {
    name: "深链",
    parent: [-1, 0, 1, 2, 3, 4, 5],
    queries: [
      [6, 3],
      [4, 2],
    ],
  },
  {
    name: "完全二叉树",
    parent: [-1, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4],
    queries: [
      [7, 9],
      [8, 10],
      [5, 6],
    ],
  },
]

/** 计算中序遍历骨架布局用的子节点表 */
export function childrenOf(parent: number[]) {
  const ch: number[][] = Array.from({ length: parent.length }, () => [])
  parent.forEach((p, v) => {
    if (p >= 0) ch[p].push(v)
  })
  return ch
}
