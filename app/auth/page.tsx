import { Suspense } from 'react'
import AuthPageClient from './AuthPageClient'

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthPageClient />
    </Suspense>
  )
}