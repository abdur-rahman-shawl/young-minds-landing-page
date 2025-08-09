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
import { useAuth } from "@/contexts/auth-context"
import { uploadProfilePicture } from "@/lib/storage"
import { 
  Mail, 
  Edit3, 
  Save, 
  X, 
  Loader2, 
  User, 
  Briefcase, 
  GraduationCap, 
  Target, 
  Code, 
  Heart, 
  Brain, 
  Calendar,
  Camera,
  CheckCircle2
} from "lucide-react"

export function Profile() {
  const { session, roles, mentorProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  
  const isMentor = roles.some(role => role.name === 'mentor')
  
  // Different state structures for mentor vs mentee
  const [menteeData, setMenteeData] = useState({
    currentRole: '',
    currentCompany: '',
    education: '',
    careerGoals: '',
    currentSkills: '',
    skillsToLearn: '',
    interests: '',
    learningStyle: '',
    preferredMeetingFrequency: ''
  })
  
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
    availability: '',
    profileImageUrl: ''
  })

  const userName = session?.user?.name || 'User'
  const userEmail = session?.user?.email || ''
  const userImage = session?.user?.image

  // Load profile data from database
  const loadProfile = async () => {
    if (!session?.user?.id) return

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/user/profile?userId=${session.user.id}`)
      const result = await response.json()

      if (result.success) {
        // Load mentee data if exists
        if (result.data.menteeProfile) {
          const profile = result.data.menteeProfile
          setMenteeData({
            currentRole: profile.currentRole || '',
            currentCompany: profile.currentCompany || '',
            education: profile.education || '',
            careerGoals: profile.careerGoals || '',
            currentSkills: profile.currentSkills || '',
            skillsToLearn: profile.skillsToLearn || '',
            interests: profile.interests || '',
            learningStyle: profile.learningStyle || '',
            preferredMeetingFrequency: profile.preferredMeetingFrequency || ''
          })
        }

        // Load mentor data if exists
        if (result.data.mentorProfile) {
          const profile = result.data.mentorProfile
          setMentorData({
            fullName: profile.fullName || '',
            email: profile.email || '',
            phone: profile.phone || '',
            title: profile.title || '',
            company: profile.company || '',
            city: profile.city || '',
            country: profile.country || '',
            industry: profile.industry || '',
            expertise: profile.expertise || '',
            experience: profile.experience?.toString() || '',
            about: profile.about || '',
            linkedinUrl: profile.linkedinUrl || '',
            githubUrl: profile.githubUrl || '',
            websiteUrl: profile.websiteUrl || '',
            hourlyRate: profile.hourlyRate || '',
            availability: profile.availability || '',
            profileImageUrl: profile.profileImageUrl || ''
          })
        }
      }
    } catch (err) {
      setError('Failed to load profile data')
      console.error('Error loading profile:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Save profile data to database
  const handleSave = async () => {
    if (!session?.user?.id) return

    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          action: 'create-mentee-profile',
          profileData: profileData
        })
      })

      const result = await response.json()

      if (result.success) {
        setIsEditing(false)
        setSuccess('Profile updated successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(result.error || 'Failed to save profile')
      }
    } catch (err) {
      setError('Failed to save profile')
      console.error('Error saving profile:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setError(null)
    setSuccess(null)
    loadProfile()
  }

  const handleInputChange = (field: keyof typeof profileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  useEffect(() => {
    if (session?.user?.id) {
      loadProfile()
    }
  }, [session?.user?.id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-48 bg-gray-100 rounded animate-pulse"></div>
              </div>
            </div>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse border-0 shadow-sm">
                <CardContent className="p-8">
                  <div className="h-32 bg-gray-100 rounded-xl"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Profile
              </h1>
              <p className="text-slate-600 text-lg">Manage your learning journey and preferences</p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <Button 
                    variant="outline" 
                    onClick={handleCancel} 
                    disabled={isSaving}
                    className="px-6 border-slate-200 hover:bg-slate-50 transition-all duration-200"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 transition-all duration-200"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="px-6 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 shadow-lg shadow-slate-900/25 transition-all duration-200"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <p className="text-green-700 text-sm font-medium">{success}</p>
            </div>
          )}

          {/* Profile Header Card */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-start gap-8">
                <div className="relative group">
                  <Avatar className="h-24 w-24 ring-4 ring-white shadow-xl">
                    <AvatarImage src={userImage || undefined} alt={userName} />
                    <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {userName.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{userName}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-slate-500" />
                      <span className="text-slate-600">{userEmail}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="px-3 py-1 bg-blue-50 text-blue-700 border-blue-200">
                      <User className="h-3 w-3 mr-1" />
                      Mentee
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1 border-green-200 text-green-700">
                      Active
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Briefcase className="h-5 w-5 text-slate-700" />
                </div>
                <CardTitle className="text-xl text-slate-900">Professional Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Current Role
                  </Label>
                  {isEditing ? (
                    <Input
                      value={profileData.currentRole}
                      onChange={(e) => handleInputChange('currentRole', e.target.value)}
                      placeholder="e.g., Software Engineer, Student"
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                    />
                  ) : (
                    <p className="text-slate-800 bg-slate-50 rounded-lg px-4 py-3 min-h-[44px] flex items-center">
                      {profileData.currentRole || <span className="text-slate-400">Not specified</span>}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Company / School
                  </Label>
                  {isEditing ? (
                    <Input
                      value={profileData.currentCompany}
                      onChange={(e) => handleInputChange('currentCompany', e.target.value)}
                      placeholder="e.g., Google, Stanford University"
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                    />
                  ) : (
                    <p className="text-slate-800 bg-slate-50 rounded-lg px-4 py-3 min-h-[44px] flex items-center">
                      {profileData.currentCompany || <span className="text-slate-400">Not specified</span>}
                    </p>
                  )}
                </div>
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Education Background
                </Label>
                {isEditing ? (
                  <Textarea
                    value={profileData.education}
                    onChange={(e) => handleInputChange('education', e.target.value)}
                    placeholder="Tell us about your educational background..."
                    rows={3}
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all resize-none"
                  />
                ) : (
                  <div className="text-slate-800 bg-slate-50 rounded-lg px-4 py-3 min-h-[80px]">
                    {profileData.education || <span className="text-slate-400">Not specified</span>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Learning Journey */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="h-5 w-5 text-purple-700" />
                </div>
                <CardTitle className="text-xl text-slate-900">Learning Journey</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Career Goals
                </Label>
                {isEditing ? (
                  <Textarea
                    value={profileData.careerGoals}
                    onChange={(e) => handleInputChange('careerGoals', e.target.value)}
                    placeholder="What are your career aspirations and goals?"
                    rows={4}
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all resize-none"
                  />
                ) : (
                  <div className="text-slate-800 bg-slate-50 rounded-lg px-4 py-3 min-h-[100px]">
                    {profileData.careerGoals || <span className="text-slate-400">Not specified</span>}
                  </div>
                )}
              </div>

              <Separator className="bg-slate-100" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Current Skills
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={profileData.currentSkills}
                      onChange={(e) => handleInputChange('currentSkills', e.target.value)}
                      placeholder="List your current skills (comma separated)"
                      rows={4}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all resize-none"
                    />
                  ) : (
                    <div className="min-h-[100px] bg-slate-50 rounded-lg p-4">
                      {profileData.currentSkills ? (
                        <div className="flex flex-wrap gap-2">
                          {profileData.currentSkills.split(',').map((skill, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary" 
                              className="px-3 py-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
                            >
                              {skill.trim()}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">Not specified</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Skills to Learn
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={profileData.skillsToLearn}
                      onChange={(e) => handleInputChange('skillsToLearn', e.target.value)}
                      placeholder="Skills you want to learn (comma separated)"
                      rows={4}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all resize-none"
                    />
                  ) : (
                    <div className="min-h-[100px] bg-slate-50 rounded-lg p-4">
                      {profileData.skillsToLearn ? (
                        <div className="flex flex-wrap gap-2">
                          {profileData.skillsToLearn.split(',').map((skill, index) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className="px-3 py-1 border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors"
                            >
                              {skill.trim()}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">Not specified</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Heart className="h-5 w-5 text-green-700" />
                </div>
                <CardTitle className="text-xl text-slate-900">Preferences & Interests</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Interests
                  </Label>
                  {isEditing ? (
                    <Input
                      value={profileData.interests}
                      onChange={(e) => handleInputChange('interests', e.target.value)}
                      placeholder="Your interests (comma separated)"
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                    />
                  ) : (
                    <p className="text-slate-800 bg-slate-50 rounded-lg px-4 py-3 min-h-[44px] flex items-center">
                      {profileData.interests || <span className="text-slate-400">Not specified</span>}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Learning Style
                  </Label>
                  {isEditing ? (
                    <select
                      value={profileData.learningStyle}
                      onChange={(e) => handleInputChange('learningStyle', e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
                    >
                      <option value="">Select learning style</option>
                      <option value="visual">Visual Learner</option>
                      <option value="hands-on">Hands-on Learner</option>
                      <option value="theoretical">Theoretical Learner</option>
                      <option value="interactive">Interactive Learner</option>
                    </select>
                  ) : (
                    <p className="text-slate-800 bg-slate-50 rounded-lg px-4 py-3 min-h-[44px] flex items-center">
                      {profileData.learningStyle ? (
                        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                          {profileData.learningStyle === 'visual' && 'Visual Learner'}
                          {profileData.learningStyle === 'hands-on' && 'Hands-on Learner'}
                          {profileData.learningStyle === 'theoretical' && 'Theoretical Learner'}
                          {profileData.learningStyle === 'interactive' && 'Interactive Learner'}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">Not specified</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Preferred Meeting Frequency
                </Label>
                {isEditing ? (
                  <select
                    value={profileData.preferredMeetingFrequency}
                    onChange={(e) => handleInputChange('preferredMeetingFrequency', e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
                  >
                    <option value="">Select frequency</option>
                    <option value="weekly">Weekly Sessions</option>
                    <option value="bi-weekly">Bi-weekly Sessions</option>
                    <option value="monthly">Monthly Sessions</option>
                    <option value="as-needed">As Needed</option>
                  </select>
                ) : (
                  <p className="text-slate-800 bg-slate-50 rounded-lg px-4 py-3 min-h-[44px] flex items-center">
                    {profileData.preferredMeetingFrequency ? (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                        {profileData.preferredMeetingFrequency === 'weekly' && 'Weekly Sessions'}
                        {profileData.preferredMeetingFrequency === 'bi-weekly' && 'Bi-weekly Sessions'}
                        {profileData.preferredMeetingFrequency === 'monthly' && 'Monthly Sessions'}
                        {profileData.preferredMeetingFrequency === 'as-needed' && 'As Needed'}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">Not specified</span>
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 