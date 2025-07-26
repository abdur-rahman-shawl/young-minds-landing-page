"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { uploadProfilePicture, uploadResume } from "@/lib/storage"
import { 
  Edit3, 
  Save, 
  X, 
  Loader2, 
  User, 
  Camera,
  CheckCircle2,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  Globe,
  Linkedin,
  Github,
  DollarSign,
  Clock,
  Target,
  Award,
  BookOpen,
  Star,
  FileText,
  Upload
} from "lucide-react"

export function MentorProfileEdit() {
  const { session, mentorProfile, refreshUserData } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isUploadingResume, setIsUploadingResume] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [imageRefresh, setImageRefresh] = useState(0)
  const [showImage, setShowImage] = useState(false)
  
  const [mentorData, setMentorData] = useState({
    fullName: '',
    email: '',
    phone: '',
    title: '',
    company: '',
    city: '',
    country: '',
    industry: '',
    expertise: '',
    experience: '',
    about: '',
    linkedinUrl: '',
    githubUrl: '',
    websiteUrl: '',
    hourlyRate: '',
    currency: 'USD',
    availability: '',
    headline: '',
    maxMentees: '10',
    profileImageUrl: '',
    resumeUrl: ''
  })

  // Load mentor profile data
  useEffect(() => {
    console.log('🔍 mentorProfile changed:', mentorProfile);
    if (mentorProfile) {
      console.log('📋 Loading mentor data:', JSON.stringify(mentorProfile, null, 2));
      setMentorData({
        fullName: mentorProfile.fullName || session?.user?.name || '',
        email: mentorProfile.email || session?.user?.email || '',
        phone: mentorProfile.phone || '',
        title: mentorProfile.title || '',
        company: mentorProfile.company || '',
        city: mentorProfile.city || '',
        country: mentorProfile.country || '',
        industry: mentorProfile.industry || '',
        expertise: mentorProfile.expertise || '',
        experience: mentorProfile.experience?.toString() || '',
        about: mentorProfile.about || '',
        linkedinUrl: mentorProfile.linkedinUrl || '',
        githubUrl: mentorProfile.githubUrl || '',
        websiteUrl: mentorProfile.websiteUrl || '',
        hourlyRate: mentorProfile.hourlyRate || '',
        currency: mentorProfile.currency || 'USD',
        availability: mentorProfile.availability || '',
        headline: mentorProfile.headline || '',
        maxMentees: mentorProfile.maxMentees?.toString() || '10',
        profileImageUrl: mentorProfile.profileImageUrl || '',
        resumeUrl: mentorProfile.resumeUrl || ''
      })
      
      // Show image after profile loads
      setTimeout(() => setShowImage(true), 100)
    }
  }, [mentorProfile])

  const handleImageUpload = async (file: File) => {
    if (!session?.user?.id) return

    try {
      setIsUploadingImage(true)
      const uploadResult = await uploadProfilePicture(file, session.user.id)
      
      // Update local state
      setMentorData(prev => ({
        ...prev,
        profileImageUrl: uploadResult.url
      }))
      
      // Immediately save to database to update across all components
      const response = await fetch('/api/mentors/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          profileImageUrl: uploadResult.url
        }),
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save profile image')
      }
      
      // Force image refresh
      setImageRefresh(Date.now())
      
      setSuccess('Profile image uploaded and saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
      
      // Refresh user roles to update all components with new image
      refreshUserData()
      
    } catch (error) {
      setError('Failed to upload image')
      console.error('Image upload error:', error)
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleResumeUpload = async (file: File) => {
    if (!session?.user?.id) return

    try {
      setIsUploadingResume(true)
      setError(null)
      
      // Validate file type and size
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const allowedExtensions = ['pdf', 'doc', 'docx'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
        setError('Please upload a PDF, DOC, or DOCX file');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Resume file size must be less than 10MB');
        return;
      }

      // Send file to API for upload and database update
      const formData = new FormData();
      formData.append('userId', session.user.id);
      formData.append('resume', file);
      
      const response = await fetch('/api/mentors/update-profile', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save resume')
      }
      
      // Update local state with the new resume URL from the API response
      if (result.data?.resumeUrl) {
        setMentorData(prev => ({
          ...prev,
          resumeUrl: result.data.resumeUrl
        }))
      }
      
      setSuccess('Resume uploaded and saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
      
      // Refresh user roles to update all components
      refreshUserData()
      
    } catch (error) {
      setError('Failed to upload resume')
      console.error('Resume upload error:', error)
    } finally {
      setIsUploadingResume(false)
    }
  }

  const handleSave = async () => {
    if (!session?.user?.id) return

    try {
      setIsUploadingImage(true) // Reuse loading state
      setError(null)
      
      const response = await fetch('/api/mentors/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          ...mentorData,
          experience: parseInt(mentorData.experience) || 0,
          hourlyRate: parseFloat(mentorData.hourlyRate) || 0,
          maxMentees: parseInt(mentorData.maxMentees) || 10
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess('Profile updated successfully!')
        setIsEditing(false)
        setTimeout(() => setSuccess(null), 3000)
        
        // Refresh user roles to update all components
        refreshUserData()
      } else {
        setError(result.error || 'Failed to update profile')
      }
    } catch (err) {
      setError('Failed to save profile')
      console.error('Save error:', err)
    } finally {
      setIsUploadingImage(false)
    }
  }

  // Simple image logic - use uploaded if available, otherwise Google
  const currentImage = mentorData.profileImageUrl 
    ? `${mentorData.profileImageUrl}?t=${imageRefresh || Date.now()}` 
    : session?.user?.image

  const industries = [
    "IT & Software", "Marketing & Advertising", "Finance & Banking", "Education", 
    "Healthcare", "Entrepreneurship & Startup", "Design (UI/UX, Graphic)", "Sales", 
    "Human Resources", "Other"
  ]

  const availabilityOptions = [
    "Weekly (e.g., 1 hour/week)", "Bi-weekly (e.g., 1 hour/bi-week)", 
    "Monthly (e.g., 1 hour/month)", "As needed (flexible)"
  ]

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    const fields = [
      mentorData.fullName, mentorData.email, mentorData.phone,
      mentorData.title, mentorData.company, mentorData.city, mentorData.country,
      mentorData.industry, mentorData.expertise, mentorData.experience,
      mentorData.about, mentorData.hourlyRate, mentorData.availability,
      mentorData.headline, mentorData.profileImageUrl, mentorData.resumeUrl
    ];
    
    const filledFields = fields.filter(field => field && field.toString().trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const completionPercentage = calculateCompletion();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Mentor Profile
              </h1>
              <p className="text-gray-500 mt-1">Manage your professional information</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-gray-500">Profile Complete</div>
                <div className="text-lg font-semibold text-blue-600">{completionPercentage}%</div>
              </div>
              <Button
                variant={isEditing ? "outline" : "default"}
                onClick={() => setIsEditing(!isEditing)}
                className="gap-2"
              >
                {isEditing ? (
                  <>
                    <X className="h-4 w-4" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4" />
                    Edit Profile
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        
        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-500" />
              {error}
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {success}
            </div>
          </div>
        )}

        {/* Profile Overview Card */}
        <Card className="mb-8 overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              {/* Profile Image */}
              <div className="relative flex-shrink-0">
                {!showImage ? (
                  <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                  </div>
                ) : (
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={currentImage} />
                    <AvatarFallback className="text-xl font-semibold bg-blue-500 text-white">
                      {mentorData.fullName?.charAt(0) || session?.user?.name?.charAt(0) || 'M'}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                {/* Upload loading indicator */}
                {isUploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
                {isEditing && showImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-full cursor-pointer transition-all hover:bg-opacity-70">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(file)
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {isUploadingImage ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {mentorData.fullName || session?.user?.name || 'Your Name'}
                </h2>
                <p className="text-gray-600 mb-2">
                  {mentorData.title || 'Professional Title'} 
                  {mentorData.company && <span> at {mentorData.company}</span>}
                </p>
                {mentorData.headline && (
                  <p className="text-gray-500 italic text-sm">
                    "{mentorData.headline}"
                  </p>
                )}
              </div>

              {/* Status Badge */}
              <div className="text-right">
                <Badge 
                  variant={mentorProfile?.verificationStatus === 'VERIFIED' ? 'default' : 'secondary'}
                  className="mb-2"
                >
                  {mentorProfile?.verificationStatus || 'IN_PROGRESS'}
                </Badge>
                <div className="text-sm text-gray-500">
                  {completionPercentage < 100 && (
                    <span className="text-orange-600">Profile Incomplete</span>
                  )}
                  {completionPercentage === 100 && (
                    <span className="text-green-600">Profile Complete</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Sections */}
        <div className="space-y-8">
          
          {/* Personal Information */}
          <Card>
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2 font-medium">
                    <User className="h-4 w-4" />
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={mentorData.fullName}
                    onChange={(e) => setMentorData(prev => ({ ...prev, fullName: e.target.value }))}
                    disabled={!isEditing}
                    className="transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 font-medium">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={mentorData.email}
                    onChange={(e) => setMentorData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditing}
                    className="transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2 font-medium">
                    <Phone className="h-4 w-4" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={mentorData.phone}
                    onChange={(e) => setMentorData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!isEditing}
                    className="transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headline" className="flex items-center gap-2 font-medium">
                    <Star className="h-4 w-4" />
                    Professional Headline
                  </Label>
                  <Input
                    id="headline"
                    value={mentorData.headline}
                    onChange={(e) => setMentorData(prev => ({ ...prev, headline: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="e.g., Helping junior developers level up their careers"
                    className="transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="city" className="flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4" />
                    City
                  </Label>
                  <Input
                    id="city"
                    value={mentorData.city}
                    onChange={(e) => setMentorData(prev => ({ ...prev, city: e.target.value }))}
                    disabled={!isEditing}
                    className="transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="flex items-center gap-2 font-medium">
                    <Globe className="h-4 w-4" />
                    Country
                  </Label>
                  <Input
                    id="country"
                    value={mentorData.country}
                    onChange={(e) => setMentorData(prev => ({ ...prev, country: e.target.value }))}
                    disabled={!isEditing}
                    className="transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resume Section */}
          <Card>
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <FileText className="h-5 w-5" />
                Resume
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-medium">
                  <Upload className="h-4 w-4" />
                  Resume File
                </Label>
                
                {mentorData.resumeUrl ? (
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Resume uploaded</p>
                        <p className="text-xs text-green-700">Click to view your current resume</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(mentorData.resumeUrl, '_blank')}
                        className="text-green-700 border-green-300 hover:bg-green-100"
                      >
                        View Resume
                      </Button>
                      {isEditing && (
                        <div className="relative">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleResumeUpload(file)
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            disabled={isUploadingResume}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isUploadingResume}
                            className="text-blue-700 border-blue-300 hover:bg-blue-100"
                          >
                            {isUploadingResume ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-1" />
                                Replace
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleResumeUpload(file)
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          disabled={isUploadingResume}
                        />
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                          <p className="text-sm text-gray-600">
                            {isUploadingResume ? 'Uploading resume...' : 'Click to upload your resume'}
                          </p>
                          <p className="text-xs text-gray-500">PDF, DOC, or DOCX (max 10MB)</p>
                          {isUploadingResume && (
                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-600" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <FileText className="h-8 w-8 text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-600">No resume uploaded</p>
                        <p className="text-xs text-gray-500">Click "Edit Profile" to upload your resume</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Briefcase className="h-5 w-5" />
                Professional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="flex items-center gap-2 font-medium">
                    <Briefcase className="h-4 w-4" />
                    Job Title
                  </Label>
                  <Input
                    id="title"
                    value={mentorData.title}
                    onChange={(e) => setMentorData(prev => ({ ...prev, title: e.target.value }))}
                    disabled={!isEditing}
                    className="transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company" className="font-medium">Company</Label>
                  <Input
                    id="company"
                    value={mentorData.company}
                    onChange={(e) => setMentorData(prev => ({ ...prev, company: e.target.value }))}
                    disabled={!isEditing}
                    className="transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry" className="font-medium">Industry</Label>
                  <Select 
                    value={mentorData.industry} 
                    onValueChange={(value) => setMentorData(prev => ({ ...prev, industry: value }))}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="transition-all focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience" className="flex items-center gap-2 font-medium">
                    <Award className="h-4 w-4" />
                    Years of Experience
                  </Label>
                  <Input
                    id="experience"
                    type="number"
                    min="1"
                    value={mentorData.experience}
                    onChange={(e) => setMentorData(prev => ({ ...prev, experience: e.target.value }))}
                    disabled={!isEditing}
                    className="transition-all focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expertise" className="flex items-center gap-2 font-medium">
                  <BookOpen className="h-4 w-4" />
                  Areas of Expertise
                </Label>
                <Textarea
                  id="expertise"
                  value={mentorData.expertise}
                  onChange={(e) => setMentorData(prev => ({ ...prev, expertise: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="List your skills and expertise areas (e.g., Python, React, Product Management, Leadership)"
                  rows={3}
                  className="transition-all focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500">Separate multiple areas with commas</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="about" className="flex items-center gap-2 font-medium">
                  <User className="h-4 w-4" />
                  About Me
                </Label>
                <Textarea
                  id="about"
                  value={mentorData.about}
                  onChange={(e) => setMentorData(prev => ({ ...prev, about: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Tell potential mentees about yourself, your experience, and what you can help them with..."
                  rows={5}
                  className="transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Globe className="h-5 w-5" />
                Social Links
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="linkedinUrl" className="flex items-center gap-2 font-medium">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn URL
                </Label>
                <Input
                  id="linkedinUrl"
                  value={mentorData.linkedinUrl}
                  onChange={(e) => setMentorData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="githubUrl" className="flex items-center gap-2 font-medium">
                  <Github className="h-4 w-4" />
                  GitHub URL
                </Label>
                <Input
                  id="githubUrl"
                  value={mentorData.githubUrl}
                  onChange={(e) => setMentorData(prev => ({ ...prev, githubUrl: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="https://github.com/yourusername"
                  className="transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteUrl" className="flex items-center gap-2 font-medium">
                  <Globe className="h-4 w-4" />
                  Personal Website
                </Label>
                <Input
                  id="websiteUrl"
                  value={mentorData.websiteUrl}
                  onChange={(e) => setMentorData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="https://yourwebsite.com"
                  className="transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Mentoring Settings */}
          <Card>
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Target className="h-5 w-5" />
                Mentoring Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate" className="flex items-center gap-2 font-medium">
                  <DollarSign className="h-4 w-4" />
                  Hourly Rate (USD)
                </Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={mentorData.hourlyRate}
                  onChange={(e) => setMentorData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="50.00"
                  className="transition-all focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="availability" className="flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4" />
                  Availability
                </Label>
                <Select 
                  value={mentorData.availability} 
                  onValueChange={(value) => setMentorData(prev => ({ ...prev, availability: value }))}
                  disabled={!isEditing}
                >
                  <SelectTrigger className="transition-all focus:ring-2 focus:ring-blue-500">
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent>
                    {availabilityOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxMentees" className="flex items-center gap-2 font-medium">
                  <User className="h-4 w-4" />
                  Max Mentees
                </Label>
                <Input
                  id="maxMentees"
                  type="number"
                  min="1"
                  max="50"
                  value={mentorData.maxMentees}
                  onChange={(e) => setMentorData(prev => ({ ...prev, maxMentees: e.target.value }))}
                  disabled={!isEditing}
                  className="transition-all focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500">Maximum number of mentees you can handle</p>
              </div>
            </CardContent>
          </Card>
        
          {/* Save Button */}
          {isEditing && (
            <div className="pt-6 border-t">
              <Button 
                onClick={handleSave} 
                disabled={isUploadingImage}
                size="lg"
                className="w-full md:w-auto px-8 py-3"
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Save Profile Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}