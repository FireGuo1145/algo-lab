import { Link, useLocation } from "react-router"

export default function NotFoundPage() {
  const { pathname } = useLocation()
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-6xl flex-col items-center justify-center px-5 text-center">
      <p className="font-mono text-6xl font-semibold text-muted-foreground/30">404</p>
      <p className="mt-3 text-sm text-muted-foreground">
        找不到页面 <span className="font-mono text-foreground">{pathname}</span>
      </p>
      <Link
        to="/"
        className="mt-5 inline-flex h-8 items-center rounded-2xl bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
      >
        返回算法列表
      </Link>
    </div>
  )
}
