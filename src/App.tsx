import { Route, Routes } from "react-router"

import { ScrollToTop, SiteFooter, SiteHeader } from "@/components/layout"
import { usePageTitle } from "@/components/page-title"
import AlgoDetailPage from "@/pages/algo-detail"
import HomePage from "@/pages/home"
import LearningTreePage from "@/pages/learning-tree"
import NotFoundPage from "@/pages/not-found"

export function App() {
  usePageTitle()

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <ScrollToTop />
      <SiteHeader />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/learning-tree" element={<LearningTreePage />} />
          <Route path="/algo/:slug" element={<AlgoDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  )
}

export default App
