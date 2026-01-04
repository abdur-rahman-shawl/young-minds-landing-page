"use client"

import React, { useCallback, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { motion } from "framer-motion"
import { 
  Briefcase, 
  GraduationCap, 
  Target, 
  Code, 
  Heart, 
  Brain, 
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles
} from "lucide-react"

import { ProfileHeader } from "@/components/shared/profile/profile-header"
import { useProfileLoader, ProfileApiService, ProfileValidators } from "@/components/shared/profile/base-profile"
import { ProfileErrorBoundary } from "@/components/shared/profile/profile-error-boundary"
import type { 
  MenteeProfile, 
  BaseUser, 
  MenteeProfileFields
} from "@/components/shared/profile/profile-types"

const INITIAL_MENTEE_DATA: MenteeProfile = {
  currentRole: '',
  currentCompany: '',
  education: '',
  careerGoals: '',
  currentSkills: '',
  skillsToLearn: '',
  interests: '',
  learningStyle: '',
  preferredMeetingFrequency: ''
}

const MenteeProfileComponent = React.memo(() => {
  const { session } = useAuth()
  
  const baseUser: BaseUser = useMemo(() => ({
    id: session?.user?.id || '',
    name: session?.user?.name || 'User',
    email: session?.user?.email || '',
    image: session?.user?.image
  }), [session])

  const extractMenteeProfile = useCallback((data: any): MenteeProfile => {
    const profile = data.menteeProfile
    if (!profile) return INITIAL_MENTEE_DATA
    
    return {
      currentRole: profile.currentRole || '',
      currentCompany: profile.currentCompany || '',
      education: profile.education || '',
      careerGoals: profile.careerGoals || '',
      currentSkills: profile.currentSkills || '',
      skillsToLearn: profile.skillsToLearn || '',
      interests: profile.interests || '',
      learningStyle: profile.learningStyle || '',
      preferredMeetingFrequency: profile.preferredMeetingFrequency || ''
    }
  }, [])

  const handleError = useCallback((error: string) => {
    console.error('Profile loading error:', error)
  }, [])

  const { state, actions, loadProfile: reloadProfile } = useProfileLoader(
    baseUser.id,
    extractMenteeProfile,
    INITIAL_MENTEE_DATA,
    handleError
  )

  const handleInputChange = useCallback((field: MenteeProfileFields, value: string) => {
    actions.setData(prev => ({ ...prev, [field]: value }))
    if (state.error) {
      actions.setError(null)
    }
  }, [actions.setData, actions.setError, state.error])

  const validateForm = useCallback((): string | null => {
    const validators = [
      ProfileValidators.required(state.data.currentRole, 'Current Role'),
      ProfileValidators.required(state.data.currentCompany, 'Current Company'),
      ProfileValidators.required(state.data.careerGoals, 'Career Goals'),
      ProfileValidators.maxLength(state.data.careerGoals, 1000, 'Career Goals'),
      ProfileValidators.maxLength(state.data.currentSkills, 500, 'Current Skills'),
      ProfileValidators.maxLength(state.data.skillsToLearn, 500, 'Skills to Learn'),
      ProfileValidators.maxLength(state.data.interests, 500, 'Interests')
    ]
    
    return validators.find(error => error !== null) || null
  }, [state.data])

  const handleSave = useCallback(async () => {
    const validationError = validateForm()
    if (validationError) {
      actions.setError(validationError)
      return
    }

    if (!baseUser.id) {
      actions.setError('User session is required')
      return
    }

    try {
      actions.setIsSaving(true)
      actions.setError(null)
      
      const result = await ProfileApiService.saveProfile(
        baseUser.id,
        state.data,
        'create-mentee-profile'
      )
      
      if (result.success) {
        actions.setSuccess('Profile updated successfully!')
        setTimeout(() => actions.setSuccess(null), 3000)
      } else {
        actions.setError(result.error || 'Failed to save profile')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save profile'
      actions.setError(errorMessage)
    } finally {
      actions.setIsSaving(false)
    }
  }, [validateForm, baseUser.id, state.data, actions.setIsSaving, actions.setError, actions.setSuccess])

  const handleCancel = useCallback(() => {
    actions.setIsEditing(false)
    actions.setError(null)
    actions.setSuccess(null)
    reloadProfile()
  }, [actions.setIsEditing, actions.setError, actions.setSuccess, reloadProfile])

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Loading your profile...</p>
         </div>
      </div>
    )
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen pb-20"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <motion.div variants={itemVariants} className="space-y-8">
          
          {/* Page Header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Profile</h1>
            <p className="text-muted-foreground">Manage your mentee identity and preferences to find the best match.</p>
          </div>

          {/* Status Messages */}
          {state.error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <Alert variant="destructive" className="shadow-sm">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {state.success && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <Alert className="border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400 shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{state.success}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Profile Header Component */}
          <ProfileHeader
            user={baseUser}
            userRole="mentee"
            isEditing={state.isEditing}
            isSaving={state.isSaving}
            onToggleEdit={() => actions.setIsEditing(!state.isEditing)}
            onSave={handleSave}
            onCancel={handleCancel}
          />

          {/* Main Form Content */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-primary">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl font-semibold text-foreground">
                   Career Information
                </CardTitle>
              </div>
              <CardDescription>
                Your professional background helps mentors understand your path.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-8 p-6 md:p-8">
              {/* Current Role & Company */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Current Role <span className="text-red-500">*</span>
                  </Label>
                  {state.isEditing ? (
                    <Input
                      value={state.data.currentRole}
                      onChange={(e) => handleInputChange('currentRole', e.target.value)}
                      placeholder="e.g., Software Engineer, Student"
                      maxLength={100}
                      className="transition-all focus-visible:ring-primary/20"
                    />
                  ) : (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800">
                      {state.data.currentRole || <span className="text-muted-foreground italic">Not specified</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Company / School <span className="text-red-500">*</span>
                  </Label>
                  {state.isEditing ? (
                    <Input
                      value={state.data.currentCompany}
                      onChange={(e) => handleInputChange('currentCompany', e.target.value)}
                      placeholder="e.g., Google, Stanford University"
                      maxLength={100}
                      className="transition-all focus-visible:ring-primary/20"
                    />
                  ) : (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800">
                      {state.data.currentCompany || <span className="text-muted-foreground italic">Not specified</span>}
                    </div>
                  )}
                </div>
              </motion.div>

              <Separator className="bg-slate-100 dark:bg-slate-800" />

              {/* Education */}
              <motion.div variants={itemVariants} className="space-y-3">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  Education Background
                </Label>
                {state.isEditing ? (
                  <Textarea
                    value={state.data.education}
                    onChange={(e) => handleInputChange('education', e.target.value)}
                    placeholder="e.g., BS Computer Science from University of California, Berkeley (2020)"
                    className="min-h-[100px] resize-none transition-all focus-visible:ring-primary/20"
                    maxLength={500}
                  />
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 min-h-[60px] whitespace-pre-wrap">
                    {state.data.education || <span className="text-muted-foreground italic">Not specified</span>}
                  </div>
                )}
              </motion.div>

              {/* Career Goals */}
              <motion.div variants={itemVariants} className="space-y-3">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Career Goals <span className="text-red-500">*</span>
                </Label>
                {state.isEditing ? (
                  <Textarea
                    value={state.data.careerGoals}
                    onChange={(e) => handleInputChange('careerGoals', e.target.value)}
                    placeholder="Describe your career aspirations, what you want to achieve..."
                    className="min-h-[120px] resize-none transition-all focus-visible:ring-primary/20"
                    maxLength={1000}
                  />
                ) : (
                  <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 rounded-lg border border-amber-100 dark:border-amber-900/20 whitespace-pre-wrap">
                    {state.data.careerGoals || <span className="text-muted-foreground italic">Not specified</span>}
                  </div>
                )}
              </motion.div>

              <Separator className="bg-slate-100 dark:bg-slate-800" />

              {/* Skills Section */}
              <motion.div variants={itemVariants} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Code className="h-4 w-4 text-muted-foreground" />
                    Current Skills
                  </Label>
                  {state.isEditing ? (
                    <Textarea
                      value={state.data.currentSkills}
                      onChange={(e) => handleInputChange('currentSkills', e.target.value)}
                      placeholder="e.g., JavaScript, Python, React, Node.js, SQL"
                      maxLength={500}
                      className="transition-all focus-visible:ring-primary/20"
                    />
                  ) : (
                    <div className="min-h-[44px]">
                      {state.data.currentSkills ? (
                        <div className="flex flex-wrap gap-2">
                          {state.data.currentSkills.split(',').map((skill, index) => (
                            <Badge key={index} variant="secondary" className="px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">
                              {skill.trim()}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Not specified</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    Skills to Learn
                  </Label>
                  {state.isEditing ? (
                    <Textarea
                      value={state.data.skillsToLearn}
                      onChange={(e) => handleInputChange('skillsToLearn', e.target.value)}
                      placeholder="e.g., Machine Learning, Cloud Architecture, Leadership"
                      maxLength={500}
                      className="transition-all focus-visible:ring-primary/20"
                    />
                  ) : (
                    <div className="min-h-[44px]">
                      {state.data.skillsToLearn ? (
                        <div className="flex flex-wrap gap-2">
                          {state.data.skillsToLearn.split(',').map((skill, index) => (
                            <Badge key={index} variant="outline" className="px-3 py-1 border-primary/20 text-primary bg-primary/5">
                              {skill.trim()}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Not specified</span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>

              <Separator className="bg-slate-100 dark:bg-slate-800" />

              {/* Interests & Preferences */}
              <motion.div variants={itemVariants} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-500" />
                    Interests
                  </Label>
                  {state.isEditing ? (
                    <Textarea
                      value={state.data.interests}
                      onChange={(e) => handleInputChange('interests', e.target.value)}
                      placeholder="e.g., Artificial Intelligence, Startups, Open Source"
                      maxLength={500}
                      className="transition-all focus-visible:ring-primary/20"
                    />
                  ) : (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 min-h-[60px] whitespace-pre-wrap">
                      {state.data.interests || <span className="text-muted-foreground italic">Not specified</span>}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Brain className="h-4 w-4 text-muted-foreground" />
                      Learning Style
                    </Label>
                    {state.isEditing ? (
                      <Select
                        value={state.data.learningStyle}
                        onValueChange={(value) => handleInputChange('learningStyle', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select learning style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visual">Visual Learner</SelectItem>
                          <SelectItem value="hands-on">Hands-on Learner</SelectItem>
                          <SelectItem value="theoretical">Theoretical Learner</SelectItem>
                          <SelectItem value="interactive">Interactive Learner</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 flex items-center">
                        {state.data.learningStyle ? (
                          <span className="capitalize">{state.data.learningStyle.replace('-', ' ')} Learner</span>
                        ) : (
                          <span className="text-muted-foreground italic">Not specified</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Meeting Frequency
                    </Label>
                    {state.isEditing ? (
                      <Select
                        value={state.data.preferredMeetingFrequency}
                        onValueChange={(value) => handleInputChange('preferredMeetingFrequency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly Sessions</SelectItem>
                          <SelectItem value="bi-weekly">Bi-weekly Sessions</SelectItem>
                          <SelectItem value="monthly">Monthly Sessions</SelectItem>
                          <SelectItem value="as-needed">As Needed</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 flex items-center">
                         {state.data.preferredMeetingFrequency ? (
                          <span className="capitalize">{state.data.preferredMeetingFrequency.replace('-', ' ')}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Not specified</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
})

MenteeProfileComponent.displayName = 'MenteeProfileComponent'

export const MenteeProfile: React.FC = () => {
  return (
    <ProfileErrorBoundary
      onError={(error, errorInfo) => {
        console.error('MenteeProfile Error:', error, errorInfo)
      }}
    >
      <MenteeProfileComponent />
    </ProfileErrorBoundary>
  )
}