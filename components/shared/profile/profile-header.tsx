"use client"

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, User, Edit3, Save, X, Camera } from "lucide-react"
import type { BaseUser } from './profile-types'

interface ProfileHeaderProps {
  readonly user: BaseUser
  readonly userRole: 'mentor' | 'mentee'
  readonly isEditing: boolean
  readonly isSaving: boolean
  readonly onToggleEdit: () => void
  readonly onSave?: () => void
  readonly onCancel?: () => void
  readonly showImageUpload?: boolean
  readonly onImageUpload?: () => void
  readonly isUploadingImage?: boolean
}

/**
 * Reusable profile header component with role-based styling
 * Handles common profile actions and maintains consistency across user types
 */
export const ProfileHeader = React.memo<ProfileHeaderProps>(({
  user,
  userRole,
  isEditing,
  isSaving,
  onToggleEdit,
  onSave,
  onCancel,
  showImageUpload = false,
  onImageUpload,
  isUploadingImage = false
}) => {
  const userInitials = user.name.split(' ').map(n => n[0]).join('') || 'U'
  const roleColors = {
    mentor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    mentee: 'bg-blue-50 text-blue-700 border-blue-200'
  }

  return (
    <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
      <CardContent className="p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 md:gap-8">
          <div className="relative group flex-shrink-0">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-white dark:ring-slate-800 shadow-xl">
              <AvatarImage
                src={user.image || undefined}
                alt={user.name}
                className="object-cover"
              />
              <AvatarFallback className="text-lg sm:text-xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            {showImageUpload && isEditing && (
              <div
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={onImageUpload}
                role="button"
                tabIndex={0}
                aria-label="Upload profile picture"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onImageUpload?.()
                  }
                }}
              >
                {isUploadingImage ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3 sm:space-y-4 text-center sm:text-left min-w-0">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate" data-testid="profile-name">
                {user.name}
              </h2>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                <Mail className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <span className="text-sm sm:text-base text-slate-600 dark:text-slate-400 truncate" data-testid="profile-email">
                  {user.email}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 flex-wrap">
              <Badge
                variant="secondary"
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm ${roleColors[userRole]}`}
                data-testid="user-role-badge"
              >
                <User className="h-3 w-3 mr-1" />
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </Badge>
              <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-green-200 text-green-700 dark:border-green-800 dark:text-green-400">
                Active
              </Badge>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto justify-center sm:justify-end flex-shrink-0">
            {!isEditing ? (
              <Button
                onClick={onToggleEdit}
                variant="outline"
                size="sm"
                className="gap-2 w-full sm:w-auto"
                data-testid="edit-profile-button"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit Profile</span>
              </Button>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={onSave}
                  size="sm"
                  className="gap-2 bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                  disabled={isSaving}
                  data-testid="save-profile-button"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span className="hidden xs:inline">Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save</span>
                    </>
                  )}
                </Button>
                <Button
                  onClick={onCancel}
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-1 sm:flex-none"
                  disabled={isSaving}
                  data-testid="cancel-edit-button"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

ProfileHeader.displayName = 'ProfileHeader'