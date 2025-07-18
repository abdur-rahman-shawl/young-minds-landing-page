import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // API route protection
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Skip auth routes
    if (request.nextUrl.pathname.startsWith('/api/auth/')) {
      return NextResponse.next();
    }

    // Check for session cookie (BetterAuth sets this)
    const sessionCookie = request.cookies.get('better-auth.session_token');
    
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/user/:path*',
    '/api/mentors/:path*',
    '/api/sessions/:path*',
    '/api/messages/:path*',
  ],
}; 