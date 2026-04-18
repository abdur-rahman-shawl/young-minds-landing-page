"use client"

import { useState, useCallback, useMemo } from 'react'
import type { 
  ProfileState, 
  ProfileActions
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
