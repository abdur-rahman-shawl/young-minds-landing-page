import { Suspense } from 'react'
import SignInForm from '@/components/auth/sign-in-form'
import AuthHeader from '@/components/auth/AuthHeader'

export default function AuthPage() {
  return (
    <>
      <AuthHeader />
      <Suspense fallback={<div>Loading...</div>}>
        <SignInForm />
      </Suspense>
    </>
  )
}
