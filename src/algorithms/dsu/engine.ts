/**
 * 并查集（Disjoint Set Union）
 *
 * parent[i]：i 的父节点，根满足 parent[i] == i
 * rank[i]  ：近似树高（按秩合并时把矮的挂到高的下面）
 * find(x)  ：一路向上找根，同时把路径上的点直接挂到根上（路径压缩）
 * merge(x, y)：找到两个根，按秩把矮的接到高的下面
 */

export type Op = { kind: "find" | "union"; a: number; b?: number }

export type Step = {
  index: number
  opIndex: number
  op: Op
  parent: number[]
  rank: number[]
  /** 当前访问的节点 */
  current: number | null
  /** 路径压缩过程中被改挂的节点 */
  changed: number[]
  /** 本轮 find 的路径 */
  path: number[]
  /** 本轮找到的根 */
  root: number | null
  result: string | null
  describe: string
  codeLines: number[]
}

export type SimResult = { n: number; initialParent: number[]; initialRank: number[]; ops: Op[]; steps: Step[]; results: string[] }

export const CODE = [
  "int find(int x) {",
  "  if (parent[x] != x)",
  "    parent[x] = find(parent[x]);   // 路径压缩",
  "  return parent[x];",
  "}",
  "",
  "void unite(int x, int y) {",
  "  int rx = find(x), ry = find(y);",
  "  if (rx == ry) return;            // 已连通",
  "  if (rank[rx] < rank[ry]) swap(rx, ry);",
  "  parent[ry] = rx;",
  "  if (rank[rx] == rank[ry]) rank[rx]++;",
  "}",
] as const

export function simulate(n: number, ops: Op[]): SimResult {
  const parent = Array.from({ length: n }, (_, i) => i)
  const rank = new Array<number>(n).fill(0)
  const initialParent = [...parent]
  const initialRank = [...rank]
  const steps: Step[] = []
  const results: string[] = []

  const push = (s: Omit<Step, "index" | "parent" | "rank">) =>
    steps.push({ ...s, index: steps.length, parent: [...parent], rank: [...rank] })

  for (let oi = 0; oi < ops.length; oi++) {
    const op = ops[oi]
    if (op.kind === "find") {
      const x = op.a
      const path: number[] = []
      push({
        opIndex: oi,
        op,
        current: x,
        changed: [],
        path: [x],
        root: null,
        result: null,
        describe: `find(${x + 1})：从 ${x + 1} 开始沿 parent 指针向上找根。`,
        codeLines: [1, 2],
      })
      let cur = x
      while (parent[cur] !== cur) {
        path.push(parent[cur])
        cur = parent[cur]
        push({
          opIndex: oi,
          op,
          current: cur,
          changed: [],
          path: [...path],
          root: null,
          result: null,
          describe: `parent[${path[path.length - 2] + 1}] = ${cur + 1}，继续向上。`,
          codeLines: [2],
        })
      }
      const changed: number[] = []
      for (const node of path) {
        if (parent[node] !== cur) {
          parent[node] = cur
          changed.push(node)
        }
      }
      push({
        opIndex: oi,
        op,
        current: cur,
        changed,
        path,
        root: cur,
        result: `${cur + 1}`,
        describe:
          changed.length > 1
            ? `找到根 ${cur + 1}，路径压缩：${changed.map((c) => c + 1).join("、")} 的 parent 都直接改成 ${cur + 1}，以后再查只需一步。`
            : `找到根 ${cur + 1}，路径上已经是直接相连，无需修改。`,
        codeLines: [3, 4],
      })
      results.push(`find(${x + 1}) = ${cur + 1}`)
    } else {
      const { a: x, b } = op
      const y = b!
      const runFind = (start: number, tag: string) => {
        const path: number[] = []
        let cur = start
        while (parent[cur] !== cur) {
          path.push(cur)
          cur = parent[cur]
        }
        path.push(cur)
        return { root: cur, path, tag }
      }
      const fx = runFind(x, "x")
      const fy = runFind(y, "y")
      push({
        opIndex: oi,
        op,
        current: x,
        changed: [],
        path: fx.path,
        root: fx.root,
        result: null,
        describe: `unite(${x + 1}, ${y + 1})：先分别找根，find(${x + 1}) = ${fx.root + 1}。`,
        codeLines: [7, 8],
      })
      push({
        opIndex: oi,
        op,
        current: y,
        changed: [],
        path: fy.path,
        root: fy.root,
        result: null,
        describe: `find(${y + 1}) = ${fy.root + 1}。`,
        codeLines: [8],
      })
      if (fx.root === fy.root) {
        push({
          opIndex: oi,
          op,
          current: fx.root,
          changed: [],
          path: [...fx.path, ...fy.path],
          root: fx.root,
          result: "已连通",
          describe: `两个根相同（都是 ${fx.root + 1}），说明 ${x + 1} 与 ${y + 1} 已经连通，什么也不做。`,
          codeLines: [9],
        })
        results.push(`unite(${x + 1}, ${y + 1}) → 已连通`)
        continue
      }
      let rx = fx.root
      let ry = fy.root
      let swapped = false
      if (rank[rx] < rank[ry]) {
        ;[rx, ry] = [ry, rx]
        swapped = true
      }
      push({
        opIndex: oi,
        op,
        current: rx,
        changed: [],
        path: [rx, ry],
        root: rx,
        result: null,
        describe: `比较秩：rank[${fx.root + 1}] = ${rank[fx.root]}，rank[${fy.root + 1}] = ${rank[fy.root]}。${swapped ? `把两者的角色交换，让秩大的 ${rx + 1} 当新根。` : `根 ${rx + 1} 的秩更大（或相等），让它当新根。`}`,
        codeLines: [10],
      })
      parent[ry] = rx
      const oldRank = rank[rx]
      if (rank[rx] === rank[ry]) rank[rx]++
      push({
        opIndex: oi,
        op,
        current: rx,
        changed: [ry],
        path: [rx, ry],
        root: rx,
        result: `${rx + 1}`,
        describe: `parent[${ry + 1}] = ${rx + 1}，合并完成。${rank[rx] !== oldRank ? `两棵树一样高，新的树高加一：rank[${rx + 1}] = ${rank[rx]}。` : `秩不变。`}`,
        codeLines: [11, 12],
      })
      results.push(`unite(${x + 1}, ${y + 1}) → 根 ${rx + 1}`)
    }
  }

  return { n, initialParent, initialRank, ops, steps, results }
}

export type Preset = { name: string; n: number; ops: Op[] }

export const PRESETS: Preset[] = [
  {
    name: "入门示例",
    n: 8,
    ops: [
      { kind: "union", a: 0, b: 1 },
      { kind: "union", a: 2, b: 3 },
      { kind: "union", a: 1, b: 3 },
      { kind: "find", a: 0 },
      { kind: "union", a: 4, b: 5 },
      { kind: "union", a: 5, b: 6 },
      { kind: "find", a: 6 },
      { kind: "find", a: 7 },
    ],
  },
  {
    name: "链式合并（看压缩）",
    n: 7,
    ops: [
      { kind: "union", a: 0, b: 1 },
      { kind: "union", a: 1, b: 2 },
      { kind: "union", a: 2, b: 3 },
      { kind: "union", a: 3, b: 4 },
      { kind: "find", a: 4 },
      { kind: "find", a: 0 },
    ],
  },
  {
    name: "重复合并",
    n: 6,
    ops: [
      { kind: "union", a: 0, b: 1 },
      { kind: "union", a: 1, b: 2 },
      { kind: "union", a: 0, b: 2 },
      { kind: "union", a: 3, b: 4 },
      { kind: "union", a: 2, b: 4 },
      { kind: "find", a: 3 },
    ],
  },
]
