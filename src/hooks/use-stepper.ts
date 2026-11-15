import { useEffect, useState } from "react"

type Options = {
  /** 总步数（含第 0 步） */
  count: number
  /** 每步停留时长（毫秒） */
  interval: number
  /** 到达结尾时要执行的动作（通常是停止播放） */
  onFinish?: () => void
}

/**
 * 动画步进器：负责当前步、播放状态与自动推进。
 * - 自动推进用 setTimeout 放在 effect 里，到结尾时通过 onFinish 通知外部停止；
 * - 外部数据变化时由调用方 reset() 重置。
 */
export function useStepper({ count, interval, onFinish }: Options) {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const last = Math.max(0, count - 1)
  const atEnd = step >= last

  useEffect(() => {
    if (!playing || step >= last) return
    const timer = setTimeout(() => {
      setStep((s) => Math.min(s + 1, last))
    }, interval)
    return () => clearTimeout(timer)
  }, [playing, step, interval, last])

  // 到达结尾时自动停止播放
  useEffect(() => {
    if (playing && step >= last) onFinish?.()
  }, [playing, step, last, onFinish])

  return {
    step: Math.min(step, last),
    last,
    atEnd,
    playing,
    setStep,
    setPlaying,
    play: () => {
      if (step >= last) setStep(0)
      setPlaying(true)
    },
    pause: () => setPlaying(false),
    toggle: () => {
      if (playing) {
        setPlaying(false)
      } else {
        if (step >= last) setStep(0)
        setPlaying(true)
      }
    },
    next: () => {
      setPlaying(false)
      setStep((s) => Math.min(s + 1, last))
    },
    prev: () => {
      setPlaying(false)
      setStep((s) => Math.max(s - 1, 0))
    },
    first: () => {
      setPlaying(false)
      setStep(0)
    },
    end: () => {
      setPlaying(false)
      setStep(last)
    },
    reset: () => {
      setPlaying(false)
      setStep(0)
    },
  }
}

/** 监听方向键 / 空格控制步进（输入框内不响应） */
export function useStepKeys(stepper: { next: () => void; prev: () => void; toggle: () => void }) {
  const { next, prev, toggle } = stepper
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target
      if (
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable='true']")
      )
        return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === "ArrowRight") next()
      else if (e.key === "ArrowLeft") prev()
      else if (e.key === " ") {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, prev, toggle])
}
