"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter, useSearchParams } from "next/navigation"
import { FcGoogle } from "react-icons/fc"
import { GraduationCap, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

type UserRole = "mentee" | "mentor"

export default function SignInForm() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("mentee")
  const [isLoading, setIsLoading] = useState(false)

  const { isAuthenticated, isLoading: authLoading, signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = searchParams.get("role") as UserRole
  const callbackUrlParam = searchParams.get('callbackUrl') || '/'

  useEffect(() => {
    if (roleParam && (roleParam === "mentee" || roleParam === "mentor")) {
      setSelectedRole(roleParam)
    }
  }, [roleParam])

  useEffect(() => {
    // If user is already logged in and is a mentee, go to intended page or root
    if (isAuthenticated && selectedRole === 'mentee') {
      router.replace(callbackUrlParam)
      router.refresh()
    }
  }, [isAuthenticated, selectedRole, router, callbackUrlParam])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn('social', {
        provider: 'google',
        callbackURL: selectedRole === 'mentor' ? '/become-expert' : callbackUrlParam,
      })
      if (selectedRole === 'mentor') {
        router.replace('/become-expert')
      } else {
        router.replace(callbackUrlParam)
      }
      router.refresh()
    } catch (error) {
      console.error("Sign in error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Welcome to Sharing Minds
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Choose how you want to join our community
          </p>
        </div>

        <div className="space-y-4">
          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Card 
              className={`cursor-pointer transition-all ${selectedRole === "mentee" 
                  ? "ring-2 ring-blue-600 bg-blue-50 dark:bg-blue-900/30" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800/50"
              }`}
              onClick={() => setSelectedRole("mentee")}
            >
              <CardContent className="p-4 text-center">
                <Users className="mx-auto h-8 w-8 mb-2 text-blue-600" />
                <h3 className="font-semibold">Join as Mentee</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Learn from experts</p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${selectedRole === "mentor" 
                  ? "ring-2 ring-green-600 bg-green-50 dark:bg-green-900/30" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800/50"
              }`}
              onClick={() => setSelectedRole("mentor")}
            >
              <CardContent className="p-4 text-center">
                <GraduationCap className="mx-auto h-8 w-8 mb-2 text-green-600" />
                <h3 className="font-semibold">Become a Mentor</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Share your expertise</p>
              </CardContent>
            </Card>
          </div>

          {/* Google Sign In */}
          <Card>
            <CardContent className="p-6">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading || authLoading}
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
              >
                <FcGoogle className="h-5 w-5" />
                {isLoading || authLoading 
                  ? "Redirecting..." 
                  : `Continue with Google as ${selectedRole === "mentee" ? "Mentee" : "Mentor"}`
                }
              </Button>
            </CardContent>
          </Card>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <Button
                onClick={() => router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrlParam)}`)}
                disabled={isLoading || authLoading}
                className="w-full"
              >
                Continue with Email
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
