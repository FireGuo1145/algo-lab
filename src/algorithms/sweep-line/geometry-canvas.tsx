import { useMemo } from "react"

import type { Rect, Step } from "./engine"
import { coverageIntervals } from "./engine"

const W = 560
const H = 420
const PAD = { left: 44, right: 24, top: 24, bottom: 32 }

const RECT_COLORS = [
  "rgba(56, 189, 248,", // sky
  "rgba(167, 139, 250,", // violet
  "rgba(52, 211, 153,", // emerald
  "rgba(251, 191, 36,", // amber
  "rgba(251, 113, 133,", // rose
  "rgba(34, 211, 238,", // cyan
  "rgba(244, 114, 182,", // pink
  "rgba(163, 230, 53,", // lime
]

export function rectColor(id: number) {
  return RECT_COLORS[id % RECT_COLORS.length]
}

export function GeometryCanvas({
  rects,
  step,
  maxArea,
  selectedRect,
  onSelectRect,
}: {
  rects: Rect[]
  step: Step | null
  /** 当前累计面积对应的"已扫过"宽度比例参考，用于给面积填充染色 */
  maxArea: number
  selectedRect: number | null
  onSelectRect: (id: number | null) => void
}) {
  const bounds = useMemo(() => {
    const xs = rects.flatMap((r) => [r.x1, r.x2])
    const ys = rects.flatMap((r) => [r.y1, r.y2])
    const minX = xs.length ? Math.min(...xs) : 0
    const maxX = xs.length ? Math.max(...xs) : 10
    const minY = ys.length ? Math.min(...ys) : 0
    const maxY = ys.length ? Math.max(...ys) : 10
    const padX = Math.max(0.6, (maxX - minX) * 0.06)
    const padY = Math.max(0.6, (maxY - minY) * 0.08)
    return {
      x0: minX - padX,
      x1: maxX + padX,
      y0: minY - padY,
      y1: maxY + padY,
    }
  }, [rects])

  const sx = (x: number) =>
    PAD.left + ((x - bounds.x0) / Math.max(1e-6, bounds.x1 - bounds.x0)) * (W - PAD.left - PAD.right)
  const sy = (y: number) =>
    H - PAD.bottom - ((y - bounds.y0) / Math.max(1e-6, bounds.y1 - bounds.y0)) * (H - PAD.top - PAD.bottom)

  const intervals = step ? coverageIntervals(step) : []
  const bandX0 = step ? sx(step.sweepX) : 0
  const bandX1 = step?.nextX != null ? sx(step.nextX) : 0
  const bands = intervals.map((iv) => ({ y1: sy(iv.y1), y2: sy(iv.y2) }))

  // 为每个矩形计算它“未被覆盖”的轮廓：先描边，再按顺序填充，填充透明度低即可看出重叠层次
  const xTicks = niceTicks(bounds.x0, bounds.x1)
  const yTicks = niceTicks(bounds.y0, bounds.y1)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full text-foreground select-none"
      role="img"
      aria-label="矩形面积并扫描线示意图"
    >
      <defs>
        <pattern id="sl-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
        </pattern>
        <clipPath id="sl-plot">
          <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} />
        </clipPath>
      </defs>

      <rect x={0} y={0} width={W} height={H} fill="url(#sl-grid)" />
      {/* 坐标轴 */}
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="currentColor" strokeOpacity="0.25" />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="currentColor" strokeOpacity="0.25" />
      {xTicks.map((t) => (
        <g key={`tx${t}`}>
          <line x1={sx(t)} y1={H - PAD.bottom} x2={sx(t)} y2={H - PAD.bottom + 4} stroke="currentColor" strokeOpacity="0.35" />
          <text x={sx(t)} y={H - PAD.bottom + 16} textAnchor="middle" className="fill-current text-[10px] opacity-50">
            {t}
          </text>
        </g>
      ))}
      {yTicks.map((t) => (
        <g key={`ty${t}`}>
          <line x1={PAD.left - 4} y1={sy(t)} x2={PAD.left} y2={sy(t)} stroke="currentColor" strokeOpacity="0.35" />
          <text x={PAD.left - 8} y={sy(t) + 3} textAnchor="end" className="fill-current text-[10px] opacity-50">
            {t}
          </text>
        </g>
      ))}

      <g clipPath="url(#sl-plot)">
        {/* 已扫过的区域整体弱化 */}
        {step && (
          <rect
            x={PAD.left}
            y={PAD.top}
            width={Math.max(0, sx(step.sweepX) - PAD.left)}
            height={H - PAD.top - PAD.bottom}
            fill="currentColor"
            fillOpacity="0.04"
          />
        )}

        {/* 矩形 */}
        {rects.map((r) => {
          const active = selectedRect === r.id
          const color = rectColor(r.id)
          const highlighted = step?.eventsAtX.some((e) => e.rectId === r.id) ?? false
          return (
            <g key={r.id} onClick={() => onSelectRect(active ? null : r.id)} className="cursor-pointer">
              <rect
                x={sx(r.x1)}
                y={sy(r.y2)}
                width={Math.max(0, sx(r.x2) - sx(r.x1))}
                height={Math.max(0, sy(r.y1) - sy(r.y2))}
                fill={`${color}${active ? 0.22 : 0.1})`}
                stroke={`${color}${active || highlighted ? 0.95 : 0.6})`}
                strokeWidth={highlighted ? 2 : 1.5}
                className="transition-[fill,stroke] duration-300"
              />
              <text
                x={sx(r.x1) + 6}
                y={sy(r.y2) + 14}
                className="fill-current text-[10px] opacity-60"
                style={{ pointerEvents: "none" }}
              >
                R{r.id + 1}
              </text>
            </g>
          )
        })}

        {/* 条带内被覆盖的 y 区间（面积） */}
        {step && step.nextX !== null && (
          <rect
            x={bandX0}
            y={PAD.top}
            width={Math.max(0, bandX1 - bandX0)}
            height={H - PAD.top - PAD.bottom}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeDasharray="4 4"
          />
        )}
        {step &&
          step.nextX !== null &&
          bands.map((b, i) => (
            <rect
              key={i}
              x={bandX0}
              y={b.y1}
              width={Math.max(0, bandX1 - bandX0)}
              height={Math.max(0, b.y2 - b.y1)}
              fill="var(--color-primary)"
              fillOpacity={maxArea > 0 ? 0.18 : 0.22}
              stroke="currentColor"
              strokeOpacity="0.35"
              strokeWidth={0.75}
            />
          ))}

        {/* 已处理过的边 */}
        {step?.events
          .filter((e) => e.order < (step.edgesProcessed ?? 0))
          .map((e) => (
            <line
              key={`done-${e.order}`}
              x1={sx(e.x)}
              y1={sy(e.y2)}
              x2={sx(e.x)}
              y2={sy(e.y1)}
              stroke={rectColor(e.rectId) + "0.35)"}
              strokeWidth={2.5}
              strokeDasharray={e.delta === -1 ? "3 3" : undefined}
            />
          ))}

        {/* 当前扫描线 */}
        {step && (
          <g>
            <line
              x1={sx(step.sweepX)}
              y1={PAD.top - 8}
              x2={sx(step.sweepX)}
              y2={H - PAD.bottom}
              stroke="var(--color-primary)"
              strokeWidth={2}
            />
            {/* 当前覆盖区间的加粗高亮 */}
            {intervals.map((iv, i) => (
              <line
                key={`cov-${i}`}
                x1={sx(step.sweepX)}
                y1={sy(iv.y1)}
                x2={sx(step.sweepX)}
                y2={sy(iv.y2)}
                stroke="var(--color-primary)"
                strokeWidth={5}
                strokeLinecap="round"
                strokeOpacity={0.55}
              />
            ))}
            <polygon
              points={`${sx(step.sweepX) - 5},${PAD.top - 14} ${sx(step.sweepX) + 5},${PAD.top - 14} ${sx(step.sweepX)},${PAD.top - 6}`}
              fill="var(--color-primary)"
            />
            <text
              x={sx(step.sweepX) + 6}
              y={PAD.top - 16}
              className="fill-current text-[10px] font-medium"
            >
              x = {round(step.sweepX)}
            </text>
          </g>
        )}
      </g>

      {/* 图例 */}
      <g transform={`translate(${PAD.left + 4}, ${H - 10})`}>
        <text className="fill-current text-[10px] opacity-50">点击矩形可选中查看</text>
      </g>
    </svg>
  )
}

function round(v: number) {
  return Math.round(v * 100) / 100
}

function niceTicks(min: number, max: number) {
  const span = max - min
  const step = span > 20 ? 5 : span > 10 ? 2 : 1
  const ticks: number[] = []
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) ticks.push(Math.round(t * 100) / 100)
  return ticks
}
