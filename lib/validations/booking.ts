import { z } from 'zod';

// Validation schemas for booking endpoints
export const createBookingSchema = z.object({
  mentorId: z.string().min(1, 'Mentor ID is required').max(255),
  title: z.string()
    .min(1, 'Session title is required')
    .max(200, 'Title must be less than 200 characters')
    .refine(
      (val) => val.trim().length > 0,
      'Title cannot be empty or contain only spaces'
    ),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  scheduledAt: z.string()
    .datetime('Invalid date format')
    .refine(
      (val) => {
        const date = new Date(val);
        const now = new Date();
        return date > now;
      },
      'Session must be scheduled in the future'
    ),
  duration: z.number()
    .min(15, 'Session must be at least 15 minutes')
    .max(240, 'Session cannot exceed 4 hours'),
  meetingType: z.enum(['video', 'audio', 'chat']),
  location: z.string()
    .max(500, 'Location must be less than 500 characters')
    .optional(),
});

export const updateBookingSchema = z.object({
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  title: z.string()
    .min(1, 'Session title is required')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  scheduledAt: z.string()
    .datetime('Invalid date format')
    .optional(),
  duration: z.number()
    .min(15, 'Session must be at least 15 minutes')
    .max(240, 'Session cannot exceed 4 hours')
    .optional(),
  meetingType: z.enum(['video', 'audio', 'chat']).optional(),
  location: z.string()
    .max(500, 'Location must be less than 500 characters')
    .optional(),
  meetingUrl: z.string().url('Invalid meeting URL').optional(),
  mentorNotes: z.string()
    .max(2000, 'Mentor notes must be less than 2000 characters')
    .optional(),
  menteeNotes: z.string()
    .max(2000, 'Mentee notes must be less than 2000 characters')
    .optional(),
  mentorRating: z.number()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5')
    .optional(),
  menteeRating: z.number()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5')
    .optional(),
});

export const notificationUpdateSchema = z.object({
  isRead: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const bulkNotificationSchema = z.object({
  action: z.enum(['mark_read', 'mark_unread', 'archive', 'unarchive', 'delete']),
  notificationIds: z.array(z.string()).min(1, 'At least one notification ID required').optional(),
  markAllAsRead: z.boolean().optional(),
});

// Rate limiting configuration
export const RATE_LIMITS = {
  // Booking operations
  CREATE_BOOKING: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3, // 3 booking requests per minute
  },
  UPDATE_BOOKING: {
    windowMs: 60 * 1000, // 1 minute  
    maxRequests: 10, // 10 updates per minute
  },
  // Notification operations
  NOTIFICATIONS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  },
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .replace(/on\w+='[^']*'/gi, ''); // Remove event handlers with single quotes
};

// Authorization checks
export const canUserAccessBooking = (userId: string, booking: { mentorId: string; menteeId: string }): boolean => {
  return booking.mentorId === userId || booking.menteeId === userId;
};

export const canUserModifyBooking = (
  userId: string, 
  booking: { mentorId: string; menteeId: string; status: string },
  requestedChanges: any
): boolean => {
  const isParticipant = canUserAccessBooking(userId, booking);
  
  if (!isParticipant) {
    return false;
  }

  // Users can cancel their own bookings
  if (requestedChanges.status === 'cancelled') {
    return true;
  }

  // Only mentors can mark sessions as completed
  if (requestedChanges.status === 'completed' && booking.mentorId !== userId) {
    return false;
  }

  // Users can add their own notes and ratings
  const isMentor = booking.mentorId === userId;
  if (requestedChanges.mentorNotes && !isMentor) {
    return false;
  }
  if (requestedChanges.mentorRating && isMentor) {
    return false; // Mentors can't rate themselves
  }
  if (requestedChanges.menteeRating && !isMentor) {
    return false; // Mentees can't rate themselves
  }

  return true;
};

// Business logic validations
export const validateBookingTime = (scheduledAt: Date, duration: number): string[] => {
  const errors: string[] = [];
  const now = new Date();
  const sessionEnd = new Date(scheduledAt.getTime() + duration * 60000);

  if (scheduledAt <= now) {
    errors.push('Session must be scheduled in the future');
  }

  if (scheduledAt.getTime() - now.getTime() < 30 * 60 * 1000) {
    errors.push('Sessions must be booked at least 30 minutes in advance');
  }

  // Check if it's within business hours (9 AM - 9 PM)
  const hour = scheduledAt.getHours();
  if (hour < 9 || hour >= 21) {
    errors.push('Sessions must be scheduled between 9 AM and 9 PM');
  }

  // Check if session doesn't extend past business hours
  const endHour = sessionEnd.getHours();
  if (endHour > 21) {
    errors.push('Session cannot extend past 9 PM');
  }

  return errors;
};

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type NotificationUpdateInput = z.infer<typeof notificationUpdateSchema>;
export type BulkNotificationInput = z.infer<typeof bulkNotificationSchema>;