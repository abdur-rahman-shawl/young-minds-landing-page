import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';


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

const SESSION_COOKIE_NAMES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
];

function getSessionCookie(request: NextRequest) {
  for (const name of SESSION_COOKIE_NAMES) {
    const cookie = request.cookies.get(name);
    if (cookie) {
      return cookie;
    }
  }

  return null;
}

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
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // For admin API routes, basic auth check - role verification in route handlers
  if (pathname.startsWith('/api/admin/')) {
    // Rely on cookie presence; individual admin routes verify the session & role.
    return NextResponse.next();
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
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For role-specific routes, basic auth check - role verification in page components
  // We rely on the session cookie presence here to avoid importing 'auth' in Edge Runtime
  if (isAdminRoute || isMentorRoute) {
    // If cookie exists (checked above), let the request through.
    // The specific page layouts will handle detailed session/role validation.
    return NextResponse.next();
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
