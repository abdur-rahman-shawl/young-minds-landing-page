"use client"

import React, { useCallback, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
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
  Loader2
} from "lucide-react"

import { ProfileHeader } from "@/components/shared/profile/profile-header"
import { useProfileLoader, ProfileApiService, ProfileValidators } from "@/components/shared/profile/base-profile"
import { ProfileErrorBoundary } from "@/components/shared/profile/profile-error-boundary"
import type { 
  MenteeProfile, 
  BaseUser, 
  LEARNING_STYLES, 
  MEETING_FREQUENCIES,
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

/**
 * Production-grade Mentee Profile Component
 * Features: Type safety, error handling, validation, accessibility, performance optimization
 */
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
    // Clear any field-specific errors
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
    // Reload profile data to reset changes without full page reload
    reloadProfile()
  }, [actions.setIsEditing, actions.setError, actions.setSuccess, reloadProfile])

  if (state.isLoading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-8 animate-pulse">
            <div className="h-32 bg-muted rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground">Manage your mentee profile and preferences</p>
          </div>

          {/* Status Messages */}
          {state.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {state.error}
              </AlertDescription>
            </Alert>
          )}

          {state.success && (
            <Alert className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {state.success}
              </AlertDescription>
            </Alert>
          )}

          {/* Profile Header */}
          <ProfileHeader
            user={baseUser}
            userRole="mentee"
            isEditing={state.isEditing}
            isSaving={state.isSaving}
            onToggleEdit={() => actions.setIsEditing(!state.isEditing)}
            onSave={handleSave}
            onCancel={handleCancel}
          />

          {/* Profile Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Career Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Current Role & Company */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Current Role *
                  </Label>
                  {state.isEditing ? (
                    <Input
                      value={state.data.currentRole}
                      onChange={(e) => handleInputChange('currentRole', e.target.value)}
                      placeholder="e.g., Software Engineer, Student"
                      maxLength={100}
                      aria-required="true"
                    />
                  ) : (
                    <p className="text-foreground bg-muted rounded-lg px-4 py-3 min-h-[44px] flex items-center">
                      {state.data.currentRole || <span className="text-muted-foreground">Not specified</span>}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Company / School *
                  </Label>
                  {state.isEditing ? (
                    <Input
                      value={state.data.currentCompany}
                      onChange={(e) => handleInputChange('currentCompany', e.target.value)}
                      placeholder="e.g., Google, Stanford University"
                      maxLength={100}
                      aria-required="true"
                    />
                  ) : (
                    <p className="text-foreground bg-muted rounded-lg px-4 py-3 min-h-[44px] flex items-center">
                      {state.data.currentCompany || <span className="text-muted-foreground">Not specified</span>}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Education */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Education Background
                </Label>
                {state.isEditing ? (
                  <Textarea
                    value={state.data.education}
                    onChange={(e) => handleInputChange('education', e.target.value)}
                    placeholder="e.g., BS Computer Science from University of California, Berkeley (2020)"
                    className="min-h-[100px]"
                    maxLength={500}
                  />
                ) : (
                  <p className="text-foreground bg-muted rounded-lg px-4 py-3 min-h-[44px] flex items-center whitespace-pre-wrap">
                    {state.data.education || <span className="text-muted-foreground">Not specified</span>}
                  </p>
                )}
              </div>

              {/* Career Goals */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Career Goals *
                </Label>
                {state.isEditing ? (
                  <Textarea
                    value={state.data.careerGoals}
                    onChange={(e) => handleInputChange('careerGoals', e.target.value)}
                    placeholder="Describe your career aspirations, what you want to achieve..."
                    className="min-h-[120px]"
                    maxLength={1000}
                    aria-required="true"
                  />
                ) : (
                  <p className="text-foreground bg-muted rounded-lg px-4 py-3 min-h-[44px] whitespace-pre-wrap">
                    {state.data.careerGoals || <span className="text-muted-foreground">Not specified</span>}
                  </p>
                )}
              </div>

              <Separator />

              {/* Skills Section */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Current Skills
                  </Label>
                  {state.isEditing ? (
                    <Textarea
                      value={state.data.currentSkills}
                      onChange={(e) => handleInputChange('currentSkills', e.target.value)}
                      placeholder="e.g., JavaScript, Python, React, Node.js, SQL"
                      maxLength={500}
                    />
                  ) : (
                    <div className="bg-muted rounded-lg px-4 py-3 min-h-[44px]">
                      {state.data.currentSkills ? (
                        <div className="flex flex-wrap gap-2">
                          {state.data.currentSkills.split(',').map((skill, index) => (
                            <Badge key={index} variant="secondary">
                              {skill.trim()}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not specified</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Skills to Learn
                  </Label>
                  {state.isEditing ? (
                    <Textarea
                      value={state.data.skillsToLearn}
                      onChange={(e) => handleInputChange('skillsToLearn', e.target.value)}
                      placeholder="e.g., Machine Learning, Cloud Architecture, Leadership"
                      maxLength={500}
                    />
                  ) : (
                    <div className="bg-muted rounded-lg px-4 py-3 min-h-[44px]">
                      {state.data.skillsToLearn ? (
                        <div className="flex flex-wrap gap-2">
                          {state.data.skillsToLearn.split(',').map((skill, index) => (
                            <Badge key={index} variant="outline">
                              {skill.trim()}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not specified</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Interests & Preferences */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Interests
                  </Label>
                  {state.isEditing ? (
                    <Textarea
                      value={state.data.interests}
                      onChange={(e) => handleInputChange('interests', e.target.value)}
                      placeholder="e.g., Artificial Intelligence, Startups, Open Source"
                      maxLength={500}
                    />
                  ) : (
                    <p className="text-foreground bg-muted rounded-lg px-4 py-3 min-h-[44px] whitespace-pre-wrap">
                      {state.data.interests || <span className="text-muted-foreground">Not specified</span>}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                      <Brain className="h-4 w-4" />
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
                      <p className="text-foreground bg-muted rounded-lg px-4 py-3 min-h-[44px] flex items-center">
                        {state.data.learningStyle ? (
                          <span>
                            {state.data.learningStyle === 'visual' && 'Visual Learner'}
                            {state.data.learningStyle === 'hands-on' && 'Hands-on Learner'}
                            {state.data.learningStyle === 'theoretical' && 'Theoretical Learner'}
                            {state.data.learningStyle === 'interactive' && 'Interactive Learner'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Not specified</span>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
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
                      <p className="text-foreground bg-muted rounded-lg px-4 py-3 min-h-[44px] flex items-center">
                        {state.data.preferredMeetingFrequency ? (
                          <span>
                            {state.data.preferredMeetingFrequency === 'weekly' && 'Weekly Sessions'}
                            {state.data.preferredMeetingFrequency === 'bi-weekly' && 'Bi-weekly Sessions'}
                            {state.data.preferredMeetingFrequency === 'monthly' && 'Monthly Sessions'}
                            {state.data.preferredMeetingFrequency === 'as-needed' && 'As Needed'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Not specified</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
})

MenteeProfileComponent.displayName = 'MenteeProfileComponent'

/**
 * Production-ready MenteeProfile with comprehensive error handling
 */
export const MenteeProfile: React.FC = () => {
  return (
    <ProfileErrorBoundary
      onError={(error, errorInfo) => {
        console.error('MenteeProfile Error:', error, errorInfo)
        // In production, this would send to error monitoring service
        // e.g., Sentry.captureException(error, { extra: errorInfo })
      }}
    >
      <MenteeProfileComponent />
    </ProfileErrorBoundary>
  )
}
