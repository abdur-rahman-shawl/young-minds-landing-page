"use client"

import SignInForm from '@/components/auth/sign-in-form'
import AuthHeader from '@/components/auth/AuthHeader'

export default function AuthPageClient() {
  return (
    <>
      <AuthHeader />
      <SignInForm />
    </>
  )
}
