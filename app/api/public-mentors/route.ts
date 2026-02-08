// app/api/public-mentors/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mentors, users } from '@/lib/db/schema'
import { and, eq, ilike, or, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys'
import { checkFeatureAccess, trackFeatureUsage } from '@/lib/subscriptions/enforcement'

// Force Node runtime (DB drivers), and avoid any ISR caching
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Pagination
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') ?? '12')))
    const offset = (page - 1) * pageSize

    // Filters
    const q = (searchParams.get('q') ?? '').trim()
    const industry = (searchParams.get('industry') ?? '').trim()
    const availableOnly = (searchParams.get('availableOnly') ?? 'true') === 'true'
    const aiSearch = (searchParams.get('ai') ?? 'false') === 'true'

    let requesterId: string | null = null
    const resolveFeatureAccess = async (userId: string, primaryKey: string, fallbackKey?: string) => {
      const primary = await checkFeatureAccess(userId, primaryKey).catch(() => null)
      if (primary?.has_access) {
        return { key: primaryKey, access: primary }
      }
      if (fallbackKey) {
        const fallback = await checkFeatureAccess(userId, fallbackKey).catch(() => null)
        if (fallback?.has_access) {
          return { key: fallbackKey, access: fallback }
        }
        return { key: primaryKey, access: primary || fallback }
      }
      return { key: primaryKey, access: primary }
    }

    type ResolveFeatureAccessResult = Awaited<ReturnType<typeof resolveFeatureAccess>>;
    let requesterAccess: ResolveFeatureAccessResult | null = null;

    if (aiSearch) {
      const session = await auth.api.getSession({ headers: req.headers })
      requesterId = session?.user?.id || null

      if (!requesterId) {
        return NextResponse.json(
          { success: false, error: 'Authentication required for AI search' },
          { status: 401 }
        )
      }

      requesterAccess = await resolveFeatureAccess(
        requesterId,
        FEATURE_KEYS.AI_SEARCH_SESSIONS,
        FEATURE_KEYS.AI_SEARCH_SESSIONS_MONTHLY
      )
      if (!requesterAccess.access?.has_access) {
        return NextResponse.json(
          { success: false, error: requesterAccess.access?.reason || 'AI search not included in your plan' },
          { status: 403 }
        )
      }
    }

    // WHERE clauses
    const whereClauses: any[] = [eq(mentors.verificationStatus, 'VERIFIED' as const)]
    if (availableOnly) whereClauses.push(eq(mentors.isAvailable, true))
    if (industry) whereClauses.push(ilike(mentors.industry, `%${industry}%`))
    if (q) {
      // Adjust fields to match your schema (users.name/title/company present in your select below)
      whereClauses.push(
        or(
          ilike(users.name, `%${q}%`),
          ilike(mentors.title, `%${q}%`),
          ilike(mentors.company, `%${q}%`)
        )
      )
    }

    // Main page of mentors (safe public fields)
    const rows = await db
      .select({
        id: mentors.id,
        userId: mentors.userId,
        title: mentors.title,
        company: mentors.company,
        industry: mentors.industry,
        expertise: mentors.expertise,
        experience: mentors.experience,          // number
        hourlyRate: mentors.hourlyRate,          // string in your schema
        currency: mentors.currency,
        headline: mentors.headline,
        about: mentors.about,
        linkedinUrl: mentors.linkedinUrl,
        githubUrl: mentors.githubUrl,
        websiteUrl: mentors.websiteUrl,
        verificationStatus: mentors.verificationStatus,
        isAvailable: mentors.isAvailable,
        // joined user basics
        name: users.name,
        image: users.image,
      })
      .from(mentors)
      .innerJoin(users, eq(mentors.userId, users.id))
      .where(and(...whereClauses))
      .orderBy(desc(mentors.createdAt))
      .limit(pageSize)
      .offset(offset)

    let filteredRows = rows

    if (aiSearch && requesterId) {
      if (filteredRows.length > 0) {
        const eligibilityChecks = await Promise.all(
          filteredRows.map(async (row) => {
            try {
              const [freeAccess, paidAccess, visibilityAccess] = await Promise.all([
                checkFeatureAccess(row.userId, FEATURE_KEYS.FREE_VIDEO_SESSIONS_MONTHLY),
                checkFeatureAccess(row.userId, FEATURE_KEYS.PAID_VIDEO_SESSIONS_MONTHLY),
                resolveFeatureAccess(row.userId, FEATURE_KEYS.AI_VISIBILITY),
              ])
              const hasFreeRemaining = freeAccess.has_access && (typeof freeAccess.remaining !== 'number' || freeAccess.remaining > 0)
              const hasPaidRemaining = paidAccess.has_access && (typeof paidAccess.remaining !== 'number' || paidAccess.remaining > 0)
              return {
                row,
                eligible: hasFreeRemaining || hasPaidRemaining,
                visibilityKey: visibilityAccess?.key ?? null,
                visibilityAccess,
              }
            } catch (error) {
              console.error('Failed to check mentor eligibility:', error)
              return { row, eligible: false, visibilityKey: null, visibilityAccess: null }
            }
          })
        )

        const eligibleMentors = eligibilityChecks.filter((item) => item.eligible)
        filteredRows = eligibleMentors.map((item) => item.row)

        const visibilityKeyByUser = new Map(
          eligibleMentors
            .filter((item) => item.visibilityAccess?.access?.has_access && item.visibilityKey)
            .map((item) => [item.row.userId, item.visibilityKey as string])
        )

        if (requesterAccess?.access?.has_access) {
          await trackFeatureUsage(
            requesterId,
            requesterAccess.key,
            { count: 1 },
            'ai_search'
          )
        }

        for (const row of filteredRows) {
          const visibilityKey = visibilityKeyByUser.get(row.userId)
          if (!visibilityKey) continue
          try {
            await trackFeatureUsage(
              row.userId,
              visibilityKey,
              { count: 1 },
              'mentor_profile',
              row.id
            )
          } catch (error) {
            console.error('Failed to track mentor visibility:', error)
          }
        }
      }
    }

    // Lightweight pagination (no expensive COUNT)
    const hasMore = filteredRows.length === pageSize

    return NextResponse.json({
      success: true,
      data: filteredRows,
      pagination: { page, pageSize, hasMore }
    })
  } catch (error: any) {
    // Log the full error on the server for debugging
    console.error('Error fetching public mentors:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mentors' },
      { status: 500 }
    )
  }
}
