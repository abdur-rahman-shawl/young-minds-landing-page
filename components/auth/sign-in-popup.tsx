"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { signIn, useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { FcGoogle } from "react-icons/fc"
import { Users, GraduationCap } from "lucide-react"

interface SignInPopupProps {
  isOpen: boolean
  onClose: () => void
  callbackUrl?: string
}

export function SignInPopup({ isOpen, onClose, callbackUrl = "/dashboard" }: SignInPopupProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()

  // Close popup if user is already signed in (using useEffect to avoid render-time state updates)
  useEffect(() => {
    if (session?.user && isOpen) {
      onClose()
    }
  }, [session?.user, isOpen, onClose])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
        prompt: "select_account" // Forces account selection
      })
    } catch (error) {
      console.error("Sign in error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBecomeExpert = () => {
    onClose()
    router.push("/become-expert")
  }

  // Don't render if user is already signed in
  if (session?.user) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Welcome to Sharing Minds
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Default User Sign In */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Join as User
              </CardTitle>
              <CardDescription>
                Learn from experts and grow your skills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
              >
                <FcGoogle className="h-5 w-5" />
                {isLoading ? "Signing in..." : "Continue with Google"}
              </Button>
            </CardContent>
          </Card>

          {/* Become an Expert */}
          <Card className="border border-gray-200 hover:border-green-300 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-green-600" />
                Become an Expert
              </CardTitle>
              <CardDescription>
                Share your expertise and help others grow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleBecomeExpert}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Apply as Expert
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center pt-4">
          <p className="text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
} 