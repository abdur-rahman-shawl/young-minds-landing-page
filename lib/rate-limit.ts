import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// In production, you'd want to use Redis or another persistent store
const requestCounts = new Map<string, RequestRecord>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 60000); // Clean up every minute

export class RateLimitError extends Error {
  public statusCode: number = 429;
  public retryAfter: number;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export function rateLimit(config: RateLimitConfig) {
  return {
    check: (request: NextRequest, identifier?: string): void => {
      const now = Date.now();
      
      // Create a unique identifier for the request
      const clientId = identifier || getClientIdentifier(request);
      const key = `${clientId}:${request.nextUrl.pathname}`;
      
      // Get or create record
      let record = requestCounts.get(key);
      
      if (!record || now > record.resetTime) {
        // First request in window or window has expired
        record = {
          count: 1,
          resetTime: now + config.windowMs,
        };
        requestCounts.set(key, record);
        return;
      }
      
      // Check if limit exceeded
      if (record.count >= config.maxRequests) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        throw new RateLimitError(
          `Too many requests. Try again in ${retryAfter} seconds.`,
          retryAfter
        );
      }
      
      // Increment count
      record.count++;
      requestCounts.set(key, record);
    }
  };
}

function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from session/auth
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // In a real app, you'd decode the JWT and get the user ID
    return `user:${authHeader.slice(0, 20)}`; // Use part of auth token
  }
  
  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
  return `ip:${ip}`;
}

// Predefined rate limiters for different operations
export const bookingRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 booking operations per minute
});

export const notificationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute  
  maxRequests: 30, // 30 notification operations per minute
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 auth attempts per 15 minutes
});