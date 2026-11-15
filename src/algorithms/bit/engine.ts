/**
 * 树状数组（Fenwick Tree）
 *
 * 下标从 1 开始；lowbit(i) = i & -i 是 i 的最低非零二进制位。
 *   - add(i, v)：i += lowbit(i) 一路向上，c[i] += v
 *   - prefix(i)：i -= lowbit(i) 一路向下，累加 c[i] 得到 a[1..i] 的和
 *   - rangeSum(l, r) = prefix(r) - prefix(l - 1)
 */

export type Op =
  | { kind: "add"; i: number; v: number }
  | { kind: "prefix"; i: number }
  | { kind: "range"; l: number; r: number }
  | { kind: "lowbit"; i: number }

export type Step = {
  index: number
  opIndex: number
  op: Op
  /** 当前访问的 c 下标（可能有多个，用于高亮） */
  active: number[]
  c: number[]
  a: number[]
  /** 累加器 / 新值 */
  acc: number | null
  /** 说明当前是哪一段：加 / 减 / 累加 */
  mode: "up" | "down" | "read" | "lowbit" | "done"
  result: number | null
  describe: string
  codeLines: number[]
}

export type SimResult = { n: number; initialA: number[]; initialC: number[]; ops: Op[]; steps: Step[]; results: number[] }

export const CODE = [
  "int lowbit(int x) { return x & -x; }",
  "",
  "void add(int i, int v) {",
  "  for (; i <= n; i += lowbit(i))",
  "    c[i] += v;",
  "}",
  "",
  "int prefix(int i) {           // a[1..i] 的和",
  "  int s = 0;",
  "  for (; i > 0; i -= lowbit(i))",
  "    s += c[i];",
  "  return s;",
  "}",
  "",
  "int rangeSum(int l, int r) {  // a[l..r] 的和",
  "  return prefix(r) - prefix(l - 1);",
  "}",
] as const

export function lowbit(x: number) {
  return x & -x
}

export function buildTree(a1: number[]): number[] {
  const n = a1.length
  const c = new Array<number>(n + 1).fill(0)
  a1.forEach((v, k) => {
    for (let i = k + 1; i <= n; i += lowbit(i)) c[i] += v
  })
  return c
}

/** c[i] 管辖的区间（1-based，闭区间） */
export function managedRange(i: number): [number, number] {
  return [i - lowbit(i) + 1, i]
}

export function simulate(a1: number[], ops: Op[]): SimResult {
  const n = a1.length
  const a = [0, ...a1]
  const c = buildTree(a1)
  const initialC = [...c]
  const steps: Step[] = []
  const results: number[] = []

  const push = (s: Omit<Step, "index" | "a" | "c">) =>
    steps.push({ ...s, index: steps.length, a: [...a], c: [...c] })

  /** 向上更新：i += lowbit(i)，途经节点全部 c[i] += v */
  const walkUp = (oi: number, op: Op, from: number, v: number) => {
    const visited: number[] = []
    for (let i = from; i <= n; i += lowbit(i)) {
      c[i] += v
      visited.push(i)
      push({
        opIndex: oi,
        op,
        active: [i],
        acc: c[i],
        mode: "up",
        result: null,
        describe: `c[${i}] ${v >= 0 ? "+=" : "-="} ${Math.abs(v)} → ${c[i]}（管辖 a[${managedRange(i).join("..")}]），随后 i += lowbit(${i}) = ${lowbit(i)}，跳到 ${i + lowbit(i)}。`,
        codeLines: [4, 5],
      })
    }
    push({
      opIndex: oi,
      op,
      active: visited,
      acc: null,
      mode: "done",
      result: null,
      describe: `更新完成：共修改 ${visited.length} 个节点（≈ log₂ n），复杂度 O(log n)。`,
      codeLines: [3, 4, 5],
    })
  }

  /** 向下查询：i -= lowbit(i)，把途经的 c[i] 累加 */
  const walkDown = (oi: number, op: Op, from: number, title: string) => {
    let acc = 0
    const visited: number[] = []
    if (from > 0) {
      for (let i = from; i > 0; i -= lowbit(i)) {
        acc += c[i]
        visited.push(i)
        push({
          opIndex: oi,
          op,
          active: [i],
          acc,
          mode: "down",
          result: null,
          describe: `累加 c[${i}] = ${c[i]}（管辖 a[${managedRange(i).join("..")}]），${title} 当前为 ${acc}；随后 i -= lowbit(${i}) = ${lowbit(i)}，跳到 ${i - lowbit(i)}。`,
          codeLines: [9, 10],
        })
      }
    }
    push({
      opIndex: oi,
      op,
      active: visited,
      acc,
      mode: "done",
      result: acc,
      describe: `${title} = ${acc}：只访问了 ${visited.length} 个节点，复杂度 O(log n)。`,
      codeLines: [8, 9, 10, 11],
    })
    return acc
  }

  for (let oi = 0; oi < ops.length; oi++) {
    const op = ops[oi]
    if (op.kind === "add") {
      a[op.i] += op.v
      push({
        opIndex: oi,
        op,
        active: [],
        acc: a[op.i],
        mode: "read",
        result: null,
        describe: `a[${op.i}] ${op.v >= 0 ? "+=" : "-="} ${Math.abs(op.v)} → ${a[op.i]}。单个元素的变化需要同步到所有管辖它的 c[i]。`,
        codeLines: [2, 3],
      })
      walkUp(oi, op, op.i, op.v)
    } else if (op.kind === "lowbit") {
      const lb = lowbit(op.i)
      push({
        opIndex: oi,
        op,
        active: [op.i],
        acc: lb,
        mode: "lowbit",
        result: lb,
        describe: `lowbit(${op.i})：${op.i} 的二进制为 ${op.i.toString(2)}，最低位 1 与其后的 0 组成 ${lb}。c[${op.i}] 管辖 a[${managedRange(op.i).join("..")}]。`,
        codeLines: [0],
      })
      results.push(lb)
    } else if (op.kind === "prefix") {
      results.push(walkDown(oi, op, op.i, `prefix(${op.i})`))
    } else {
      push({
        opIndex: oi,
        op,
        active: [],
        acc: null,
        mode: "down",
        result: null,
        describe: `区间和 sum(${op.l}..${op.r}) = prefix(${op.r}) − prefix(${op.l - 1})，先算 prefix(${op.r})。`,
        codeLines: [15],
      })
      const sr = walkDown(oi, op, op.r, `prefix(${op.r})`)
      push({
        opIndex: oi,
        op,
        active: [],
        acc: sr,
        mode: "done",
        result: null,
        describe: `prefix(${op.r}) = ${sr}。接下来算 prefix(${op.l - 1}) 并相减。`,
        codeLines: [15],
      })
      const sl = op.l - 1 === 0 ? 0 : walkDown(oi, op, op.l - 1, `prefix(${op.l - 1})`)
      const res = sr - sl
      results.push(res)
      push({
        opIndex: oi,
        op,
        active: [],
        acc: res,
        mode: "done",
        result: res,
        describe: `sum(${op.l}..${op.r}) = ${sr} − ${sl} = ${res}。`,
        codeLines: [15],
      })
    }
  }

  return { n, initialA: a, initialC, ops, steps, results }
}

export type Preset = { name: string; a: number[]; ops: Op[] }

export const PRESETS: Preset[] = [
  {
    name: "入门示例",
    a: [3, 1, 4, 1, 5, 9],
    ops: [
      { kind: "add", i: 3, v: 6 },
      { kind: "prefix", i: 6 },
      { kind: "range", l: 2, r: 5 },
    ],
  },
  {
    name: "8 个元素",
    a: [1, 2, 3, 4, 5, 6, 7, 8],
    ops: [
      { kind: "add", i: 5, v: 10 },
      { kind: "prefix", i: 7 },
      { kind: "range", l: 4, r: 8 },
      { kind: "lowbit", i: 12 },
    ],
  },
  {
    name: "单点查询",
    a: [7, 2, 8, 3],
    ops: [
      { kind: "add", i: 1, v: -4 },
      { kind: "range", l: 1, r: 1 },
      { kind: "prefix", i: 4 },
    ],
  },
]
