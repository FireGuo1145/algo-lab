/**
 * 扫描线求矩形面积并 —— 核心模拟引擎
 *
 * 思路：
 * 1. 把一个矩形拆成两条竖边（左边界 +1，右边界 -1），四条竖直坐标去重排序。
 * 2. 扫描线沿 x 轴从左向右移动，相邻 x 之间形成一个“条带”。
 * 3. 用线段树维护 y 轴上被覆盖的总长度（cover 计数 + len），
 *    每次处理事件后即可 O(1) 得知当前条带内被覆盖的 y 长度。
 * 4. 面积 += 覆盖长度 × 条带宽度。
 *
 * 这里记录每一步的快照，供前端动画逐步回放。
 */

export type Rect = {
  id: number
  x1: number
  y1: number
  x2: number
  y2: number
}

export type EdgeEvent = {
  x: number
  y1: number
  y2: number
  delta: 1 | -1
  rectId: number
  /** 在排序后的事件序列中的位置 */
  order: number
}

export type SegmentNode = {
  /** 节点在树数组中的下标 */
  index: number
  l: number
  r: number
  /** 节点代表的 y 区间 [ys[l], ys[r + 1]] */
  yLow: number
  yHigh: number
  cover: number
  len: number
  /** 本次更新是否访问了该节点 */
  touched: boolean
  children: [number, number] | null
}

export type Step = {
  index: number
  /** 第一条事件前的初始状态 */
  kind: "init" | "update"
  /** 正在处理的事件（同一 x 坐标上的全部边） */
  eventsAtX: EdgeEvent[]
  events: EdgeEvent[]
  edgesProcessed: number
  /** 当前扫描线 x 坐标 */
  sweepX: number
  /** 当前条带 [sweepX, nextX]，最后一个事件之后为 null */
  nextX: number | null
  coveredLength: number
  /** 当前条带贡献的面积（回放时累加到 totalArea 之前） */
  areaBefore: number
  stripArea: number
  totalArea: number
  tree: SegmentNode[]
  describe: string
}

export type CoverageInterval = { y1: number; y2: number }

export type SimResult = {
  rects: Rect[]
  ys: number[]
  events: EdgeEvent[]
  /** 排序去重后所有事件 x 坐标 */
  xs: number[]
  steps: Step[]
  totalArea: number
  /** 暴力法结果，用于校验 */
  bruteArea: number
}

const EPS = 1e-9

function almostEqual(a: number, b: number) {
  return Math.abs(a - b) < EPS
}

export function rectToEdges(rects: Rect[]): { rects: Rect[]; events: EdgeEvent[] } {
  const cleaned: Rect[] = []
  for (const r of rects) {
    const x1 = Math.min(r.x1, r.x2)
    const x2 = Math.max(r.x1, r.x2)
    const y1 = Math.min(r.y1, r.y2)
    const y2 = Math.max(r.y1, r.y2)
    if (x2 - x1 < EPS || y2 - y1 < EPS) continue
    cleaned.push({ id: r.id, x1, y1, x2, y2 })
  }

  const events: EdgeEvent[] = []
  for (const r of cleaned) {
    events.push({ x: r.x1, y1: r.y1, y2: r.y2, delta: 1, rectId: r.id, order: 0 })
    events.push({ x: r.x2, y1: r.y1, y2: r.y2, delta: -1, rectId: r.id, order: 0 })
  }

  // 排序：x 从小到大；同 x 时先处理 +1 再处理 -1（避免中间态出现负覆盖，利于理解）
  events.sort((a, b) => {
    if (!almostEqual(a.x, b.x)) return a.x - b.x
    if (a.delta !== b.delta) return b.delta - a.delta
    if (!almostEqual(a.y1, b.y1)) return a.y1 - b.y1
    return a.y2 - b.y2
  })
  events.forEach((e, i) => (e.order = i))

  return { rects: cleaned, events }
}

export function simulate(input: Rect[]): SimResult {
  const { rects, events } = rectToEdges(input)

  const ysRaw: number[] = []
  for (const r of rects) ysRaw.push(r.y1, r.y2)
  const ys = Array.from(new Set(ysRaw.map((v) => normalize(v)))).sort((a, b) => a - b)
  const indexOfY = new Map<number, number>()
  ys.forEach((v, i) => indexOfY.set(v, i))

  const m = ys.length - 1 // 叶子数量
  const treeSize = Math.max(1, 4 * m)
  const cover = new Array<number>(treeSize).fill(0)
  const len = new Array<number>(treeSize).fill(0)

  const buildNodes = (touched: Set<number>): SegmentNode[] => {
    const nodes: SegmentNode[] = []
    const walk = (i: number, l: number, r: number) => {
      nodes.push({
        index: i,
        l,
        r,
        yLow: ys[l],
        yHigh: ys[r + 1],
        cover: cover[i],
        len: len[i],
        touched: touched.has(i),
        children: l < r ? [i * 2, i * 2 + 1] : null,
      })
      if (l < r) {
        const mid = Math.floor((l + r) / 2)
        walk(i * 2, l, mid)
        walk(i * 2 + 1, mid + 1, r)
      }
    }
    if (m > 0) walk(1, 0, m - 1)
    return nodes
  }

  const pull = (i: number, l: number, r: number) => {
    if (cover[i] > 0) {
      len[i] = ys[r + 1] - ys[l]
    } else if (l === r) {
      len[i] = 0
    } else {
      len[i] = len[i * 2] + len[i * 2 + 1]
    }
  }

  const steps: Step[] = []
  let sweepX = events.length ? events[0].x : 0
  let totalArea = 0
  let coveredLength = 0

  const snapshot = (
    kind: Step["kind"],
    eventsAtX: EdgeEvent[],
    nextX: number | null,
    touched: Set<number>,
    describe: string,
    stripArea: number,
    areaBefore: number
  ) => {
    steps.push({
      index: steps.length,
      kind,
      eventsAtX,
      events,
      edgesProcessed: eventsAtX.length ? eventsAtX[eventsAtX.length - 1].order + 1 : 0,
      sweepX,
      nextX,
      coveredLength,
      areaBefore,
      stripArea,
      totalArea,
      tree: buildNodes(touched),
      describe,
    })
  }

  snapshot("init", [], xsNext(events, 0), new Set(), "初始状态：扫描线位于最左侧，尚未加入任何边。", 0, 0)

  let i = 0
  while (i < events.length) {
    const x = events[i].x
    sweepX = x
    const passTouched = new Set<number>()
    let j = i
    // 本次处理的所有边（同一 x 可能有多条）
    const passEvents: EdgeEvent[] = []
    while (j < events.length && almostEqual(events[j].x, x)) {
      const ev = events[j]
      passEvents.push(ev)
      const lIdx = indexOfY.get(normalize(ev.y1))!
      const rIdx = indexOfY.get(normalize(ev.y2))! - 1

      const update = (node: number, l: number, r: number) => {
        passTouched.add(node)
        if (lIdx <= l && r <= rIdx) {
          cover[node] += ev.delta
          pull(node, l, r)
          return
        }
        const mid = Math.floor((l + r) / 2)
        if (lIdx <= mid) update(node * 2, l, mid)
        if (rIdx > mid) update(node * 2 + 1, mid + 1, r)
        pull(node, l, r)
      }
      if (m > 0) update(1, 0, m - 1)
      j++
    }

    coveredLength = m > 0 ? len[1] : 0
    const next = xsNext(events, j)
    const width = next === null ? 0 : next - x
    const areaBefore = totalArea
    const stripArea = coveredLength * width

    const edgeText = passEvents
      .map((e) => `${e.delta === 1 ? "入边 +1" : "出边 −1"}（矩形 ${e.rectId + 1}）`)
      .join("，")

    const describe =
      next === null
        ? `处理 x = ${fmt(x)} 处的边：${edgeText}。右侧已没有边，累计面积 ${fmt(totalArea)}。`
        : `处理 x = ${fmt(x)} 处的边：${edgeText}。覆盖总长 ${fmt(coveredLength)}，条带宽 ${fmt(width)}，本段面积 = ${fmt(coveredLength)} × ${fmt(width)} = ${fmt(stripArea)}。`

    totalArea += stripArea
    snapshot("update", passEvents, next, passTouched, describe, stripArea, areaBefore)
    i = j
  }

  return {
    rects,
    ys,
    events,
    xs: Array.from(new Set(events.map((e) => normalize(e.x)))).sort((a, b) => a - b),
    steps,
    totalArea,
    bruteArea: bruteForceArea(rects),
  }
}

function normalize(v: number) {
  // 消除浮点误差造成的重复 y 坐标（保留 6 位小数）
  return Math.round(v * 1e6) / 1e6
}

function fmt(v: number) {
  return String(Math.round(v * 100) / 100)
}

function xsNext(events: EdgeEvent[], from: number): number | null {
  if (from >= events.length) return null
  return events[from].x
}

/** 暴力法：在离散化网格上求面积并，用于验证扫描线结果 */
export function bruteForceArea(rects: Rect[]): number {
  if (rects.length === 0) return 0
  const xs = Array.from(new Set(rects.flatMap((r) => [r.x1, r.x2]))).sort((a, b) => a - b)
  const ys = Array.from(new Set(rects.flatMap((r) => [r.y1, r.y2]))).sort((a, b) => a - b)
  let area = 0
  for (let i = 0; i + 1 < xs.length; i++) {
    for (let j = 0; j + 1 < ys.length; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2
      const cy = (ys[j] + ys[j + 1]) / 2
      if (rects.some((r) => cx > r.x1 && cx < r.x2 && cy > r.y1 && cy < r.y2)) {
        area += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j])
      }
    }
  }
  return area
}

/** 扫描到某一步时，当前覆盖的 y 区间（用叶子节点的 cover 重构） */
export function coverageIntervals(step: Step): CoverageInterval[] {
  const leaves = step.tree.filter((n) => n.l === n.r)
  const merged: CoverageInterval[] = []
  // 自底向上传播覆盖标记
  const covered = new Array<boolean>(leaves.length).fill(false)
  for (const node of step.tree) {
    if (node.cover > 0) {
      for (let k = node.l; k <= node.r; k++) covered[k] = true
    }
  }
  leaves.forEach((leaf, k) => {
    if (!covered[k]) return
    const y1 = leaf.yLow
    const y2 = leaf.yHigh
    const last = merged[merged.length - 1]
    if (last && almostEqual(last.y2, y1)) last.y2 = y2
    else merged.push({ y1, y2 })
  })
  return merged
}

export const PRESETS: { name: string; rects: Rect[] }[] = [
  {
    name: "经典三矩形",
    rects: [
      { id: 0, x1: 1, y1: 1, x2: 6, y2: 5 },
      { id: 1, x1: 3, y1: 2, x2: 9, y2: 7 },
      { id: 2, x1: 5, y1: 4, x2: 7, y2: 9 },
    ],
  },
  {
    name: "相邻不重叠",
    rects: [
      { id: 0, x1: 1, y1: 1, x2: 3, y2: 4 },
      { id: 1, x1: 3, y1: 1, x2: 5, y2: 4 },
      { id: 2, x1: 5, y1: 1, x2: 7, y2: 4 },
    ],
  },
  {
    name: "十字交叉",
    rects: [
      { id: 0, x1: 1, y1: 4, x2: 9, y2: 6 },
      { id: 1, x1: 4, y1: 1, x2: 6, y2: 9 },
    ],
  },
  {
    name: "阶梯形",
    rects: [
      { id: 0, x1: 1, y1: 1, x2: 4, y2: 3 },
      { id: 1, x1: 3, y1: 3, x2: 6, y2: 5 },
      { id: 2, x1: 5, y1: 5, x2: 8, y2: 7 },
      { id: 3, x1: 2, y1: 5, x2: 5, y2: 8 },
    ],
  },
]

export function randomRects(count: number, size = 10): Rect[] {
  const rects: Rect[] = []
  for (let i = 0; i < count; i++) {
    const x1 = Math.floor(Math.random() * (size - 3)) + 1
    const y1 = Math.floor(Math.random() * (size - 3)) + 1
    const w = Math.floor(Math.random() * 4) + 2
    const h = Math.floor(Math.random() * 4) + 2
    rects.push({ id: i, x1, y1, x2: Math.min(size, x1 + w), y2: Math.min(size, y1 + h) })
  }
  return rects
}
