import { useEffect } from "react"
import { Link, useLocation } from "react-router"
import { Combine } from "lucide-react"

import { RepoLink } from "@/components/repo-link"
import { ThemeToggle } from "@/components/theme-toggle"

export function SiteHeader() {
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-5">
        <Link to="/" aria-label="Algo Lab 首页" className="group flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background transition-transform group-hover:-rotate-12">
            <Combine className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            <span className="hidden sm:inline">算法演示<span className="text-muted-foreground"> · Algo Lab</span></span>
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            to="/"
            className={
              "rounded-xl px-2.5 py-1 text-sm transition-colors hover:text-foreground " +
              (pathname === "/" ? "text-foreground" : "text-muted-foreground")
            }
          >
            算法列表
          </Link>
          <Link
            to="/learning-tree"
            aria-current={pathname === "/learning-tree" ? "page" : undefined}
            className={"rounded-xl px-2.5 py-1 text-sm whitespace-nowrap transition-colors hover:text-foreground " + (pathname === "/learning-tree" ? "text-foreground" : "text-muted-foreground")}
          >
            学习树
          </Link>
          <div className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
          <RepoLink />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-5 text-xs text-muted-foreground">
        <span>用可视化理解算法 —— Algo Lab</span>
        <span className="font-mono">按 D 键切换深色 / 浅色模式</span>
      </div>
    </footer>
  )
}

export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}
