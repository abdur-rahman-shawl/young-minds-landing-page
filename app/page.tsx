import { Suspense } from "react"
import { PageContent } from "@/components/PageContent"

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageContent />
    </Suspense>
  )
}
