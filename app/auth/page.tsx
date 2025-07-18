"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { signIn, useSession } from "@/lib/auth-client"
import { useRouter, useSearchParams } from "next/navigation"
import { FcGoogle } from "react-icons/fc"
import { GraduationCap, Users, UserCheck } from "lucide-react"

type UserRole = "mentee" | "mentor"

export default function AuthPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("mentee")
  const [showMentorForm, setShowMentorForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mentorFormData, setMentorFormData] = useState({
    title: "",
    company: "",
    industry: "",
    experience: "",
    expertise: "",
    about: "",
    linkedinUrl: "",
  })

  const { data: session, isPending } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = searchParams.get("role") as UserRole

  useEffect(() => {
    if (roleParam && (roleParam === "mentee" || roleParam === "mentor")) {
      setSelectedRole(roleParam)
      if (roleParam === "mentor") {
        setShowMentorForm(true)
      }
    }
  }, [roleParam])

  useEffect(() => {
    if (session?.user && !showMentorForm) {
      // For mentees, redirect to existing dashboard
      router.push("/dashboard")
    }
  }, [session, showMentorForm, router])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn.social({
        provider: "google",
        callbackURL: selectedRole === "mentor" 
          ? "/auth?role=mentor&step=form" 
          : "/dashboard"
      })
    } catch (error) {
      console.error("Sign in error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMentorFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      if (!session?.user?.id) {
        alert('Please log in before submitting the form')
        setIsLoading(false)
        return
      }

      const mentorPayload = {
        userId: session.user.id,
        title: mentorFormData.title,
        company: mentorFormData.company,
        industry: mentorFormData.industry,
        expertise: mentorFormData.expertise,
        experience: Number(mentorFormData.experience) || 0,
        hourlyRate: '50.00',
        currency: 'USD',
        headline: `${mentorFormData.title} at ${mentorFormData.company}`,
        about: mentorFormData.about,
        linkedinUrl: mentorFormData.linkedinUrl,
        githubUrl: '',
        websiteUrl: '',
        isAvailable: true
      }

      console.log('🚀 Mentor application payload:', mentorPayload)

      const res = await fetch('/api/mentors/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(mentorPayload)
      })

      const result = await res.json()
      console.log('📡 Mentor application API response:', result)

      if (!result.success) {
        alert('Failed to submit application: ' + result.error)
        setIsLoading(false)
        return
      }

      // Redirect to verification page
      router.push('/auth/mentor-verification')
    } catch (error) {
      console.error('Mentor form submission error:', error)
      alert('Something went wrong while submitting your application.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show mentor form if user is logged in and wants to be a mentor
  if (session?.user && showMentorForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-blue-600" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Become a Mentor
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Help shape the next generation by sharing your expertise
            </p>
            <Badge variant="outline" className="mt-2">
              Signed in as {session.user.email}
            </Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Mentor Application</CardTitle>
              <CardDescription>
                Tell us about your professional background and expertise
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMentorFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Job Title *</Label>
                    <Input
                      id="title"
                      required
                      value={mentorFormData.title}
                      onChange={(e) => setMentorFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Senior Software Engineer"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company *</Label>
                    <Input
                      id="company"
                      required
                      value={mentorFormData.company}
                      onChange={(e) => setMentorFormData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="e.g., Google, Microsoft"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="industry">Industry *</Label>
                    <Input
                      id="industry"
                      required
                      value={mentorFormData.industry}
                      onChange={(e) => setMentorFormData(prev => ({ ...prev, industry: e.target.value }))}
                      placeholder="e.g., Technology, Finance"
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience">Years of Experience *</Label>
                    <Input
                      id="experience"
                      type="number"
                      required
                      value={mentorFormData.experience}
                      onChange={(e) => setMentorFormData(prev => ({ ...prev, experience: e.target.value }))}
                      placeholder="e.g., 5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="expertise">Areas of Expertise *</Label>
                  <Input
                    id="expertise"
                    required
                    value={mentorFormData.expertise}
                    onChange={(e) => setMentorFormData(prev => ({ ...prev, expertise: e.target.value }))}
                    placeholder="e.g., React, Node.js, Product Management (comma separated)"
                  />
                </div>

                <div>
                  <Label htmlFor="about">About You *</Label>
                  <Textarea
                    id="about"
                    required
                    rows={4}
                    value={mentorFormData.about}
                    onChange={(e) => setMentorFormData(prev => ({ ...prev, about: e.target.value }))}
                    placeholder="Tell us about your experience, achievements, and what you're passionate about teaching..."
                  />
                </div>

                <div>
                  <Label htmlFor="linkedinUrl">LinkedIn Profile (Optional)</Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    value={mentorFormData.linkedinUrl}
                    onChange={(e) => setMentorFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? "Submitting Application..." : "Submit Application"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to Young Minds
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Choose how you want to join our community
          </p>
        </div>

        <div className="space-y-4">
          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Card 
              className={`cursor-pointer transition-all ${
                selectedRole === "mentee" 
                  ? "ring-2 ring-blue-600 bg-blue-50" 
                  : "hover:bg-gray-50"
              }`}
              onClick={() => setSelectedRole("mentee")}
            >
              <CardContent className="p-4 text-center">
                <Users className="mx-auto h-8 w-8 mb-2 text-blue-600" />
                <h3 className="font-semibold">Join as Mentee</h3>
                <p className="text-sm text-gray-600">Learn from experts</p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${
                selectedRole === "mentor" 
                  ? "ring-2 ring-green-600 bg-green-50" 
                  : "hover:bg-gray-50"
              }`}
              onClick={() => {
                setSelectedRole("mentor")
                setShowMentorForm(true)
              }}
            >
              <CardContent className="p-4 text-center">
                <GraduationCap className="mx-auto h-8 w-8 mb-2 text-green-600" />
                <h3 className="font-semibold">Become a Mentor</h3>
                <p className="text-sm text-gray-600">Share your expertise</p>
              </CardContent>
            </Card>
          </div>

          {/* Google Sign In */}
          <Card>
            <CardContent className="p-6">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading || isPending}
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
              >
                <FcGoogle className="h-5 w-5" />
                {isLoading || isPending 
                  ? "Signing in..." 
                  : `Continue with Google as ${selectedRole === "mentee" ? "Mentee" : "Mentor"}`
                }
              </Button>
              
              {selectedRole === "mentor" && (
                <p className="text-xs text-gray-500 mt-3 text-center">
                  You'll need to fill out an application form after signing in
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
