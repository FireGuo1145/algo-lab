export type Query = { l: number; r: number }
export type Step = {
  l: number; r: number; queryId: number | null; changed: number | null
  counts: [number, number][]; distinct: number; moves: number
  answers: (number | null)[]; describe: string; line: number
}
export const CODE = [
  "B = max(1, floor(sqrt(n)))",
  "sort queries by (l / B, alternating r)",
  "L = 0; R = -1; distinct = 0",
  "add(i): if (++cnt[a[i]] == 1) ++distinct",
  "remove(i): if (--cnt[a[i]] == 0) --distinct",
  "for each query [l, r]:",
  "  while L > l: add(--L)",
  "  while R < r: add(++R)",
  "  while L < l: remove(L++)",
  "  while R > r: remove(R--)",
  "  answer[query.id] = distinct",
] as const

/** 普通莫队：静态数组，0-based 闭区间；奇偶块交替排序 R。 */
export function simulate(a: number[], queries: Query[]) {
  if (!a.length || a.some(v => !Number.isFinite(v))) throw new Error("数组必须非空且只包含有限数字")
  for (const q of queries) if (!Number.isInteger(q.l) || !Number.isInteger(q.r) || q.l < 0 || q.r >= a.length || q.l > q.r) throw new Error("查询区间无效")
  const blockSize = Math.max(1, Math.floor(Math.sqrt(a.length)))
  const sorted = queries.map((q, id) => ({ ...q, id, block: Math.floor(q.l / blockSize) }))
    .sort((x, y) => x.block - y.block || (x.block % 2 ? y.r - x.r : x.r - y.r) || x.id - y.id)
  const counts = new Map([...new Set(a)].sort((x,y) => x-y).map(v => [v, 0]))
  const answers: (number | null)[] = queries.map(() => null)
  const steps: Step[] = []
  let l = 0, r = -1, distinct = 0, moves = 0
  const push = (queryId: number | null, changed: number | null, describe: string, line: number) => {
    steps.push({ l, r, distinct, moves, queryId, changed, describe, line, counts: [...counts], answers: [...answers] })
  }
  push(null, null, `块长 B = ${blockSize}；按左端点所在块排序，偶数块 R 升序、奇数块 R 降序。初始窗口为空 [0, -1]。`, 1)
  for (const q of sorted) {
    push(q.id, null, `处理 Q${q.id + 1}：[${q.l}, ${q.r}]，逐次调整当前窗口。`, 5)
    const change = (i: number, delta: number, line: number, pointer: string) => {
      const before = counts.get(a[i])!
      counts.set(a[i], before + delta)
      if (before === 0 && delta === 1) distinct++
      if (before === 1 && delta === -1) distinct--
      moves++
      push(q.id, i, `${pointer}：${delta === 1 ? "加入" : "移除"} a[${i}] = ${a[i]}，频次 ${before} → ${before + delta}，不同数字个数 = ${distinct}。`, line)
    }
    // 先扩张，再收缩，保证移除的元素一定存在于窗口内。
    while (l > q.l) change(--l, 1, 6, "L 左移")
    while (r < q.r) change(++r, 1, 7, "R 右移")
    while (l < q.l) { const i = l++; change(i, -1, 8, "L 右移") }
    while (r > q.r) { const i = r--; change(i, -1, 9, "R 左移") }
    answers[q.id] = distinct
    push(q.id, null, `窗口已对齐：Q${q.id + 1} 的答案为 ${distinct}，写回原始查询顺序。`, 10)
  }
  return { blockSize, sorted, steps, answers }
}

export const PRESETS = [
  { name: "重复数字", a: [1,2,1,3,2,4,1,3,5,2,4,5], queries: [{l:6,r:10},{l:0,r:4},{l:3,r:8},{l:1,r:6},{l:8,r:11}] },
  { name: "单点与全区间", a: [2,2,1,3,1,2,4,4], queries: [{l:7,r:7},{l:0,r:7},{l:2,r:2},{l:0,r:1}] },
  { name: "全部相同", a: [7,7,7,7,7,7,7,7], queries: [{l:4,r:7},{l:0,r:2},{l:1,r:6}] },
]
