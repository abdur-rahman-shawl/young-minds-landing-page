import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserWithRoles, type UserRole } from '@/lib/db/user-helpers';

interface GuardError {
  error: NextResponse;
}

interface SessionGuardSuccess {
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
}

interface RoleGuardSuccess extends SessionGuardSuccess {
  user: NonNullable<Awaited<ReturnType<typeof getUserWithRoles>>>;
}

const unauthorizedResponse = () =>
  NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

const forbiddenResponse = (message: string) =>
  NextResponse.json({ success: false, error: message }, { status: 403 });

const notFoundResponse = (message: string) =>
  NextResponse.json({ success: false, error: message }, { status: 404 });

export async function requireSession(request: NextRequest): Promise<SessionGuardSuccess | GuardError> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return { error: unauthorizedResponse() };
    }

    return { session };
  } catch (error) {
    console.error('Authentication check failed:', error);
    return { error: unauthorizedResponse() };
  }
}

export async function requireUserWithRoles(
  request: NextRequest
): Promise<RoleGuardSuccess | GuardError> {
  const sessionResult = await requireSession(request);
  if ('error' in sessionResult) {
    return sessionResult;
  }

  const user = await getUserWithRoles(sessionResult.session.user.id);
  if (!user) {
    return { error: notFoundResponse('User not found') };
  }

  return { session: sessionResult.session, user };
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[]
): Promise<RoleGuardSuccess | GuardError> {
  const sessionResult = await requireUserWithRoles(request);
  if ('error' in sessionResult) {
    return sessionResult;
  }

  const roleNames = sessionResult.user.roles.map((role) => role.name);
  const hasRole = allowedRoles.some((role) => roleNames.includes(role));

  if (!hasRole) {
    return { error: forbiddenResponse('Access denied') };
  }

  return sessionResult;
}

export async function requireAdmin(request: NextRequest) {
  return requireRole(request, ['admin']);
}

export async function requireMentor(request: NextRequest, allowAdmin = false) {
  return requireRole(request, allowAdmin ? ['mentor', 'admin'] : ['mentor']);
}

export async function requireMentee(request: NextRequest, allowAdmin = false) {
  return requireRole(request, allowAdmin ? ['mentee', 'admin'] : ['mentee']);
}
