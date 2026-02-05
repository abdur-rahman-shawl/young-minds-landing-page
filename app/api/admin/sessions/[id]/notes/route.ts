import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions, adminSessionNotes, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getUserWithRoles } from '@/lib/db/user-helpers';
import { logAdminSessionAction, ADMIN_SESSION_ACTIONS } from '@/lib/db/admin-session-audit';
import { z } from 'zod';

// Request body schema for POST
const addNoteSchema = z.object({
    note: z.string().min(1, 'Note is required').max(5000, 'Note too long'),
});

/**
 * Ensure the request is from an admin user
 */
async function ensureAdmin(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session?.user) {
            return { error: NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 }) };
        }

        const userWithRoles = await getUserWithRoles(session.user.id);
        const isAdmin = userWithRoles?.roles?.some((role: any) => role.name === 'admin');

        if (!isAdmin) {
            return { error: NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 }) };
        }

        return { session, userId: session.user.id };
    } catch (error) {
        console.error('Admin auth check failed:', error);
        return { error: NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 401 }) };
    }
}

/**
 * GET /api/admin/sessions/[id]/notes
 * Get all admin notes for a session
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminCheck = await ensureAdmin(request);
        if ('error' in adminCheck) {
            return adminCheck.error;
        }

        const { id: sessionId } = await params;

        // Verify session exists
        const [sessionData] = await db
            .select({ id: sessions.id })
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1);

        if (!sessionData) {
            return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
        }

        // Get all notes for this session
        const notes = await db
            .select({
                id: adminSessionNotes.id,
                note: adminSessionNotes.note,
                adminId: adminSessionNotes.adminId,
                createdAt: adminSessionNotes.createdAt,
                updatedAt: adminSessionNotes.updatedAt,
            })
            .from(adminSessionNotes)
            .where(eq(adminSessionNotes.sessionId, sessionId))
            .orderBy(desc(adminSessionNotes.createdAt));

        // Get admin names
        const adminIds = [...new Set(notes.map(n => n.adminId).filter(Boolean))];
        let adminMap: Map<string, string> = new Map();

        if (adminIds.length > 0) {
            for (const adminId of adminIds) {
                if (adminId) {
                    const [admin] = await db
                        .select({ id: users.id, name: users.name })
                        .from(users)
                        .where(eq(users.id, adminId))
                        .limit(1);
                    if (admin?.name) {
                        adminMap.set(admin.id, admin.name);
                    }
                }
            }
        }

        const enrichedNotes = notes.map(note => ({
            id: note.id,
            note: note.note,
            adminId: note.adminId,
            adminName: note.adminId ? adminMap.get(note.adminId) || null : null,
            createdAt: note.createdAt?.toISOString(),
            updatedAt: note.updatedAt?.toISOString(),
        }));

        return NextResponse.json({
            success: true,
            data: enrichedNotes,
        });
    } catch (error) {
        console.error('Admin notes GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch notes' }, { status: 500 });
    }
}

/**
 * POST /api/admin/sessions/[id]/notes
 * Add a new admin note to a session
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminCheck = await ensureAdmin(request);
        if ('error' in adminCheck) {
            return adminCheck.error;
        }

        const { id: sessionId } = await params;
        const body = await request.json();

        // Validate request body
        const validationResult = addNoteSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({
                success: false,
                error: validationResult.error.errors[0]?.message || 'Invalid request'
            }, { status: 400 });
        }

        const { note } = validationResult.data;

        // Verify session exists
        const [sessionData] = await db
            .select({ id: sessions.id })
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1);

        if (!sessionData) {
            return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
        }

        // Insert new note
        const [newNote] = await db
            .insert(adminSessionNotes)
            .values({
                sessionId,
                adminId: adminCheck.userId,
                note,
            })
            .returning();

        // Log admin action
        await logAdminSessionAction({
            adminId: adminCheck.userId,
            sessionId,
            action: ADMIN_SESSION_ACTIONS.NOTE_ADDED,
            details: {
                noteId: newNote.id,
                notePreview: note.substring(0, 100),
            },
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
        });

        return NextResponse.json({
            success: true,
            message: 'Note added successfully',
            data: {
                id: newNote.id,
                note: newNote.note,
                createdAt: newNote.createdAt?.toISOString(),
            },
        });
    } catch (error) {
        console.error('Admin notes POST error:', error);
        return NextResponse.json({ success: false, error: 'Failed to add note' }, { status: 500 });
    }
}
