import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/mentor-signup',
  '/become-expert',
];

// Admin-only routes
const ADMIN_ROUTES = [
  '/admin',
];

// Mentor-only routes
const MENTOR_ROUTES = [
  '/mentor-dashboard',
  '/mentor/profile',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API route protection
  if (pathname.startsWith('/api/')) {
    return await handleApiProtection(request);
  }

  // Page route protection
  return await handlePageProtection(request);
}

async function handleApiProtection(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth routes and public API routes
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('better-auth.session_token');
  
  if (!sessionCookie) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // For admin API routes, basic auth check - role verification in route handlers
  if (pathname.startsWith('/api/admin/')) {
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      // Role verification moved to individual API route handlers to avoid Edge Runtime issues
      // Each admin API route will verify admin role using database helpers
    } catch (error) {
      console.error('Session check failed:', error);
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 500 }
      );
    }
  }

  return NextResponse.next();
}

async function handlePageProtection(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route requires protection
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  const isAdminRoute = ADMIN_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  const isMentorRoute = MENTOR_ROUTES.some(route => 
    pathname.startsWith(route)
  );

  if (!isProtectedRoute && !isAdminRoute && !isMentorRoute) {
    return NextResponse.next();
  }

  // Check session
  const sessionCookie = request.cookies.get('better-auth.session_token');
  
  if (!sessionCookie) {
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For role-specific routes, basic auth check - role verification in page components
  if (isAdminRoute || isMentorRoute) {
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session?.user) {
        const loginUrl = new URL('/auth', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
      
      // Role verification moved to page components via AuthContext to avoid Edge Runtime issues
      // Pages will handle role-based redirects using client-side auth state
    } catch (error) {
      console.error('Session check failed:', error);
      return NextResponse.redirect(new URL('/auth?error=verification-failed', request.url));
    }
  }

  return NextResponse.next();
}

// Note: Database-dependent role verification has been moved to:
// 1. Individual API route handlers (for API security)
// 2. Page components via AuthContext (for page access control)
// This avoids Edge Runtime compatibility issues while maintaining security

export const config = {
  matcher: [
    // API routes
    '/api/user/:path*',
    '/api/mentors/:path*',
    '/api/sessions/:path*',
    '/api/messages/:path*',
    '/api/admin/:path*',
    '/api/saved-mentors/:path*',
    
    // Protected page routes
    '/dashboard/:path*',
    '/mentor-signup/:path*',
    '/become-expert/:path*',
    '/admin/:path*',
    '/mentor-dashboard/:path*',
    '/mentor/profile/:path*',
  ],
}; 