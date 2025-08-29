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
import { mentorApplicationSchema } from "@/lib/validations/mentor"
import { z } from "zod"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

export default function BecomeExpertPage() {
  const [showMentorForm, setShowMentorForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<z.ZodError | null>(null)
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
    resume: File | null;
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
    resume: null,
    termsAccepted: false,
    availability: "",
  })

  const [otp, setOtp] = useState("")
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mentorFormData.email)

  const handleSendOtp = () => {
    // TODO: Implement API call to send OTP
    console.log("Sending OTP to:", mentorFormData.email);
    setShowOtpInput(true);
    startCountdown();
  };

  const handleVerifyOtp = () => {
    // TODO: Implement API call to verify OTP
    console.log("Verifying OTP:", otp)
    // Assuming OTP is correct
    setIsEmailVerified(true)
    setShowOtpInput(false)
  }

  const [countdown, setCountdown] = useState(10);
  const [isCountingDown, setIsCountingDown] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCountingDown && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setIsCountingDown(false);
    }
    return () => clearTimeout(timer);
  }, [isCountingDown, countdown]);

  const startCountdown = () => {
    setCountdown(10);
    setIsCountingDown(true);
  };

  const handleResendOtp = () => {
    if (!isCountingDown) {
      // TODO: Implement API call to resend OTP
      console.log("Resending OTP to:", mentorFormData.email);
      startCountdown();
    }
  };

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
    setErrors(null)

    try {
      if (!session?.user?.id) {
        alert('Please log in before submitting the form')
        setIsLoading(false)
        return
      }

      const validatedData = mentorApplicationSchema.parse(mentorFormData);

      const formData = new FormData();
      formData.append('userId', session.user.id);
      formData.append('fullName', validatedData.fullName);
      formData.append('email', validatedData.email);
      formData.append('phone', validatedData.phone);
      formData.append('city', validatedData.city);
      formData.append('country', validatedData.country);
      formData.append('title', validatedData.title);
      formData.append('company', validatedData.company);
      formData.append('industry', validatedData.industry);
      formData.append('expertise', validatedData.expertise);
      formData.append('experience', validatedData.experience);
      formData.append('about', validatedData.about);
      formData.append('linkedinUrl', validatedData.linkedinUrl);
      formData.append('availability', validatedData.availability);
      formData.append('profilePicture', validatedData.profilePicture);
      formData.append('resume', validatedData.resume);
      
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
      if (error instanceof z.ZodError) {
        setErrors(error)
      } else {
        alert('Something went wrong while submitting your application.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Show mentor form if user is logged in
  if (session?.user && showMentorForm) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
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
            
            <GraduationCap className="mx-auto h-12 w-12 text-green-500 dark:text-green-400" />
            <h2 className="mt-6 text-3xl font-extrabold text-foreground">
              Become an Expert
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
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
                    <div className="flex items-center space-x-2">
                      <Input
                        id="email"
                        type="email"
                        value={mentorFormData.email}
                        onChange={e => {
                          setMentorFormData(prev => ({ ...prev, email: e.target.value }));
                          setIsEmailVerified(false);
                          setOtp("");
                        }}
                        placeholder="you@example.com"
                        required
                        disabled={isEmailVerified}
                      />
                      <Button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={!isValidEmail || isEmailVerified}
                      >
                        {isEmailVerified ? "Verified" : "Verify"}
                      </Button>
                    </div>
                    {showOtpInput && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="text"
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            maxLength={6}
                          />
                          <Button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={otp.length !== 6}
                          >
                            Confirm OTP
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Didn't receive the OTP?{' '}
                          {isCountingDown ? (
                            `Resend in ${countdown}s`
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendOtp}
                              className="underline font-medium text-primary hover:text-primary/90"
                            >
                              Resend OTP
                            </button>
                          )}
                        </p>
                      </div>
                    )}
                    {isEmailVerified && <p className="text-sm text-green-500 dark:text-green-400 mt-1">Email verified successfully.</p>}
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
                <div>
                  <Label htmlFor="resume">Resume <span className="text-red-500">*</span></Label>
                  <Input
                    id="resume"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={e => setMentorFormData(prev => ({ ...prev, resume: e.target.files?.[0] || null }))}
                    required
                  />
                  <span className="text-xs text-muted-foreground">Upload your resume in PDF, DOC, or DOCX format (max 10MB)</span>
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
                    <Select
                      value={mentorFormData.industry}
                      onValueChange={value => setMentorFormData(prev => ({ ...prev, industry: value }))}
                      required
                    >
                      <SelectTrigger id="industry">
                        <SelectValue placeholder="Select your industry..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ITSoftware">IT & Software</SelectItem>
                        <SelectItem value="Marketing">Marketing & Advertising</SelectItem>
                        <SelectItem value="Finance">Finance & Banking</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Entrepreneurship">Entrepreneurship & Startup</SelectItem>
                        <SelectItem value="Design">Design (UI/UX, Graphic)</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="HR">Human Resources</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <span className="ml-2 text-xs text-muted-foreground">Minimum 2 years of experience required to be a mentor.</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="expertise">Areas of Expertise <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="expertise"
                    value={mentorFormData.expertise}
                    onChange={e => setMentorFormData(prev => ({ ...prev, expertise: e.target.value }))}
                    placeholder="List skills you can mentor in (e.g., Python, Digital Marketing, Leadership, Career Transitions). Minimum 100 characters, maximum 500 characters."
                    required
                    maxLength={500}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Minimum 100 characters. Be specific! This helps mentees find you. Use commas to separate multiple areas.</span>
                    <span>{mentorFormData.expertise.length} / 500</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="availability">Preferred Mentorship Availability <span className="text-red-500">*</span></Label>
                  <Select
                    value={mentorFormData.availability || ''}
                    onValueChange={value => setMentorFormData(prev => ({ ...prev, availability: value }))}
                    required
                  >
                    <SelectTrigger id="availability">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Weekly">Weekly (e.g., 1 hour/week)</SelectItem>
                      <SelectItem value="BiWeekly">Bi-weekly (e.g., 1 hour/bi-week)</SelectItem>
                      <SelectItem value="Monthly">Monthly (e.g., 1 hour/month)</SelectItem>
                      <SelectItem value="AsNeeded">As needed (flexible)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="linkedinUrl">LinkedIn Profile URL <span className="text-red-500">*</span></Label>
                  <Input
                    id="linkedinUrl"
                    type="text"
                    value={mentorFormData.linkedinUrl}
                    onChange={e => setMentorFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                    placeholder="https://linkedin.com/in/yourprofile"
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="termsAccepted"
                    checked={mentorFormData.termsAccepted}
                    onCheckedChange={checked => setMentorFormData(prev => ({ ...prev, termsAccepted: !!checked }))}
                    required
                  />
                  <Label htmlFor="termsAccepted" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">I agree to the <span className="underline cursor-pointer">Terms and Conditions</span> (placeholder)</Label>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || !isEmailVerified}
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
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
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
          
          <GraduationCap className="mx-auto h-12 w-12 text-green-500 dark:text-green-400" />
          <h2 className="mt-6 text-3xl font-extrabold text-foreground">
            Become an Expert
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Share your expertise and help others grow
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="text-center">
                <UserCheck className="mx-auto h-8 w-8 text-green-500 dark:text-green-400 mb-2" />
                <h3 className="font-semibold">Sign in to Continue</h3>
                <p className="text-sm text-muted-foreground">
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
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}