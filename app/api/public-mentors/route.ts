// app/api/public-mentors/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mentors, users } from '@/lib/db/schema'
import { and, eq, ilike, or, desc } from 'drizzle-orm'

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
        email: users.email,
        image: users.image,
      })
      .from(mentors)
      .innerJoin(users, eq(mentors.userId, users.id))
      .where(and(...whereClauses))
      .orderBy(desc(mentors.createdAt))
      .limit(pageSize)
      .offset(offset)

    // Lightweight pagination (no expensive COUNT)
    const hasMore = rows.length === pageSize

    return NextResponse.json({
      success: true,
      data: rows,
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
