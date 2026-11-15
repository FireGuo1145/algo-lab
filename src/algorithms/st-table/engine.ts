/**
 * ST 表（稀疏表）—— 区间最值查询 RMQ
 *
 * st[k][i] 表示从 i 开始、长度为 2^k 的区间最值（[i, i + 2^k)）。
 * 递推：st[k][i] = min(st[k-1][i], st[k-1][i + 2^(k-1)])
 * 查询 [l, r]：k = floor(log2(r - l + 1))，答案是 min(st[k][l], st[k][r - 2^k + 1])
 */

export type Cell = { l: number; r: number }

export type Step = {
  index: number
  phase: "build" | "query"
  /** 当前高亮的表格单元 [l, r) */
  cells: Cell[]
  /** 当前值（构建时的候选 / 查询时的结果） */
  value: number | null
  table: (number | undefined)[][]
  describe: string
  codeLines: number[]
  /** 查询区间（构建阶段为 null） */
  query: [number, number] | null
}

export type SimResult = {
  a: number[]
  maxK: number
  steps: Step[]
  st: number[][]
  /** 每个查询的结果 */
  queryResults: { l: number; r: number; k: number; result: number; blocks: [Cell, Cell] }[]
}

export const CODE = [
  "int st[MAXK][N];   // st[k][i]：从 i 起 2^k 个元素的最值",
  "",
  "void build(int a[], int n) {",
  "  for (int i = 0; i < n; i++) st[0][i] = a[i];",
  "  int K = log2(n);",
  "  for (int k = 1; k <= K; k++)",
  "    for (int i = 0; i + (1 << k) <= n; i++)",
  "      st[k][i] = min(st[k-1][i], st[k-1][i + (1 << (k-1))]);",
  "}",
  "",
  "int query(int l, int r) {          // 询问 [l, r]",
  "  int k = log2(r - l + 1);",
  "  return min(st[k][l], st[k][r - (1 << k) + 1]);",
  "}",
] as const

function log2floor(n: number) {
  return Math.floor(Math.log2(n))
}

export function simulate(a: number[], queries: [number, number][]): SimResult {
  const n = a.length
  const maxK = n > 0 ? log2floor(n) : 0
  const st: number[][] = Array.from({ length: maxK + 1 }, () => new Array<number>(n).fill(NaN))
  const steps: Step[] = []

  const snapshot = () =>
    st.map((row) => row.map((v) => (Number.isNaN(v) ? undefined : v)))

  const push = (
    phase: Step["phase"],
    cells: Cell[],
    value: number | null,
    describe: string,
    codeLines: number[],
    query: Step["query"]
  ) => {
    steps.push({ index: steps.length, phase, cells, value, table: snapshot(), describe, codeLines, query })
  }

  // 第 0 层
  if (n > 0) {
    push("build", [], null, `初始化：ST 表共 log2(${n}) + 1 = ${maxK + 1} 层，第 0 层 st[0][i] 就是数组本身，长度为 2^0 = 1。`, [3, 4], null)
    for (let i = 0; i < n; i++) {
      st[0][i] = a[i]
      push("build", [{ l: i, r: i + 1 }], a[i], `st[0][${i}] = a[${i}] = ${a[i]}。`, [4], null)
    }
  }

  for (let k = 1; k <= maxK; k++) {
    const len = 1 << k
    const half = 1 << (k - 1)
    push(
      "build",
      [],
      null,
      `开始构建第 ${k} 层：每格覆盖 ${len} 个元素，由两个第 ${k - 1} 层（各 ${half} 个元素）的最值合并。`,
      [6],
      null
    )
    for (let i = 0; i + len <= n; i++) {
      st[k][i] = Math.min(st[k - 1][i], st[k - 1][i + half])
      push(
        "build",
        [
          { l: i, r: i + half },
          { l: i + half, r: i + len },
        ],
        st[k][i],
        `st[${k}][${i}] = min( st[${k - 1}][${i}] = ${st[k - 1][i]}, st[${k - 1}][${i + half}] = ${st[k - 1][i + half]} ) = ${st[k][i]}，覆盖区间 [${i}, ${i + len - 1}]。`,
        [7],
        null
      )
    }
  }

  if (n > 0) {
    push("build", [], null, `构建完成：共 ${(maxK + 1) * n} 个格子（有很多越界部分不用填），预处理复杂度 O(n log n)。`, [5], null)
  }

  const queryResults: SimResult["queryResults"] = []
  for (const [l, r] of queries) {
    const len = r - l + 1
    const k = log2floor(len)
    const start2 = r - (1 << k) + 1
    const left = { l, r: l + (1 << k) - 1 }
    const right = { l: start2, r }
    push("query", [], null, `查询 [${l}, ${r}]：区间长度 ${len}，取 k = floor(log2 ${len}) = ${k}，即用两段长度 ${1 << k} 的块覆盖它。`, [11], [l, r])
    push("query", [left], st[k][l], `左块：st[${k}][${l}] 覆盖 [${left.l}, ${left.r}]，最值 ${st[k][l]}。`, [12], [l, r])
    push("query", [right], st[k][start2], `右块：st[${k}][${start2}] 覆盖 [${right.l}, ${right.r}]，最值 ${st[k][start2]}。`, [12], [l, r])
    const result = Math.min(st[k][l], st[k][start2])
    push("query", [left, right], result, `两段重叠但不漏元素，答案 = min(${st[k][l]}, ${st[k][start2]}) = ${result}。查询 O(1)。`, [12], [l, r])
    queryResults.push({ l, r, k, result, blocks: [left, right] })
  }

  return { a, maxK, steps, st, queryResults }
}

export type Preset = { name: string; a: number[]; queries: [number, number][] }

export const PRESETS: Preset[] = [
  { name: "样例数组", a: [5, 3, 8, 1, 9, 2, 7, 4], queries: [[2, 5], [0, 7], [3, 3]] },
  { name: "较长数组", a: [4, 2, 9, 7, 3, 8, 6, 1, 5, 0, 3, 6], queries: [[1, 9], [4, 4], [0, 5]] },
  { name: "小规模", a: [7, 1, 6], queries: [[0, 2], [1, 2]] },
]
