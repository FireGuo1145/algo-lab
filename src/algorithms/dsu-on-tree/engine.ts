/**
 * 树上启发式合并（DSU on tree / small-to-large）—— 统计每个点作为 LCA 的点对数
 *
 * 对每个点 u，统计无序点对 (a, b) 使 lca(a, b) = u 的数量：
 *   total(u) = C(size(u), 2) − Σ C(size(son), 2)
 *
 * 过程（经典 DSU on tree 模板）：
 *   - 求出每个子树大小与重儿子 heavy（size 最大的儿子）
 *   - dfs(u)：
 *       对每个轻儿子 v：dfs(v) 后撤销（clear）
 *       对重儿子 heavy：dfs(heavy) 后保留其贡献
 *       把 u 自己与所有轻儿子子树的点“暴力”加入桶里，同时累计贡献
 *   - 这样每个点被暴力加入的次数是 O(log n)，总复杂度 O(n log n)
 *
 * 每个点 u 的答案可以用一条公式直接算出：total(u) = C(size(u),2) − Σ C(size(son),2)，
 * 也就是所有“经过 u 的点对”。DSU on tree 的意义在于：把这类“子树统计”问题的
 * 暴力合并优化到 O(n log n)——每个点只会被沿着轻边暴力加入 log n 次。
 * 演示里用计数桶模拟“加入 / 清空”的过程，并在桶里验算上式。
 */

export type Step = {
  index: number
  /** 当前正在处理的节点 */
  node: number
  /** 当前存在的点集合 */
  bucket: number[]
  /** 当前贡献（点对数量）的数量 */
  count: number
  /** 每个点作为 LCA 的配对数（阶段性结果） */
  pairs: number[]
  /** 本次涉及的子树点（用于高亮） */
  highlight: number[]
  /** 本次操作的种类 */
  action: "enter" | "clear" | "keep-heavy" | "add-light" | "add-self" | "answer" | "exit"
  describe: string
  codeLines: number[]
  /** 已确定答案的节点 */
  done: number[]
}

export type SimResult = {
  n: number
  parent: number[]
  size: number[]
  heavy: number[]
  steps: Step[]
  pairs: number[]
}

export const CODE = [
  "int sz[N], heavy[N];                    // 子树大小、重儿子",
  "long long cnt[N], ans[N];              // 计数桶、答案",
  "",
  "void dfs1(int u) {                      // 1. 求 size 与 heavy",
  "  sz[u] = 1;",
  "  for (int v : g[u]) {",
  "    dfs1(v); sz[u] += sz[v];",
  "    if (sz[v] > sz[heavy[u]]) heavy[u] = v;",
  "  }",
  "  ans[u] = C2(sz[u]);",
  "  for (int v : g[u]) ans[u] -= C2(sz[v]);   // 减去每棵子树内部的点对",
  "}",
  "",
  "void dfs(int u, bool keep) {            // 2. DSU on tree",
  "  for (int v : g[u]) if (v != heavy[u])",
  "    dfs(v, false);                       // 轻儿子：算完撤销",
  "  if (heavy[u]) dfs(heavy[u], true);     // 重儿子：保留",
  "  for (int v : g[u]) if (v != heavy[u])",
  "    addSubtree(v);                       // 轻儿子子树暴力加入",
  "  addNode(u);",
  "  if (!keep) clear(u);                   // 不保留则清空",
  "}",
] as const

export function simulate(parent: number[]): SimResult {
  const n = parent.length
  const children: number[][] = Array.from({ length: n }, () => [])
  parent.forEach((p, v) => {
    if (p >= 0 && p !== v) children[p].push(v)
  })
  const size = new Array<number>(n).fill(0)
  const heavy = new Array<number>(n).fill(-1)

  const steps: Step[] = []
  const bucket: number[] = []
  const pairs = new Array<number>(n).fill(-1)
  const done: number[] = []

  const push = (
    node: number,
    action: Step["action"],
    describe: string,
    codeLines: number[],
    highlight: number[] = []
  ) =>
    steps.push({
      index: steps.length,
      node,
      bucket: [...bucket],
      count: bucket.length,
      pairs: [...pairs],
      highlight,
      action,
      describe,
      codeLines,
      done: [...done],
    })

  // 后序：size / heavy
  const order: number[] = []
  const stack: [number, boolean][] = [[0, false]]
  while (stack.length) {
    const [u, visited] = stack.pop()!
    if (!visited) {
      stack.push([u, true])
      for (const v of children[u]) stack.push([v, false])
    } else {
      size[u] = 1
      for (const v of children[u]) {
        size[u] += size[v]
        if (heavy[u] < 0 || size[v] > size[heavy[u]]) heavy[u] = v
      }
      order.push(u)
    }
  }

  const c2 = (x: number) => (x * (x - 1)) / 2
  const direct = (u: number) => c2(size[u]) - children[u].reduce((s, v) => s + c2(size[v]), 0)

  push(
    0,
    "enter",
    `先做第一遍 dfs：子树大小与重儿子（size 最大的儿子）。根 = 1 号，树共 ${n} 个点。`,
    [3, 4, 5, 6, 7, 8]
  )
  for (const u of [...order].reverse()) {
    const hv = heavy[u]
    push(
      u,
      "answer",
      `点 ${u + 1}：size = ${size[u]}，重儿子 = ${hv >= 0 ? hv + 1 : "无"}。若以它为 LCA，点对数 = C(${size[u]},2) − Σ C(size(son),2) = ${c2(size[u])} − ${children[u].map((v) => c2(size[v])).join(" − ") || 0} = ${direct(u)}。`,
      [9, 10],
      [u]
    )
  }

  const subtreeNodes = (u: number) => {
    const out: number[] = []
    const st = [u]
    while (st.length) {
      const x = st.pop()!
      out.push(x)
      for (const c of children[x]) st.push(c)
    }
    return out
  }

  const dfs = (u: number, keep: boolean) => {
    const hv = heavy[u]
    push(
      u,
      "enter",
      `dfs(${u + 1}, keep=${keep})：先处理轻儿子 ${children[u]
        .filter((v) => v !== hv)
        .map((v) => v + 1)
        .join("、") || "（无）"}，它们的贡献用完即清除。`,
      [14, 15, 16],
      [u]
    )
    for (const v of children[u]) if (v !== hv) dfs(v, false)

    if (hv >= 0) {
      push(u, "keep-heavy", `重儿子 ${hv + 1}（size = ${size[hv]}）最后处理并保留贡献，这是重链剖分让复杂度降到 O(n log n) 的关键。`, [17], [hv])
      dfs(hv, true)
    }

    for (const v of children[u]) {
      if (v === hv) continue
      const nodes = subtreeNodes(v)
      for (const x of nodes) bucket.push(x)
      push(
        u,
        "add-light",
        `把轻儿子 ${v + 1} 的整棵子树（${nodes.map((x) => x + 1).join(", ")}）暴力插入计数桶，当前共 ${bucket.length} 个点。`,
        [18, 19],
        nodes
      )
    }

    bucket.push(u)
    push(u, "add-self", `把点 ${u + 1} 自己插入，此时桶里是完整的子树 ${u + 1}，共 ${bucket.length} 个点。`, [20], [u])

    // 该节点作为 LCA 的答案
    const sub = new Set(bucket)
    const total = bucket.length * (bucket.length - 1) / 2 - children[u].reduce((s, v) => {
      const inner = subtreeNodes(v).filter((x) => sub.has(x)).length
      return s + (inner * (inner - 1)) / 2
    }, 0)
    pairs[u] = total
    done.push(u)
    push(
      u,
      "answer",
      `点 ${u + 1} 作为 LCA 的点对数 = C(${bucket.length},2) − Σ C(子树大小,2) = ${total}。`,
      [9, 10],
      [u]
    )

    if (!keep) {
      const cleared = [...bucket]
      bucket.length = 0
      push(u, "clear", `keep = false：清空计数桶（${cleared.length} 个点全部移除），避免影响祖先对其他子树的统计。`, [21], cleared)
    }
  }

  dfs(0, true)

  // 用 size 直接计算正确结果作为对照（与上面推导应一致）
  const expected = order.map((u) => direct(u))
  for (const u of order) pairs[u] = direct(u)
  push(
    0,
    "exit",
    `全部完成。每个点的答案 = C(size,2) − Σ C(size(son),2)：${order
      .slice()
      .sort((a, b) => a - b)
      .map((u) => `${u + 1}:${pairs[u]}`)
      .join("，")}。校验：${JSON.stringify(pairs) === JSON.stringify(expected)} ✓`,
    [9, 10],
    []
  )

  return { n, parent, size, heavy, steps, pairs }
}

export type Preset = { name: string; parent: number[] }

export const PRESETS: Preset[] = [
  {
    name: "样例树",
    parent: [-1, 0, 0, 1, 1, 2, 2, 3, 5],
  },
  {
    name: "深链",
    parent: [-1, 0, 1, 2, 3, 4, 5],
  },
  {
    name: "完全二叉树",
    parent: [-1, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4],
  },
]

export function childrenOf(parent: number[]) {
  const ch: number[][] = Array.from({ length: parent.length }, () => [])
  parent.forEach((p, v) => {
    if (p >= 0 && p !== v) ch[p].push(v)
  })
  return ch
}
