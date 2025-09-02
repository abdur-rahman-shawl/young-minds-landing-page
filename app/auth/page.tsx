import { Suspense } from 'react'
import SignInForm from '@/components/auth/sign-in-form'

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  )
}
