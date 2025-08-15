// Booking and Session Types

export interface BookingRequest {
  mentorId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  meetingType: 'video' | 'audio' | 'chat';
  location?: string;
}

export interface Session {
  id: string;
  mentorId: string;
  menteeId: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  duration: number;
  meetingType: 'video' | 'audio' | 'chat';
  meetingUrl?: string;
  location?: string;
  rate?: number;
  currency?: string;
  mentorNotes?: string;
  menteeNotes?: string;
  mentorRating?: number;
  menteeRating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MentorInfo {
  id: string;
  userId: string;
  fullName?: string;
  title?: string;
  company?: string;
  profileImageUrl?: string;
  hourlyRate?: number;
  currency?: string;
  about?: string;
  expertise?: string;
  isAvailable?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  isRead: boolean;
  isArchived: boolean;
  actionUrl?: string;
  actionText?: string;
  createdAt: Date;
  readAt?: Date;
  archivedAt?: Date;
}

export type NotificationType = 
  | 'BOOKING_REQUEST'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_RESCHEDULED'
  | 'SESSION_REMINDER'
  | 'SESSION_COMPLETED'
  | 'PAYMENT_RECEIVED'
  | 'MESSAGE_RECEIVED'
  | 'PROFILE_UPDATED'
  | 'SYSTEM_ANNOUNCEMENT';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface BookingResponse extends ApiResponse {
  booking?: Session;
}

export interface NotificationsResponse extends ApiResponse {
  notifications?: Notification[];
  unreadCount?: number;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Time slot types
export interface TimeSlot {
  time: Date;
  available: boolean;
  booked?: boolean;
}

// Booking form data
export interface BookingFormData {
  duration: number;
  meetingType: 'video' | 'audio' | 'chat';
  title: string;
  description?: string;
  location?: string;
}

// Calendar event types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: Session['status'];
  meetingType: Session['meetingType'];
  participantName?: string;
  participantAvatar?: string;
}

// Error types
export interface BookingError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormErrors {
  [key: string]: string;
}