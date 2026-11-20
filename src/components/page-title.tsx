import { useEffect } from "react"
import { useLocation } from "react-router"

import { getAlgorithm } from "@/lib/algorithms"

export const SITE_TITLE = "算法演示 · Algo Lab"

/** 根据当前路由设置浏览器标签页标题 */
export function usePageTitle() {
  const { pathname } = useLocation()

  useEffect(() => {
    const algoMatch = /^\/algo\/([^/]+)\/?$/.exec(pathname)
    const algo = getAlgorithm(algoMatch?.[1])
    let title: string
    if (algo) {
      title = `${algo.title} · ${SITE_TITLE}`
    } else if (pathname === "/learning-tree") {
      title = `算法学习树 · ${SITE_TITLE}`
    } else if (pathname === "/") {
      title = SITE_TITLE
    } else {
      title = `页面不存在 · ${SITE_TITLE}`
    }
    document.title = title
  }, [pathname])
}
