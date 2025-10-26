"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useSession } from "@/lib/auth-client"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { FcGoogle } from "react-icons/fc"
import { ArrowLeft, UserCheck, User } from "lucide-react"
import { mentorApplicationSchema } from "@/lib/validations/mentor"
import { z } from "zod"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { countryPhoneCodes } from "@/lib/country-phone-codes"
import { Combobox } from "@/components/ui/combobox"

export default function BecomeExpertPage() {
  const [showMentorForm, setShowMentorForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<z.ZodError | null>(null)
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null)
  const [showOtherIndustryInput, setShowOtherIndustryInput] = useState(false);
  
  const [countries, setCountries] = useState<{ id: number; name: string }[]>([])
  const [states, setStates] = useState<{ id: number; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: number; name: string }[]>([]);
  const [locationsLoading, setLocationsLoading] = useState({
    countries: false,
    states: false,
    cities: false,
  });

  const phoneCodeOptions = countryPhoneCodes.map(country => ({
    value: country.code,
    label: `+${country.code} (${country.name})`,
  }));

  const countryOptions = countries.map(country => ({
    value: country.id.toString(),
    label: country.name,
  }));

  const stateOptions = states.map(state => ({
    value: state.id.toString(),
    label: state.name,
  }));

  const cityOptions = cities.map(city => ({
    value: city.id.toString(),
    label: city.name,
  }));

  const [mentorFormData, setMentorFormData] = useState<{
    fullName: string
    email: string
    phone: string
    phoneCountryCode: string
    countryId: string
    stateId: string
    cityId: string
    title: string
    company: string
    industry: string
    otherIndustry: string; // New field for 'Other' industry
    experience: string
    expertise: string
    about: string
    linkedinUrl: string
    profilePicture: File | null
    resume: File | null
    termsAccepted: boolean
    availability: string
  }>({
    fullName: "",
    email: "",
    phone: "",
    phoneCountryCode: "",
    countryId: "",
    stateId: "",
    cityId: "",
    title: "",
    company: "",
    industry: "",
    otherIndustry: "", // Initialize new field
    experience: "",
    expertise: "",
    about: "",
    linkedinUrl: "",
    profilePicture: null,
    resume: null,
    termsAccepted: false,
    availability: "",
  })

  useEffect(() => {
    const fetchCountries = async () => {
      setLocationsLoading(prev => ({ ...prev, countries: true }));
      try {
        const response = await fetch('/api/locations/countries');
        const data = await response.json();
        setCountries(data);
        // Automatically select India if it exists
        const india = data.find((c: { name: string; }) => c.name === 'India');
        if (india) {
          setMentorFormData(prev => ({ ...prev, countryId: india.id.toString() }));
        }
      } catch (error) {
        console.error("Failed to fetch countries", error);
      } finally {
        setLocationsLoading(prev => ({ ...prev, countries: false }));
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    if (mentorFormData.countryId) {
      const fetchStates = async () => {
        setLocationsLoading(prev => ({ ...prev, states: true }));
        setStates([]);
        setCities([]);
        setMentorFormData(prev => ({ ...prev, stateId: "", cityId: "" }));
        try {
          const response = await fetch(`/api/locations/states?countryId=${mentorFormData.countryId}`);
          const data = await response.json();
          setStates(data);
        } catch (error) {
          console.error("Failed to fetch states", error);
        } finally {
          setLocationsLoading(prev => ({ ...prev, states: false }));
        }
      };
      fetchStates();
    }
  }, [mentorFormData.countryId]);

  useEffect(() => {
    if (mentorFormData.stateId) {
      const fetchCities = async () => {
        setLocationsLoading(prev => ({ ...prev, cities: true }));
        setCities([]);
        setMentorFormData(prev => ({ ...prev, cityId: "" }));
        try {
          const response = await fetch(`/api/locations/cities?stateId=${mentorFormData.stateId}`);
          const data = await response.json();
          setCities(data);
        } catch (error) {
          console.error("Failed to fetch cities", error);
        } finally {
          setLocationsLoading(prev => ({ ...prev, cities: false }));
        }
      };
      fetchCities();
    }
  }, [mentorFormData.stateId]);

  const [otp, setOtp] = useState("")
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mentorFormData.email)

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setMentorFormData(prev => ({ ...prev, profilePicture: file }));
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setProfilePicturePreview(null);
    }
  };

  const handleSendOtp = async () => {
  try {
    setOtpError(null);
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: mentorFormData.email }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to send OTP");
    }

    console.log("OTP sent successfully to:", mentorFormData.email);
    setShowOtpInput(true);
    startCountdown();
  } catch (err) {
    console.error("Error sending OTP:", err);
  }
};


  const handleVerifyOtp = async () => {
  if (!otp) return alert("Please enter the OTP");
  let email = mentorFormData.email;
  try {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({email, otp }),
    });

    const data = await res.json();

    if (data.success) {
      setIsEmailVerified(true);
      setShowOtpInput(false);
      setOtpError(null);
      console.log("OTP verified successfully");
    } else {
      setOtpError(data.error || "Invalid or expired OTP. Please try again.");
    }
  } catch (err) {
    setOtpError("An unexpected error occurred. Please try again.");
    console.error("Error verifying OTP:", err);
  }
};


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
    setCountdown(30);
    setIsCountingDown(true);
  };

  const handleResendOtp = async () => {
  if (!isCountingDown) {
    setOtpError(null);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mentorFormData.email }),
      });

      const data = await res.json();

      if (data.success) {
        console.log("OTP resent successfully to:", mentorFormData.email);
        startCountdown(); // restart timer
      } else {
        alert(data.error || "Failed to resend OTP");
      }
    } catch (err) {
      console.error("Error resending OTP:", err);
    }
  }
};


  const { data: session, isPending } = useSession()
  const router = useRouter()
  const { signIn } = useAuth()

  useEffect(() => {
    if (session?.user && !showMentorForm) {
      setShowMentorForm(true)

      const fetchMentorApplication = async () => {
        try {
          const response = await fetch('/api/mentors/application');
          const result = await response.json();
          if (result.success) {
            const { data } = result;
            if (data.verificationStatus === 'REVERIFICATION') {
              setMentorFormData({
                ...mentorFormData,
                ...data,
                countryId: data.country,
                stateId: data.state,
                cityId: data.city,
              });
            }
          }
        } catch (error) {
          console.error('Error fetching mentor application:', error);
        }
      };

      fetchMentorApplication();
    }
  }, [session, showMentorForm])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn('social', { provider: 'google', callbackURL: '/become-expert' })
      router.replace('/become-expert')
      router.refresh()
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

      const selectedCountry = countries.find((country) => country.id.toString() === mentorFormData.countryId);
      const selectedState = states.find((state) => state.id.toString() === mentorFormData.stateId);
      const selectedCity = cities.find((city) => city.id.toString() === mentorFormData.cityId);

      const submittedCountry = selectedCountry?.name || mentorFormData.countryId;
      const submittedState = selectedState?.name || mentorFormData.stateId;
      const submittedCity = selectedCity?.name || mentorFormData.cityId;

      const validatedData = mentorApplicationSchema.parse({
        ...mentorFormData,
        phone: `+${mentorFormData.phoneCountryCode}-${mentorFormData.phone}`,
        country: submittedCountry,
        state: submittedState,
        city: submittedCity,
        industry: mentorFormData.industry === 'Other' ? mentorFormData.otherIndustry : mentorFormData.industry,
      });

      const formData = new FormData();
      formData.append('userId', session.user.id);
      formData.append('fullName', validatedData.fullName);
      formData.append('email', validatedData.email);
      formData.append('phone', validatedData.phone);
      formData.append('country', validatedData.country);
      formData.append('state', validatedData.state);
      formData.append('city', validatedData.city);
      formData.append('title', validatedData.title);
      formData.append('company', validatedData.company);
      formData.append('industry', validatedData.industry);
      formData.append('expertise', validatedData.expertise);
      formData.append('experience', validatedData.experience.toString());
      formData.append('about', validatedData.about || '');
      formData.append('linkedinUrl', validatedData.linkedinUrl);
      formData.append('availability', validatedData.availability);
      formData.append('profilePicture', validatedData.profilePicture);
      if (validatedData.resume) {
        formData.append('resume', validatedData.resume)
      }
      
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
                <div className="flex flex-col items-center space-y-2">
                  <Label htmlFor="profilePicture">Profile Picture <span className="text-red-500">*</span></Label>
                  <label htmlFor="profilePicture" className="cursor-pointer">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profilePicturePreview || undefined} alt="Profile Picture" />
                      <AvatarFallback>
                        <User className="h-12 w-12" />
                      </AvatarFallback>
                    </Avatar>
                  </label>
                  <input
                    id="profilePicture"
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    required
                    className="hidden"
                  />
                  <Button type="button" onClick={() => document.getElementById('profilePicture')?.click()} variant="ghost">
                    Upload Picture
                  </Button>
                </div>
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
                            onChange={(e) => {
                              setOtp(e.target.value)
                              setOtpError(null)
                            }}
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
                        {otpError && <p className="text-sm text-red-500 mt-1">{otpError}</p>}
                        <p className="text-xs text-muted-foreground text-center">
                          Didn&apos;t receive the OTP?{' '}
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
                {/* Phone */}
                <div>
                  <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                  <div className="flex items-center space-x-2">
                    <Combobox
                      options={phoneCodeOptions}
                      value={mentorFormData.phoneCountryCode}
                      onValueChange={value => setMentorFormData(prev => ({ ...prev, phoneCountryCode: value }))}
                      placeholder="Select Code"
                      searchPlaceholder="Search codes..."
                      className="w-[80%]"
                    />
                    <Input
                      id="phone"
                      type="tel"
                      value={mentorFormData.phone}
                      onChange={e => setMentorFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                      required
                    />
                  </div>
                  {errors?.errors.find(e => e.path[0] === 'phone') && <p className="text-sm text-red-500 mt-1">{errors.errors.find(e => e.path[0] === 'phone')?.message}</p>}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
                    <Combobox
                      options={countryOptions}
                      value={mentorFormData.countryId}
                      onValueChange={value => setMentorFormData(prev => ({ ...prev, countryId: value }))}
                      placeholder="Select Country..."
                      searchPlaceholder="Search countries..."
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State <span className="text-red-500">*</span></Label>
                    <Combobox
                      options={stateOptions}
                      value={mentorFormData.stateId}
                      onValueChange={value => setMentorFormData(prev => ({ ...prev, stateId: value }))}
                      placeholder={locationsLoading.states ? "Loading..." : "Select State..."}
                      searchPlaceholder="Search states..."
                      className="w-full"
                      emptyMessage="No state found."
                      disabled={locationsLoading.states || states.length === 0}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                    <Combobox
                      options={cityOptions}
                      value={mentorFormData.cityId}
                      onValueChange={value => setMentorFormData(prev => ({ ...prev, cityId: value }))}
                      placeholder={locationsLoading.cities ? "Loading..." : "Select City..."}
                      searchPlaceholder="Search cities..."
                      className="w-full"
                      emptyMessage="No city found."
                      disabled={locationsLoading.cities || cities.length === 0}
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
                      onValueChange={value => {
                        setMentorFormData(prev => ({ ...prev, industry: value }));
                        setShowOtherIndustryInput(value === 'Other');
                      }}
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
                    {showOtherIndustryInput && (
                      <Input
                        id="otherIndustry"
                        type="text"
                        value={mentorFormData.otherIndustry}
                        onChange={e => setMentorFormData(prev => ({ ...prev, otherIndustry: e.target.value }))}
                        placeholder="Please specify your industry"
                        className="mt-2"
                        required
                      />
                    )}
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
                    placeholder="List at least 5 skills you can mentor in, separated by commas (e.g., Python, Digital Marketing, Leadership)."
                    required
                    maxLength={500}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Minimum 5 skills, comma-separated.</span>
                    <span>{mentorFormData.expertise.length} / 500</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="about">About You</Label>
                  <Textarea
                    id="about"
                    value={mentorFormData.about}
                    onChange={e => setMentorFormData(prev => ({ ...prev, about: e.target.value }))}
                    placeholder="Tell us a bit about yourself, your journey, and what you're passionate about."
                    rows={4}
                  />
                  {errors?.errors.find(e => e.path[0] === 'about') && <p className="text-sm text-red-500 mt-1">{errors.errors.find(e => e.path[0] === 'about')?.message}</p>}
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
                  <Label htmlFor="resume">Resume (Optional)</Label>
                  <Input
                    id="resume"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={e => setMentorFormData(prev => ({ ...prev, resume: e.target.files?.[0] || null }))}
                  />
                  <span className="text-xs text-muted-foreground">Upload your resume in PDF, DOC, or DOCX format (max 5MB)</span>
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
          
          <User className="mx-auto h-12 w-12 text-green-500 dark:text-green-400" />
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
                  You&apos;ll need to sign in with your Google account to apply as an expert
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
