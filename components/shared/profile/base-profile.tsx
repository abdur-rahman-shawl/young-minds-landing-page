"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { 
  BaseUser, 
  ProfileState, 
  ProfileActions, 
  ApiResponse, 
  ProfileApiData 
} from './profile-types'

/**
 * Custom hook for managing profile state with type safety and stable references
 * Production-grade implementation with memoized actions to prevent infinite re-renders
 */
export function useProfileState<T>(initialData: T): [ProfileState<T>, ProfileActions<T>] {
  const [state, setState] = useState<ProfileState<T>>({
    data: initialData,
    isLoading: true,
    isEditing: false,
    isSaving: false,
    error: null,
    success: null
  })

  // Memoize individual action functions with stable references
  const setData = useCallback((data: T | ((prev: T) => T)) => {
    setState(prev => ({
      ...prev,
      data: typeof data === 'function' ? (data as (prev: T) => T)(prev.data) : data
    }))
  }, [])
  
  const setIsLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }))
  }, [])
  
  const setIsEditing = useCallback((editing: boolean) => {
    setState(prev => ({ 
      ...prev, 
      isEditing: editing,
      error: null,
      success: null 
    }))
  }, [])
  
  const setIsSaving = useCallback((saving: boolean) => {
    setState(prev => ({ ...prev, isSaving: saving }))
  }, [])
  
  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, success: null }))
  }, [])
  
  const setSuccess = useCallback((success: string | null) => {
    setState(prev => ({ 
      ...prev, 
      success, 
      error: null,
      isEditing: success ? false : prev.isEditing
    }))
  }, [])

  // Memoize the actions object with stable references to prevent infinite loops
  const actions = useMemo<ProfileActions<T>>(() => ({
    setData,
    setIsLoading,
    setIsEditing,
    setIsSaving,
    setError,
    setSuccess
  }), [setData, setIsLoading, setIsEditing, setIsSaving, setError, setSuccess])

  return [state, actions]
}

/**
 * Secure API service for profile operations
 */
export class ProfileApiService {
  private static readonly BASE_URL = '/api/user/profile'
  private static readonly REQUEST_TIMEOUT = 10000 // 10 seconds
  
  static async loadProfile(userId: string): Promise<ApiResponse<ProfileApiData>> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT)
      
      const response = await fetch(`${this.BASE_URL}?userId=${encodeURIComponent(userId)}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load profile')
      }
      
      return result
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { success: false, error: 'Request timeout. Please try again.' }
        }
        return { success: false, error: error.message }
      }
      return { success: false, error: 'An unexpected error occurred' }
    }
  }
  
  static async saveProfile<T>(
    userId: string, 
    profileData: T, 
    action: 'create-mentee-profile' | 'update-mentor-profile'
  ): Promise<ApiResponse> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT)
      
      const response = await fetch(this.BASE_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          action: action,
          profileData: profileData
        })
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save profile')
      }
      
      return result
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { success: false, error: 'Request timeout. Please try again.' }
        }
        return { success: false, error: error.message }
      }
      return { success: false, error: 'An unexpected error occurred' }
    }
  }
}

/**
 * Custom hook for profile data loading with error handling and concurrency protection
 * Production-grade implementation with request deduplication and cleanup
 */
export function useProfileLoader<T>(
  userId: string | undefined,
  extractProfileData: (data: ProfileApiData) => T,
  initialData: T,
  onError?: (error: string) => void
) {
  const [state, actions] = useProfileState(initialData)
  
  // Ref to track current request and prevent concurrent calls
  const currentRequestRef = useRef<AbortController | null>(null)
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadProfile = useCallback(async () => {
    const requestId = `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ProfileLoader:${requestId}] Starting profile load for userId: ${userId}`)
    }

    if (!userId) {
      console.warn(`[ProfileLoader:${requestId}] No userId provided`)
      actions.setError('User ID is required')
      actions.setIsLoading(false)
      return
    }

    // Prevent concurrent requests - critical for production stability
    if (currentRequestRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[ProfileLoader:${requestId}] Aborting previous request`)
      }
      currentRequestRef.current.abort()
    }

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[ProfileLoader:${requestId}] Setting loading state to true`)
      }
      actions.setIsLoading(true)
      actions.setError(null)
      
      // Create new abort controller for this request
      const controller = new AbortController()
      currentRequestRef.current = controller
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[ProfileLoader:${requestId}] Making API call`)
      }
      
      const result = await ProfileApiService.loadProfile(userId)
      
      // Check if request was aborted
      if (controller.signal.aborted) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[ProfileLoader:${requestId}] Request was aborted`)
        }
        return
      }
      
      if (result.success && result.data) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[ProfileLoader:${requestId}] Profile loaded successfully`)
        }
        const profileData = extractProfileData(result.data)
        actions.setData(profileData)
      } else {
        const errorMessage = result.error || 'Failed to load profile'
        console.error(`[ProfileLoader:${requestId}] Profile loading failed: ${errorMessage}`)
        actions.setError(errorMessage)
        onError?.(errorMessage)
      }
    } catch (error) {
      // Don't update state if request was aborted
      if (currentRequestRef.current?.signal.aborted) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[ProfileLoader:${requestId}] Request was aborted in catch block`)
        }
        return
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to load profile'
      console.error(`[ProfileLoader:${requestId}] Profile loading error: ${errorMessage}`)
      actions.setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      // Only update loading state if request wasn't aborted
      if (!currentRequestRef.current?.signal.aborted) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[ProfileLoader:${requestId}] Setting loading state to false`)
        }
        actions.setIsLoading(false)
      }
      currentRequestRef.current = null
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[ProfileLoader:${requestId}] Request completed`)
      }
    }
  }, [userId, extractProfileData, onError])
  // Note: actions.setIsLoading, actions.setError, actions.setData are omitted because they are
  // memoized with empty dependency arrays and will never change during the component lifecycle

  // Cleanup function for component unmount
  useEffect(() => {
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ProfileLoader] useEffect triggered, calling loadProfile')
    }
    loadProfile()
  }, [loadProfile])

  return { state, actions, loadProfile }
}

/**
 * Utility functions for form validation
 */
export const ProfileValidators = {
  required: (value: string, fieldName: string): string | null => {
    if (!value?.trim()) {
      return `${fieldName} is required`
    }
    return null
  },
  
  email: (value: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (value && !emailRegex.test(value)) {
      return 'Please enter a valid email address'
    }
    return null
  },
  
  url: (value: string, fieldName: string): string | null => {
    if (!value) return null
    try {
      new URL(value)
      return null
    } catch {
      return `Please enter a valid ${fieldName} URL`
    }
  },
  
  maxLength: (value: string, max: number, fieldName: string): string | null => {
    if (value && value.length > max) {
      return `${fieldName} must be less than ${max} characters`
    }
    return null
  }
}