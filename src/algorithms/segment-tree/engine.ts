/**
 * 线段树（区间加 + 区间求和，带懒标记）—— 核心模拟引擎
 *
 * 结构：节点 1 覆盖整个数组 [0, n)，节点 i 的左儿子 2i、右儿子 2i+1，
 * 每个节点维护：
 *   - sum：该区间的元素和（已经包含本节点的 tag）
 *   - tag：尚未下传给儿子的“区间加”增量
 * 操作：
 *   - rangeAdd(l, r, v)：对 [l, r) 加 v。完全覆盖的节点打 tag；
 *     部分覆盖则先 pushDown 再把增量交给儿子，最后 pull 重算。
 *   - rangeSum(l, r)：对 [l, r) 求和。完全覆盖直接返回 sum，部分覆盖先 pushDown 再向下询问。
 *
 * 每个操作把递归过程记录成可回放的步骤（每次访问 / 修改一个节点 = 一步）。
 */

export type Op = {
  kind: "add" | "sum"
  l: number
  r: number
  /** add 的增量；sum 操作忽略 */
  value: number
}

export type Touch = "full" | "split" | "pushdown" | "pull"

export type Step = {
  index: number
  opIndex: number
  op: Op
  /** 操作执行后的树状态：按节点下标顺序的快照（只包含存在节点） */
  tree: { index: number; l: number; r: number; sum: number; tag: number }[]
  /** 当前正在访问的节点下标 */
  node: number
  touch: Touch
  /** 本轮访问的路径（从根到当前节点） */
  path: number[]
  /** add 已打标记的节点 */
  tagged: number[]
  /** sum 目前累计到的答案 */
  accumulating: number
  /** 操作完成后的结果（只有完成步骤才有） */
  result: number | null
  describe: string
  codeLines: number[]
}

export type SimResult = {
  n: number
  base: number[]
  initialTree: Step["tree"]
  ops: Op[]
  steps: Step[]
}

export const CODE = [
  "void pushDown(int x) {",
  "  tag[2x] += tag[x]; sum[2x] += tag[x] * len(2x);",
  "  tag[2x+1] += tag[x]; sum[2x+1] += tag[x] * len(2x+1);",
  "  tag[x] = 0;",
  "}",
  "",
  "void rangeAdd(int x, int l, int r, int ql, int qr, int v) {",
  "  if (ql <= l && r <= qr) {          // 完全覆盖",
  "    tag[x] += v; sum[x] += v * (r - l); return;",
  "  }",
  "  pushDown(x);",
  "  int m = (l + r) / 2;",
  "  if (ql < m)  rangeAdd(2x,   l,   m, ql, qr, v);",
  "  if (qr > m)  rangeAdd(2x+1, m,   r, ql, qr, v);",
  "  sum[x] = sum[2x] + sum[2x+1];      // pull",
  "}",
  "",
  "int rangeSum(int x, int l, int r, int ql, int qr) {",
  "  if (ql <= l && r <= qr) return sum[x];",
  "  pushDown(x);",
  "  int m = (l + r) / 2, res = 0;",
  "  if (ql < m) res += rangeSum(2x,   l,   m, ql, qr);",
  "  if (qr > m) res += rangeSum(2x+1, m,   r, ql, qr);",
  "  return res;",
  "}",
] as const


export function simulate(base: number[], ops: Op[]): SimResult {
  const n = base.length
  const size = 4 * Math.max(1, n)
  const sum = new Array<number>(size).fill(0)
  const tag = new Array<number>(size).fill(0)

  const build = (x: number, l: number, r: number) => {
    if (r - l === 1) {
      sum[x] = base[l]
      return
    }
    const m = Math.floor((l + r) / 2)
    build(x * 2, l, m)
    build(x * 2 + 1, m, r)
    sum[x] = sum[x * 2] + sum[x * 2 + 1]
  }
  if (n > 0) build(1, 0, n)

  const snapshot = (): Step["tree"] => {
    const out: Step["tree"] = []
    const walk = (x: number, l: number, r: number) => {
      out.push({ index: x, l, r, sum: sum[x], tag: tag[x] })
      if (r - l > 1) {
        const m = Math.floor((l + r) / 2)
        walk(x * 2, l, m)
        walk(x * 2 + 1, m, r)
      }
    }
    if (n > 0) walk(1, 0, n)
    return out
  }

  const steps: Step[] = []
  const push = (s: Omit<Step, "index" | "tree">) => {
    steps.push({ ...s, index: steps.length, tree: snapshot() })
  }

  const initialTree = n > 0 ? snapshot() : []

  for (let oi = 0; oi < ops.length; oi++) {
    const op = ops[oi]
    const tagged: number[] = []
    let accumulating = 0

    const pushDown = (x: number, l: number, r: number): boolean => {
      if (tag[x] === 0) return false
      const m = Math.floor((l + r) / 2)
      const v = tag[x]
      tag[x * 2] += v
      sum[x * 2] += v * (m - l)
      tag[x * 2 + 1] += v
      sum[x * 2 + 1] += v * (r - m)
      tag[x] = 0
      push({
        opIndex: oi,
        op,
        node: x,
        touch: "pushdown",
        path: [x],
        tagged: [...tagged],
        accumulating,
        result: null,
        describe: `节点 ${x} 有懒标记 tag = ${fmt(v)}，需要下传：左右儿子的 tag 各加 ${fmt(v)}，sum 分别加上 ${fmt(v)} × 区间长度，然后清空节点 ${x} 的 tag。`,
        codeLines: [1, 2, 3, 4],
      })
      return true
    }

    if (op.kind === "add") {
      const v = op.value
      const rangeAdd = (x: number, l: number, r: number, path: number[]): void => {
        if (op.l <= l && r <= op.r) {
          tag[x] += v
          sum[x] += v * (r - l)
          tagged.push(x)
          push({
            opIndex: oi,
            op,
            node: x,
            touch: "full",
            path,
            tagged: [...tagged],
            accumulating,
            result: null,
            describe: `节点 ${x} 的区间 [${l}, ${r}) 被 [${op.l}, ${op.r}) 完全覆盖：tag += ${fmt(v)}，sum += ${fmt(v)} × ${r - l} = ${fmt(v * (r - l))}，不再向下递归。`,
            codeLines: [8, 9],
          })
          return
        }
        pushDown(x, l, r)
        const m = Math.floor((l + r) / 2)
        push({
          opIndex: oi,
          op,
          node: x,
          touch: "split",
          path,
          tagged: [...tagged],
          accumulating,
          result: null,
          describe: `节点 ${x} 的区间 [${l}, ${r}) 只被部分覆盖，需要递归到孩子：中点 m = ${m}，左边找 [${op.l}, ${Math.min(op.r, m)})，右边找 [${Math.max(op.l, m)}, ${op.r})。`,
          codeLines: [11, 12],
        })
        if (op.l < m) rangeAdd(x * 2, l, m, [...path, x * 2])
        if (op.r > m) rangeAdd(x * 2 + 1, m, r, [...path, x * 2 + 1])
        const before = sum[x]
        sum[x] = sum[x * 2] + sum[x * 2 + 1]
        push({
          opIndex: oi,
          op,
          node: x,
          touch: "pull",
          path,
          tagged: [...tagged],
          accumulating,
          result: null,
          describe: `回溯 pull：sum[${x}] = sum[${x * 2}] + sum[${x * 2 + 1}] = ${fmt(sum[x * 2])} + ${fmt(sum[x * 2 + 1])} = ${fmt(before)}。`,
          codeLines: [15],
        })
      }
      if (n > 0) rangeAdd(1, 0, n, [1])
      push({
        opIndex: oi,
        op,
        node: 1,
        touch: "full",
        path: [1],
        tagged: [...tagged],
        accumulating: 0,
        result: null,
        describe: `区间加完成：[${op.l}, ${op.r}) 上每个元素加 ${fmt(v)}，共在 ${new Set(tagged).size} 个节点上打了懒标记。`,
        codeLines: [7],
      })
    } else {
      const rangeSum = (x: number, l: number, r: number, path: number[]): number => {
        if (op.l <= l && r <= op.r) {
          accumulating += sum[x]
          push({
            opIndex: oi,
            op,
            node: x,
            touch: "full",
            path,
            tagged: [],
            accumulating,
            result: null,
            describe: `节点 ${x} 的区间 [${l}, ${r}) 完全在查询范围内：直接取得 sum = ${fmt(sum[x])}，当前累计答案 ${fmt(accumulating)}。`,
            codeLines: [18],
          })
          return sum[x]
        }
        pushDown(x, l, r)
        const m = Math.floor((l + r) / 2)
        push({
          opIndex: oi,
          op,
          node: x,
          touch: "split",
          path,
          tagged: [],
          accumulating,
          result: null,
          describe: `节点 ${x} 的区间 [${l}, ${r}) 与查询区间部分相交，向下拆分（中点 m = ${m}）${op.l < m ? `，左半边查 [${op.l}, ${Math.min(op.r, m)})` : ""}${op.r > m ? `，右半边查 [${Math.max(op.l, m)}, ${op.r})` : ""}。`,
          codeLines: [19, 20],
        })
        let res = 0
        if (op.l < m) res += rangeSum(x * 2, l, m, [...path, x * 2])
        if (op.r > m) res += rangeSum(x * 2 + 1, m, r, [...path, x * 2 + 1])
        return res
      }
      const res = n > 0 ? rangeSum(1, 0, n, [1]) : 0
      push({
        opIndex: oi,
        op,
        node: 1,
        touch: "full",
        path: [1],
        tagged: [],
        accumulating: res,
        result: res,
        describe: `区间和完成：sum([${op.l}, ${op.r})) = ${fmt(res)}。`,
        codeLines: [23],
      })
    }
  }

  return { n, base, initialTree, ops, steps }
}

/** 从树快照读取某个下标的值：路径上所有 tag 之和 + 叶子自身 sum 中的原始值 */
export function pointValue(tree: Step["tree"], n: number, i: number) {
  const byIndex = new Map(tree.map((t) => [t.index, t]))
  let value = 0
  const walk = (x: number, l: number, r: number): boolean => {
    const node = byIndex.get(x)
    if (!node) return false
    if (r - l === 1) {
      // 叶子 sum 已经包含了叶子上自己的 tag，所以只加祖先的 tag
      value += node.sum
      return true
    }
    value += node.tag
    const m = Math.floor((l + r) / 2)
    return i < m ? walk(x * 2, l, m) : walk(x * 2 + 1, m, r)
  }
  if (n > 0) walk(1, 0, n)
  return value
}

/** 暴力执行操作序列，用于校验 */
export function bruteForce(base: number[], ops: Op[]) {
  const a = [...base]
  const sums: number[] = []
  for (const op of ops) {
    if (op.kind === "add") {
      for (let i = op.l; i < op.r; i++) a[i] += op.value
    } else {
      sums.push(a.slice(op.l, op.r).reduce((x, y) => x + y, 0))
    }
  }
  return { final: a, sums }
}

function fmt(v: number) {
  return String(Math.round(v * 1e6) / 1e6)
}

export type Preset = { name: string; base: number[]; ops: Op[] }

export const PRESETS: Preset[] = [
  {
    name: "入门示例",
    base: [1, 3, 5, 7, 9, 11],
    ops: [
      { kind: "add", l: 1, r: 4, value: 2 },
      { kind: "sum", l: 0, r: 6, value: 0 },
      { kind: "sum", l: 2, r: 5, value: 0 },
    ],
  },
  {
    name: "8 个元素",
    base: [2, 4, 6, 8, 10, 12, 14, 16],
    ops: [
      { kind: "add", l: 0, r: 8, value: 1 },
      { kind: "add", l: 2, r: 6, value: 10 },
      { kind: "sum", l: 1, r: 7, value: 0 },
      { kind: "add", l: 3, r: 5, value: -3 },
      { kind: "sum", l: 0, r: 8, value: 0 },
    ],
  },
  {
    name: "单点操作",
    base: [5, 1, 4, 2, 3],
    ops: [
      { kind: "add", l: 2, r: 3, value: 7 },
      { kind: "add", l: 0, r: 1, value: -2 },
      { kind: "sum", l: 2, r: 3, value: 0 },
      { kind: "sum", l: 0, r: 5, value: 0 },
    ],
  },
  {
    name: "嵌套修改",
    base: [3, 1, 4, 1, 5, 9],
    ops: [
      { kind: "add", l: 0, r: 4, value: 5 },
      { kind: "sum", l: 1, r: 4, value: 0 },
      { kind: "add", l: 2, r: 6, value: -2 },
      { kind: "sum", l: 0, r: 6, value: 0 },
    ],
  },
]
