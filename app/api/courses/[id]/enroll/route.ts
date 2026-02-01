import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { 
  courseEnrollments, 
  courses, 
  mentorContent,
  mentees,
  users,
  paymentTransactions
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { FEATURE_KEYS } from '@/lib/subscriptions/feature-keys';
import { checkFeatureAccess, getPlanFeatures, trackFeatureUsage } from '@/lib/subscriptions/enforcement';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/courses/[id]/enroll - Enroll in a course
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: courseId } = await params;
    const body = await request.json();
    
    // Get user from auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user and mentee info, create mentee record if doesn't exist
    let userData = await db
      .select({
        userId: users.id,
        menteeId: mentees.id,
      })
      .from(users)
      .leftJoin(mentees, eq(mentees.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!userData.length) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    let menteeId = userData[0].menteeId;

    // If user doesn't have a mentee record, create one
    if (!menteeId) {
      const newMentee = await db
        .insert(mentees)
        .values({
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: mentees.id });
      
      menteeId = newMentee[0].id;
    }

    // Check if course exists and is published
    const courseData = await db
      .select({
        id: courses.id,
        title: mentorContent.title,
        price: courses.price,
        currency: courses.currency,
        status: mentorContent.status,
      })
      .from(courses)
      .innerJoin(mentorContent, eq(courses.contentId, mentorContent.id))
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!courseData.length) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    const course = courseData[0];

    if (course.status !== 'PUBLISHED') {
      return NextResponse.json(
        { success: false, error: 'Course is not available for enrollment' },
        { status: 400 }
      );
    }

    // Check if already enrolled
    const existingEnrollment = await db
      .select({ id: courseEnrollments.id })
      .from(courseEnrollments)
      .where(and(
        eq(courseEnrollments.courseId, courseId),
        eq(courseEnrollments.menteeId, menteeId)
      ))
      .limit(1);

    if (existingEnrollment.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Already enrolled in this course' },
        { status: 400 }
      );
    }

    const coursesAccess = await checkFeatureAccess(
      userId,
      FEATURE_KEYS.COURSES_ACCESS
    );
    if (!coursesAccess.has_access) {
      return NextResponse.json(
        { success: false, error: coursesAccess.reason || 'Courses are not included in your plan' },
        { status: 403 }
      );
    }

    const accessLevelText = typeof coursesAccess.limit === 'string' ? coursesAccess.limit : null;
    const shouldEnforceCourseLimit = accessLevelText
      ? accessLevelText.toLowerCase() !== 'unlimited'
      : true;

    if (shouldEnforceCourseLimit) {
      const { has_access, reason } = await checkFeatureAccess(
        userId,
        FEATURE_KEYS.FREE_COURSES_LIMIT
      );
      if (!has_access) {
        return NextResponse.json(
          { success: false, error: reason || 'Course enrollment limit reached' },
          { status: 403 }
        );
      }
    }

    const {
      paymentMethodId,
      isGift = false,
      giftFromUserId,
      couponCode,
      notes
    } = body;

    // Calculate pricing (you can add coupon logic here)
    const coursePrice = parseFloat(course.price || '0');
    let finalPrice = coursePrice;
    let discountAmount = 0;

    try {
      const planFeatures = await getPlanFeatures(userId);
      const discountFeature = planFeatures.find(
        feature => feature.feature_key === FEATURE_KEYS.COURSE_DISCOUNT_PERCENT
      );
      const discountPercent = discountFeature?.limit_percent ?? null;

      if (discountPercent !== null && discountPercent > 0) {
        discountAmount = (coursePrice * Number(discountPercent)) / 100;
        finalPrice = Math.max(0, Number((coursePrice - discountAmount).toFixed(2)));
      }
    } catch (error) {
      console.error('Course discount lookup failed:', error);
    }

    // Handle coupon codes here if needed
    if (couponCode) {
      // Implement coupon validation and discount calculation
      // This is a placeholder - you'd implement actual coupon logic
    }

    // Create enrollment record
    const enrollment = await db
      .insert(courseEnrollments)
      .values({
        courseId,
        menteeId,
        status: finalPrice > 0 ? 'ACTIVE' : 'ACTIVE', // Free courses are immediately active
        enrolledAt: new Date(),
        paymentStatus: finalPrice > 0 ? 'PENDING' : 'COMPLETED',
        paidAmount: finalPrice.toString(),
        currency: course.currency,
        enrollmentNotes: notes,
        isGift,
        giftFromUserId: giftFromUserId || null,
      })
      .returning({
        id: courseEnrollments.id,
        status: courseEnrollments.status,
        paymentStatus: courseEnrollments.paymentStatus,
      });

    const enrollmentId = enrollment[0].id;

    // Handle payment processing
    if (finalPrice > 0) {
      // For paid courses, we'll create a payment intent
      // This is where you'd integrate with Stripe or other payment processors
      
      if (!paymentMethodId && !isGift) {
        return NextResponse.json(
          { success: false, error: 'Payment method required for paid courses' },
          { status: 400 }
        );
      }

      // Create payment transaction record
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // Here you would integrate with Stripe:
        // const paymentIntent = await stripe.paymentIntents.create({
        //   amount: Math.round(finalPrice * 100), // Stripe expects cents
        //   currency: course.currency.toLowerCase(),
        //   payment_method: paymentMethodId,
        //   confirmation_method: 'manual',
        //   confirm: true,
        //   metadata: {
        //     courseId,
        //     enrollmentId,
        //     userId,
        //   },
        // });

        // For now, we'll simulate successful payment for free/demo purposes
        await db
          .insert(paymentTransactions)
          .values({
            enrollmentId,
            transactionId,
            paymentProvider: 'stripe',
            paymentMethod: 'card',
            amount: finalPrice.toString(),
            currency: course.currency,
            originalAmount: coursePrice.toString(),
            discountAmount: discountAmount.toString(),
            status: 'COMPLETED', // In real implementation, this would be 'PENDING' initially
            processedAt: new Date(),
          });

        // Update enrollment payment status
        await db
          .update(courseEnrollments)
          .set({
            paymentStatus: 'COMPLETED',
            paymentIntentId: transactionId, // In real implementation, use Stripe's payment intent ID
          })
          .where(eq(courseEnrollments.id, enrollmentId));

      } catch (paymentError) {
        console.error('Payment processing error:', paymentError);
        
        // Update enrollment status to failed
        await db
          .update(courseEnrollments)
          .set({ paymentStatus: 'FAILED' })
          .where(eq(courseEnrollments.id, enrollmentId));

        return NextResponse.json(
          { success: false, error: 'Payment processing failed' },
          { status: 400 }
        );
      }
    }

    // Update course enrollment count
    await db
      .update(courses)
      .set({
        enrollmentCount: courseData.length > 0 ? (course.id ? 1 : 0) + 1 : 1
      })
      .where(eq(courses.id, courseId));

    await trackFeatureUsage(
      userId,
      FEATURE_KEYS.FREE_COURSES_LIMIT,
      { count: 1 },
      'course_enrollment',
      enrollmentId
    );

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        enrollmentId,
        courseId,
        courseTitle: course.title,
        status: enrollment[0].status,
        paymentStatus: enrollment[0].paymentStatus,
        paidAmount: finalPrice,
        currency: course.currency,
        enrolledAt: new Date().toISOString(),
        // In a real implementation, you might return payment client secret for Stripe
        // clientSecret: paymentIntent.client_secret,
      },
      message: finalPrice > 0 
        ? 'Enrollment successful! Payment processed.' 
        : 'Enrollment successful! Welcome to the course.',
    });

  } catch (error) {
    console.error('Error enrolling in course:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to enroll in course' },
      { status: 500 }
    );
  }
}

// GET /api/courses/[id]/enroll - Check enrollment status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: courseId } = await params;
    
    // Get user from auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get mentee info
    const userData = await db
      .select({ menteeId: mentees.id })
      .from(users)
      .leftJoin(mentees, eq(mentees.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!userData.length || !userData[0].menteeId) {
      return NextResponse.json({
        success: true,
        data: { isEnrolled: false, enrollment: null }
      });
    }

    const { menteeId } = userData[0];

    // Check enrollment status
    const enrollment = await db
      .select({
        id: courseEnrollments.id,
        status: courseEnrollments.status,
        paymentStatus: courseEnrollments.paymentStatus,
        enrolledAt: courseEnrollments.enrolledAt,
        overallProgress: courseEnrollments.overallProgress,
        timeSpentMinutes: courseEnrollments.timeSpentMinutes,
        lastAccessedAt: courseEnrollments.lastAccessedAt,
      })
      .from(courseEnrollments)
      .where(and(
        eq(courseEnrollments.courseId, courseId),
        eq(courseEnrollments.menteeId, menteeId)
      ))
      .limit(1);

    const isEnrolled = enrollment.length > 0;

    return NextResponse.json({
      success: true,
      data: {
        isEnrolled,
        enrollment: isEnrolled ? enrollment[0] : null,
      },
    });

  } catch (error) {
    console.error('Error checking enrollment status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check enrollment status' },
      { status: 500 }
    );
  }
}
