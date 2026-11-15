import { useParams } from "react-router"

import { getAlgorithm } from "@/lib/algorithms"
import NotFoundPage from "@/pages/not-found"

export default function AlgoDetailPage() {
  const { slug } = useParams()
  const algo = getAlgorithm(slug)

  if (!algo) return <NotFoundPage />

  const Demo = algo.demo
  return <Demo />
}
