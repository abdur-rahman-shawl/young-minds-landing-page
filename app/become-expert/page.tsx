"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { signIn, useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { FcGoogle } from "react-icons/fc"
import { GraduationCap, ArrowLeft, UserCheck } from "lucide-react"

export default function BecomeExpertPage() {
  const [showMentorForm, setShowMentorForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mentorFormData, setMentorFormData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    city: string;
    country: string;
    title: string;
    company: string;
    industry: string;
    experience: string;
    expertise: string;
    about: string;
    linkedinUrl: string;
    profilePicture: File | null;
    termsAccepted: boolean;
    availability: string;
  }>({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    country: "",
    title: "",
    company: "",
    industry: "",
    experience: "",
    expertise: "",
    about: "",
    linkedinUrl: "",
    profilePicture: null,
    termsAccepted: false,
    availability: "",
  })

  const { data: session, isPending } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session?.user && !showMentorForm) {
      setShowMentorForm(true)
    }
  }, [session, showMentorForm])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/become-expert"
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
      if (!mentorFormData.termsAccepted) {
        alert('You must accept the terms and conditions to proceed.')
        setIsLoading(false)
        return
      }
      if (!mentorFormData.profilePicture) {
        alert('Profile picture is required.')
        setIsLoading(false)
        return
      }
      const formData = new FormData();
      formData.append('userId', session.user.id);
      formData.append('fullName', mentorFormData.fullName);
      formData.append('email', mentorFormData.email);
      formData.append('phone', mentorFormData.phone);
      formData.append('city', mentorFormData.city);
      formData.append('country', mentorFormData.country);
      formData.append('title', mentorFormData.title);
      formData.append('company', mentorFormData.company);
      formData.append('industry', mentorFormData.industry);
      formData.append('expertise', mentorFormData.expertise);
      formData.append('experience', mentorFormData.experience);
      formData.append('about', mentorFormData.about);
      formData.append('linkedinUrl', mentorFormData.linkedinUrl);
      formData.append('profilePicture', mentorFormData.profilePicture);
      // Add other fields as needed
      const res = await fetch('/api/mentors/apply', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      const result = await res.json()
      if (!result.success) {
        alert('Failed to submit application: ' + result.error)
        setIsLoading(false)
        return
      }
      router.push('/auth/mentor-verification')
    } catch (error) {
      alert('Something went wrong while submitting your application.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show mentor form if user is logged in
  if (session?.user && showMentorForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="absolute top-8 left-8"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            
            <GraduationCap className="mx-auto h-12 w-12 text-green-600" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Become an Expert
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
              <CardTitle>Expert Application Form</CardTitle>
              <CardDescription>
                Tell us about your professional background and expertise
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMentorFormSubmit} className="space-y-6" encType="multipart/form-data">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="fullName"
                      value={mentorFormData.fullName}
                      onChange={e => setMentorFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Your Name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      value={mentorFormData.email}
                      onChange={e => setMentorFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={mentorFormData.phone}
                      onChange={e => setMentorFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+91-XXXXXXXXXX"
                      pattern="^\+91-\d{10}$"
                      title="Format: +91-XXXXXXXXXX"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="profilePicture">Profile Picture <span className="text-red-500">*</span></Label>
                    <Input
                      id="profilePicture"
                      type="file"
                      accept="image/*"
                      onChange={e => setMentorFormData(prev => ({ ...prev, profilePicture: e.target.files?.[0] || null }))}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                    <Input
                      id="city"
                      value={mentorFormData.city}
                      onChange={e => setMentorFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Your City"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
                    <Input
                      id="country"
                      value={mentorFormData.country}
                      onChange={e => setMentorFormData(prev => ({ ...prev, country: e.target.value }))}
                      placeholder="Your Country"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Current Job Title <span className="text-red-500">*</span></Label>
                    <Input
                      id="title"
                      value={mentorFormData.title}
                      onChange={e => setMentorFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Senior Software Engineer"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Current Company/Organization <span className="text-red-500">*</span></Label>
                    <Input
                      id="company"
                      value={mentorFormData.company}
                      onChange={e => setMentorFormData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Your Company Name"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="industry">Primary Industry <span className="text-red-500">*</span></Label>
                    <select
                      id="industry"
                      className="w-full border rounded px-3 py-2"
                      value={mentorFormData.industry}
                      onChange={e => setMentorFormData(prev => ({ ...prev, industry: e.target.value }))}
                      required
                    >
                      <option value="">Select your industry...</option>
                      <option value="ITSoftware">IT & Software</option>
                      <option value="Marketing">Marketing & Advertising</option>
                      <option value="Finance">Finance & Banking</option>
                      <option value="Education">Education</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Entrepreneurship">Entrepreneurship & Startup</option>
                      <option value="Design">Design (UI/UX, Graphic)</option>
                      <option value="Sales">Sales</option>
                      <option value="HR">Human Resources</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="experience">Years of Professional Experience <span className="text-red-500">*</span></Label>
                    <Input
                      id="experience"
                      type="number"
                      min="2"
                      value={mentorFormData.experience}
                      onChange={e => setMentorFormData(prev => ({ ...prev, experience: e.target.value }))}
                      placeholder="e.g., 5"
                      required
                    />
                    <span className="ml-2 text-xs text-gray-500">Minimum 2 years of experience required to be a mentor.</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="expertise">Areas of Expertise <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="expertise"
                    value={mentorFormData.expertise}
                    onChange={e => setMentorFormData(prev => ({ ...prev, expertise: e.target.value }))}
                    placeholder="List skills you can mentor in (e.g., Python, Digital Marketing, Leadership, Career Transitions)"
                    required
                  />
                  <span className="ml-2 text-xs text-gray-500">Be specific! This helps mentees find you. Use commas to separate multiple areas.</span>
                </div>
                <div>
                  <Label htmlFor="availability">Preferred Mentorship Availability <span className="text-red-500">*</span></Label>
                  <select
                    id="availability"
                    className="w-full border rounded px-3 py-2"
                    value={mentorFormData.availability || ''}
                    onChange={e => setMentorFormData(prev => ({ ...prev, availability: e.target.value }))}
                    required
                  >
                    <option value="">Select...</option>
                    <option value="Weekly">Weekly (e.g., 1 hour/week)</option>
                    <option value="BiWeekly">Bi-weekly (e.g., 1 hour/bi-week)</option>
                    <option value="Monthly">Monthly (e.g., 1 hour/month)</option>
                    <option value="AsNeeded">As needed (flexible)</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="linkedinUrl">LinkedIn Profile URL (Optional)</Label>
                  <Input
                    id="linkedinUrl"
                    type="text"
                    value={mentorFormData.linkedinUrl}
                    onChange={e => setMentorFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    id="termsAccepted"
                    type="checkbox"
                    checked={mentorFormData.termsAccepted}
                    onChange={e => setMentorFormData(prev => ({ ...prev, termsAccepted: e.target.checked }))}
                    required
                    className="mr-2"
                  />
                  <Label htmlFor="termsAccepted" className="mb-0">I agree to the <span className="underline cursor-pointer">Terms and Conditions</span> (placeholder)</Label>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? "Submitting..." : "Register as Mentor"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show sign-in page if user is not logged in
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="absolute top-8 left-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          
          <GraduationCap className="mx-auto h-12 w-12 text-green-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Become an Expert
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Share your expertise and help others grow
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="text-center">
                <UserCheck className="mx-auto h-8 w-8 text-green-600 mb-2" />
                <h3 className="font-semibold">Sign in to Continue</h3>
                <p className="text-sm text-gray-600">
                  You'll need to sign in with your Google account to apply as an expert
                </p>
              </div>
              
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading || isPending}
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
              >
                <FcGoogle className="h-5 w-5" />
                {isLoading || isPending 
                  ? "Signing in..." 
                  : "Continue with Google"
                }
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
} 