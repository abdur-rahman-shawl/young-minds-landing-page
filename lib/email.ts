
import nodemailer from 'nodemailer';
import { recordEmailEvent } from '@/lib/audit';

async function sendEmail({
  to,
  subject,
  html,
  auditAction,
  auditDetails,
}: {
  to: string;
  subject: string;
  html: string;
  auditAction: string;
  auditDetails: Record<string, any>;
}) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_APP_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    await recordEmailEvent({
      action: auditAction,
      to,
      subject,
      template: auditDetails.template,
      actorType: 'system',
      details: auditDetails,
    });
  } catch (error) {
    console.error('Failed to record email audit event:', error);
  }

  await transporter.sendMail({
    from: `"SharingMinds" <${process.env.GMAIL_APP_USER}>`,
    to,
    subject,
    html,
  });
}

export async function sendApplicationReceivedEmail(email: string, name: string) {
  try {
    const subject = 'We\'ve Received Your SharingMinds Application!';
    const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0056b3;">Thank You for Applying to SharingMinds!</h2>
          <p>Hi ${name},</p>
          <p>We\'re thrilled you want to join our community of mentors. This email confirms we\'ve successfully received your application.</p>
          <p>Our team will carefully review your profile. We\'ll get back to you within <strong>5-7 business days</strong> with the next steps. You can check the status of your application on your dashboard.</p>
          <p>In the meantime, feel free to explore our website and learn more about our mission.</p>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Go to Dashboard</a>
          <p>Best regards,</p>
          <p><strong>The SharingMinds Team</strong></p>
        </div>
      `;

    await sendEmail({
      to: email,
      subject,
      html,
      auditAction: 'email.application.received',
      auditDetails: {
        to: email,
        subject,
        template: 'application-received',
        recipientName: name,
      },
    });

    return { success: true, message: 'Application received email sent successfully' };
  } catch (error) {
    console.error('Error sending application received email:', error);
    return { success: false, error: 'Failed to send application received email' };
  }
}

export async function sendMentorApplicationApprovedEmail(
  email: string,
  name: string,
  couponCode?: string,
  options?: {
    auditAction?: string;
    auditDetails?: Record<string, any>;
  }
) {
  try {
    const subject = 'Congratulations! Your SharingMinds Mentor Application is Approved';
    const couponSection = couponCode
      ? `
        <div style="margin-top: 20px; padding: 16px; border: 1px dashed #0f62fe; border-radius: 8px; background-color: #f4f8ff;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #0f62fe;">Onboarding coupon unlocked</p>
          <p style="margin: 0;">Use the code below on your payment screen to skip the mentor onboarding fee:</p>
          <p style="font-size: 24px; letter-spacing: 4px; font-weight: bold; margin: 12px 0;">${couponCode}</p>
          <p style="margin: 0; font-size: 14px; color: #4b5563;">Keep this code safe. It can be used once to waive your activation payment.</p>
        </div>
      `
      : '';
    const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0056b3;">Congratulations, ${name}!</h2>
          <p>We are excited to welcome you to the SharingMinds community of mentors. Your application has been approved!</p>
          <p>You can now access your mentor dashboard to set up your availability and start connecting with mentees.</p>
          ${couponSection}
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Go to Dashboard</a>
          <p>Best regards,</p>
          <p><strong>The SharingMinds Team</strong></p>
        </div>
      `;

    const auditDetails = {
      to: email,
      subject,
      template: 'mentor-approved',
      recipientName: name,
      couponCodeProvided: Boolean(couponCode),
      ...(couponCode ? { couponCode } : {}),
      ...(options?.auditDetails ?? {}),
    };

    await sendEmail({
      to: email,
      subject,
      html,
      auditAction: options?.auditAction ?? 'email.mentor.approved',
      auditDetails,
    });

    return { success: true, message: 'Mentor application approved email sent successfully' };
  } catch (error) {
    console.error('Error sending mentor application approved email:', error);
    return { success: false, error: 'Failed to send mentor application approved email' };
  }
}

export async function sendMentorApplicationRejectedEmail(email: string, name: string, notes: string) {
  try {
    const subject = 'Important: Update Regarding Your SharingMinds Mentor Application';
    const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #e74c3c;">Update on Your Mentor Application, ${name}</h2>
          <p>Thank you for your interest in becoming a mentor with SharingMinds.</p>
          <p>After careful review, we regret to inform you that your application has not been approved at this time.</p>
          ${notes ? `<p><strong>Reason for rejection:</strong></p><p>${notes}</p>` : ''}
          <p>We encourage you to review your application based on the feedback provided (if any) and consider reapplying in the future if you meet our updated criteria.</p>
          <p>Best regards,</p>
          <p><strong>The SharingMinds Team</strong></p>
        </div>
      `;

    await sendEmail({
      to: email,
      subject,
      html,
      auditAction: 'email.mentor.rejected',
      auditDetails: {
        to: email,
        subject,
        template: 'mentor-rejected',
        recipientName: name,
        notesProvided: Boolean(notes),
      },
    });

    return { success: true, message: 'Mentor application rejected email sent successfully' };
  } catch (error) {
    console.error('Error sending mentor application rejected email:', error);
    return { success: false, error: 'Failed to send mentor application rejected email' };
  }
}

export async function sendMentorApplicationReverificationRequestEmail(email: string, name: string, notes: string) {
  try {
    const subject = 'Action Required: Updates Needed for Your SharingMinds Mentor Application';
    const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #f39c12;">Updates Requested for Your Mentor Application, ${name}</h2>
          <p>Thank you for your application to become a mentor with SharingMinds.</p>
          <p>Our team has reviewed your profile and requires some additional information or updates before we can proceed with your approval.</p>
          ${notes ? `<p><strong>Details for updates:</strong></p><p>${notes}</p>` : ''}
          <p>Please log in to your dashboard to view the specific details and make the necessary changes. Once updated, your application will be re-reviewed.</p>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Go to Dashboard</a>
          <p>Best regards,</p>
          <p><strong>The SharingMinds Team</strong></p>
        </div>
      `;

    await sendEmail({
      to: email,
      subject,
      html,
      auditAction: 'email.mentor.reverification_requested',
      auditDetails: {
        to: email,
        subject,
        template: 'mentor-reverification-requested',
        recipientName: name,
        notesProvided: Boolean(notes),
      },
    });

    return { success: true, message: 'Mentor application reverification request email sent successfully' };
  } catch (error) {
    console.error('Error sending mentor application reverification request email:', error);
    return { success: false, error: 'Failed to send mentor application reverification request email' };
  }
}

// ============================================
// BOOKING EMAIL TEMPLATES
// ============================================

interface BookingEmailData {
  sessionId: string;
  sessionTitle: string;
  scheduledAt: Date;
  duration: number;
  meetingType: 'video' | 'audio' | 'chat';
}

/**
 * Format date for email display
 */
function formatEmailDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatEmailTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Email 1: Booking Confirmed (to Mentee)
 * Sent after successful payment
 */
export async function sendBookingConfirmedEmail(
  menteeEmail: string,
  menteeName: string,
  mentorName: string,
  booking: BookingEmailData
) {
  try {
    const subject = `Your Session with ${mentorName} is Confirmed!`;
    const scheduledDate = new Date(booking.scheduledAt);

    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
        <h2 style="color: #0056b3;">🎉 Session Confirmed!</h2>
        <p>Hi ${menteeName},</p>
        <p>Great news! Your session has been successfully booked.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #1e293b;">${booking.sessionTitle}</h3>
          <p style="margin: 6px 0;"><strong>Mentor:</strong> ${mentorName}</p>
          <p style="margin: 6px 0;"><strong>Date:</strong> ${formatEmailDate(scheduledDate)}</p>
          <p style="margin: 6px 0;"><strong>Time:</strong> ${formatEmailTime(scheduledDate)}</p>
          <p style="margin: 6px 0;"><strong>Duration:</strong> ${booking.duration} minutes</p>
          <p style="margin: 6px 0;"><strong>Meeting Type:</strong> ${booking.meetingType.charAt(0).toUpperCase() + booking.meetingType.slice(1)} Call</p>
        </div>
        
        <p>You can join the session from your dashboard when it's time.</p>
        
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?section=sessions" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Session Details</a>
        
        <p style="margin-top: 20px;">Best regards,</p>
        <p><strong>The SharingMinds Team</strong></p>
      </div>
    `;

    await sendEmail({
      to: menteeEmail,
      subject,
      html,
      auditAction: 'email.booking.confirmed',
      auditDetails: {
        to: menteeEmail,
        subject,
        template: 'booking-confirmed',
        sessionId: booking.sessionId,
        mentorName,
        scheduledAt: booking.scheduledAt,
      },
    });

    return { success: true, message: 'Booking confirmation email sent' };
  } catch (error) {
    console.error('Error sending booking confirmed email:', error);
    return { success: false, error: 'Failed to send booking confirmation email' };
  }
}

/**
 * Email 2: New Booking Alert (to Mentor)
 * Sent when a mentee books a session
 */
export async function sendNewBookingAlertEmail(
  mentorEmail: string,
  mentorName: string,
  menteeName: string,
  booking: BookingEmailData
) {
  try {
    const subject = `New Session Booked: ${booking.sessionTitle}`;
    const scheduledDate = new Date(booking.scheduledAt);

    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
        <h2 style="color: #0056b3;">📅 New Session Booked!</h2>
        <p>Hi ${mentorName},</p>
        <p>A mentee has just booked a session with you.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #1e293b;">${booking.sessionTitle}</h3>
          <p style="margin: 6px 0;"><strong>Mentee:</strong> ${menteeName}</p>
          <p style="margin: 6px 0;"><strong>Date:</strong> ${formatEmailDate(scheduledDate)}</p>
          <p style="margin: 6px 0;"><strong>Time:</strong> ${formatEmailTime(scheduledDate)}</p>
          <p style="margin: 6px 0;"><strong>Duration:</strong> ${booking.duration} minutes</p>
          <p style="margin: 6px 0;"><strong>Meeting Type:</strong> ${booking.meetingType.charAt(0).toUpperCase() + booking.meetingType.slice(1)} Call</p>
        </div>
        
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?section=schedule" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Your Schedule</a>
        
        <p style="margin-top: 20px;">Best regards,</p>
        <p><strong>The SharingMinds Team</strong></p>
      </div>
    `;

    await sendEmail({
      to: mentorEmail,
      subject,
      html,
      auditAction: 'email.booking.new_alert',
      auditDetails: {
        to: mentorEmail,
        subject,
        template: 'new-booking-alert',
        sessionId: booking.sessionId,
        menteeName,
        scheduledAt: booking.scheduledAt,
      },
    });

    return { success: true, message: 'New booking alert email sent' };
  } catch (error) {
    console.error('Error sending new booking alert email:', error);
    return { success: false, error: 'Failed to send new booking alert email' };
  }
}

/**
 * Email 3: Mentor Cancelled - Reassigned (to Mentee)
 * Sent when mentor cancels but a new mentor was found
 */
export async function sendMentorCancelledReassignedEmail(
  menteeEmail: string,
  menteeName: string,
  originalMentorName: string,
  newMentorName: string,
  booking: BookingEmailData
) {
  try {
    const subject = `Session Update: New Mentor Assigned for ${booking.sessionTitle}`;
    const scheduledDate = new Date(booking.scheduledAt);

    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
        <h2 style="color: #f39c12;">⚡ Session Update</h2>
        <p>Hi ${menteeName},</p>
        <p>Your original mentor, <strong>${originalMentorName}</strong>, had to cancel. However, we've found another great mentor for you!</p>
        
        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #92400e;">New Mentor Assigned</h3>
          <p style="margin: 6px 0;"><strong>New Mentor:</strong> ${newMentorName}</p>
          <p style="margin: 6px 0;"><strong>Session:</strong> ${booking.sessionTitle}</p>
          <p style="margin: 6px 0;"><strong>Date:</strong> ${formatEmailDate(scheduledDate)}</p>
          <p style="margin: 6px 0;"><strong>Time:</strong> ${formatEmailTime(scheduledDate)} (unchanged)</p>
        </div>
        
        <p>You have options:</p>
        <ul>
          <li><strong>Accept</strong> the new mentor and continue</li>
          <li><strong>Browse</strong> other available mentors</li>
          <li><strong>Cancel</strong> for a full refund</li>
        </ul>
        
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?section=sessions" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Options</a>
        
        <p style="margin-top: 20px;">Best regards,</p>
        <p><strong>The SharingMinds Team</strong></p>
      </div>
    `;

    await sendEmail({
      to: menteeEmail,
      subject,
      html,
      auditAction: 'email.booking.mentor_cancelled_reassigned',
      auditDetails: {
        to: menteeEmail,
        subject,
        template: 'mentor-cancelled-reassigned',
        sessionId: booking.sessionId,
        originalMentorName,
        newMentorName,
      },
    });

    return { success: true, message: 'Mentor cancelled reassigned email sent' };
  } catch (error) {
    console.error('Error sending mentor cancelled reassigned email:', error);
    return { success: false, error: 'Failed to send mentor cancelled reassigned email' };
  }
}

/**
 * Email 4: Mentor Cancelled - No Mentor Found (to Mentee)
 * Sent when mentor cancels and no replacement was found
 */
export async function sendMentorCancelledNoMentorEmail(
  menteeEmail: string,
  menteeName: string,
  mentorName: string,
  booking: BookingEmailData
) {
  try {
    const subject = `Action Required: Your Mentor Cancelled ${booking.sessionTitle}`;
    const scheduledDate = new Date(booking.scheduledAt);

    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
        <h2 style="color: #dc2626;">⚠️ Action Required</h2>
        <p>Hi ${menteeName},</p>
        <p>Unfortunately, your mentor <strong>${mentorName}</strong> had to cancel your upcoming session.</p>
        
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #991b1b;">Session Affected</h3>
          <p style="margin: 6px 0;"><strong>Session:</strong> ${booking.sessionTitle}</p>
          <p style="margin: 6px 0;"><strong>Original Date:</strong> ${formatEmailDate(scheduledDate)}</p>
          <p style="margin: 6px 0;"><strong>Original Time:</strong> ${formatEmailTime(scheduledDate)}</p>
        </div>
        
        <p>We couldn't find an automatic replacement, but you have options:</p>
        <ul>
          <li><strong>Browse available mentors</strong> and select a new one</li>
          <li><strong>Cancel</strong> for a full refund</li>
        </ul>
        
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/sessions/${booking.sessionId}/select-mentor" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Browse Available Mentors</a>
        
        <p style="margin-top: 20px;">Best regards,</p>
        <p><strong>The SharingMinds Team</strong></p>
      </div>
    `;

    await sendEmail({
      to: menteeEmail,
      subject,
      html,
      auditAction: 'email.booking.mentor_cancelled_no_mentor',
      auditDetails: {
        to: menteeEmail,
        subject,
        template: 'mentor-cancelled-no-mentor',
        sessionId: booking.sessionId,
        mentorName,
      },
    });

    return { success: true, message: 'Mentor cancelled no mentor email sent' };
  } catch (error) {
    console.error('Error sending mentor cancelled no mentor email:', error);
    return { success: false, error: 'Failed to send mentor cancelled no mentor email' };
  }
}

/**
 * Email 5: Mentee Cancelled (to Mentor)
 * Sent when a mentee cancels their session
 */
export async function sendMenteeCancelledEmail(
  mentorEmail: string,
  mentorName: string,
  menteeName: string,
  booking: BookingEmailData,
  cancellationReason?: string
) {
  try {
    const subject = `Session Cancelled: ${booking.sessionTitle}`;
    const scheduledDate = new Date(booking.scheduledAt);

    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
        <h2 style="color: #6b7280;">Session Cancelled</h2>
        <p>Hi ${mentorName},</p>
        <p>The mentee <strong>${menteeName}</strong> has cancelled their upcoming session with you.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #1e293b;">${booking.sessionTitle}</h3>
          <p style="margin: 6px 0;"><strong>Was scheduled:</strong> ${formatEmailDate(scheduledDate)}</p>
          <p style="margin: 6px 0;"><strong>Time:</strong> ${formatEmailTime(scheduledDate)}</p>
          ${cancellationReason ? `<p style="margin: 6px 0;"><strong>Reason:</strong> ${cancellationReason}</p>` : ''}
        </div>
        
        <p>This time slot is now open for other bookings.</p>
        
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?section=schedule" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Your Schedule</a>
        
        <p style="margin-top: 20px;">Best regards,</p>
        <p><strong>The SharingMinds Team</strong></p>
      </div>
    `;

    await sendEmail({
      to: mentorEmail,
      subject,
      html,
      auditAction: 'email.booking.mentee_cancelled',
      auditDetails: {
        to: mentorEmail,
        subject,
        template: 'mentee-cancelled',
        sessionId: booking.sessionId,
        menteeName,
        cancellationReason,
      },
    });

    return { success: true, message: 'Mentee cancelled email sent' };
  } catch (error) {
    console.error('Error sending mentee cancelled email:', error);
    return { success: false, error: 'Failed to send mentee cancelled email' };
  }
}

/**
 * Email 6: Reschedule Request (to Recipient)
 * Sent when one party requests to reschedule
 */
export async function sendRescheduleRequestEmail(
  recipientEmail: string,
  recipientName: string,
  requestorName: string,
  requestorRole: 'mentor' | 'mentee',
  booking: BookingEmailData,
  proposedTime: Date
) {
  try {
    const subject = `Reschedule Request for ${booking.sessionTitle}`;
    const currentDate = new Date(booking.scheduledAt);

    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
        <h2 style="color: #f39c12;">📅 Reschedule Request</h2>
        <p>Hi ${recipientName},</p>
        <p>Your ${requestorRole}, <strong>${requestorName}</strong>, has requested to reschedule your session.</p>
        
        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #92400e;">${booking.sessionTitle}</h3>
          <p style="margin: 6px 0;"><strong>Current Time:</strong> ${formatEmailDate(currentDate)} at ${formatEmailTime(currentDate)}</p>
          <p style="margin: 6px 0; color: #15803d;"><strong>Proposed New Time:</strong> ${formatEmailDate(proposedTime)} at ${formatEmailTime(proposedTime)}</p>
        </div>
        
        <p>Please respond to this request:</p>
        <ul>
          <li><strong>Accept</strong> the new time</li>
          <li><strong>Counter-propose</strong> a different time</li>
          <li><strong>Decline</strong> and keep the original time</li>
        </ul>
        
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?section=sessions" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Respond to Request</a>
        
        <p style="margin-top: 20px;">Best regards,</p>
        <p><strong>The SharingMinds Team</strong></p>
      </div>
    `;

    await sendEmail({
      to: recipientEmail,
      subject,
      html,
      auditAction: 'email.booking.reschedule_request',
      auditDetails: {
        to: recipientEmail,
        subject,
        template: 'reschedule-request',
        sessionId: booking.sessionId,
        requestorName,
        requestorRole,
        proposedTime: proposedTime.toISOString(),
      },
    });

    return { success: true, message: 'Reschedule request email sent' };
  } catch (error) {
    console.error('Error sending reschedule request email:', error);
    return { success: false, error: 'Failed to send reschedule request email' };
  }
}

/**
 * Email 7: Reschedule Confirmed (to Both Parties)
 * Sent when a reschedule is accepted
 */
export async function sendRescheduleConfirmedEmail(
  recipientEmail: string,
  recipientName: string,
  otherPartyName: string,
  booking: BookingEmailData,
  oldTime: Date,
  newTime: Date
) {
  try {
    const subject = `Session Rescheduled: ${booking.sessionTitle}`;

    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
        <h2 style="color: #16a34a;">✅ Session Rescheduled</h2>
        <p>Hi ${recipientName},</p>
        <p>Your session with <strong>${otherPartyName}</strong> has been rescheduled.</p>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #166534;">${booking.sessionTitle}</h3>
          <p style="margin: 6px 0; text-decoration: line-through; color: #9ca3af;"><strong>Previous:</strong> ${formatEmailDate(oldTime)} at ${formatEmailTime(oldTime)}</p>
          <p style="margin: 6px 0; color: #15803d; font-weight: bold;"><strong>New Time:</strong> ${formatEmailDate(newTime)} at ${formatEmailTime(newTime)}</p>
          <p style="margin: 6px 0;"><strong>Duration:</strong> ${booking.duration} minutes</p>
        </div>
        
        <p>Please update your calendar accordingly.</p>
        
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?section=sessions" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Session</a>
        
        <p style="margin-top: 20px;">Best regards,</p>
        <p><strong>The SharingMinds Team</strong></p>
      </div>
    `;

    await sendEmail({
      to: recipientEmail,
      subject,
      html,
      auditAction: 'email.booking.reschedule_confirmed',
      auditDetails: {
        to: recipientEmail,
        subject,
        template: 'reschedule-confirmed',
        sessionId: booking.sessionId,
        otherPartyName,
        oldTime: oldTime.toISOString(),
        newTime: newTime.toISOString(),
      },
    });

    return { success: true, message: 'Reschedule confirmed email sent' };
  } catch (error) {
    console.error('Error sending reschedule confirmed email:', error);
    return { success: false, error: 'Failed to send reschedule confirmed email' };
  }
}

/**
 * Email 8: Mentee Cancellation Confirmation (to Mentee)
 * Sent to mentee confirming their own cancellation
 */
export async function sendMenteeCancellationConfirmationEmail(
  menteeEmail: string,
  menteeName: string,
  mentorName: string,
  booking: BookingEmailData,
  refundPercentage: number,
  refundAmount: number
) {
  try {
    const subject = `Cancellation Confirmed: ${booking.sessionTitle}`;
    const scheduledDate = new Date(booking.scheduledAt);

    const refundMessage = refundAmount > 0
      ? `You will receive a refund of ${refundPercentage}% ($${refundAmount.toFixed(2)}).`
      : 'No refund is applicable based on our cancellation policy.';

    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
        <h2 style="color: #6b7280;">✅ Cancellation Confirmed</h2>
        <p>Hi ${menteeName},</p>
        <p>Your session cancellation has been processed successfully.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #1e293b;">${booking.sessionTitle}</h3>
          <p style="margin: 6px 0;"><strong>Mentor:</strong> ${mentorName}</p>
          <p style="margin: 6px 0;"><strong>Was scheduled:</strong> ${formatEmailDate(scheduledDate)}</p>
          <p style="margin: 6px 0;"><strong>Time:</strong> ${formatEmailTime(scheduledDate)}</p>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #166534;"><strong>Refund:</strong> ${refundMessage}</p>
        </div>
        
        <p>Your mentor has been notified of the cancellation.</p>
        
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?section=sessions" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Browse Mentors</a>
        
        <p style="margin-top: 20px;">Best regards,</p>
        <p><strong>The SharingMinds Team</strong></p>
      </div>
    `;

    await sendEmail({
      to: menteeEmail,
      subject,
      html,
      auditAction: 'email.booking.mentee_cancellation_confirmed',
      auditDetails: {
        to: menteeEmail,
        subject,
        template: 'mentee-cancellation-confirmed',
        sessionId: booking.sessionId,
        mentorName,
        refundPercentage,
        refundAmount,
      },
    });

    return { success: true, message: 'Mentee cancellation confirmation email sent' };
  } catch (error) {
    console.error('Error sending mentee cancellation confirmation email:', error);
    return { success: false, error: 'Failed to send mentee cancellation confirmation email' };
  }
}

/**
 * Email 9: Mentor Cancellation Confirmation (to Mentor)
 * Sent to mentor confirming their own cancellation
 */
export async function sendMentorCancellationConfirmationEmail(
  mentorEmail: string,
  mentorName: string,
  menteeName: string,
  booking: BookingEmailData,
  wasReassigned: boolean,
  newMentorName?: string
) {
  try {
    const subject = `Cancellation Confirmed: ${booking.sessionTitle}`;
    const scheduledDate = new Date(booking.scheduledAt);

    const statusMessage = wasReassigned
      ? `The session has been reassigned to ${newMentorName || 'another mentor'}.`
      : 'The mentee has been notified and will receive options to find a new mentor or cancel for a refund.';

    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
        <h2 style="color: #6b7280;">✅ Cancellation Confirmed</h2>
        <p>Hi ${mentorName},</p>
        <p>Your session cancellation has been processed.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #1e293b;">${booking.sessionTitle}</h3>
          <p style="margin: 6px 0;"><strong>Mentee:</strong> ${menteeName}</p>
          <p style="margin: 6px 0;"><strong>Was scheduled:</strong> ${formatEmailDate(scheduledDate)}</p>
          <p style="margin: 6px 0;"><strong>Time:</strong> ${formatEmailTime(scheduledDate)}</p>
        </div>
        
        <p>${statusMessage}</p>
        
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?section=schedule" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Schedule</a>
        
        <p style="margin-top: 20px;">Best regards,</p>
        <p><strong>The SharingMinds Team</strong></p>
      </div>
    `;

    await sendEmail({
      to: mentorEmail,
      subject,
      html,
      auditAction: 'email.booking.mentor_cancellation_confirmed',
      auditDetails: {
        to: mentorEmail,
        subject,
        template: 'mentor-cancellation-confirmed',
        sessionId: booking.sessionId,
        menteeName,
        wasReassigned,
        newMentorName,
      },
    });

    return { success: true, message: 'Mentor cancellation confirmation email sent' };
  } catch (error) {
    console.error('Error sending mentor cancellation confirmation email:', error);
    return { success: false, error: 'Failed to send mentor cancellation confirmation email' };
  }
}

/**
 * Email 10: New Mentor Assigned Alert (to New Mentor)
 * Sent to a new mentor when they are assigned a reassigned session
 */
export async function sendNewMentorAssignedEmail(
  mentorEmail: string,
  mentorName: string,
  menteeName: string,
  booking: BookingEmailData,
  isReassignment: boolean
) {
  try {
    const subject = isReassignment
      ? `Urgent: Session Reassigned to You - ${booking.sessionTitle}`
      : `New Session Assigned: ${booking.sessionTitle}`;
    const scheduledDate = new Date(booking.scheduledAt);

    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
        <h2 style="color: #f39c12;">📋 ${isReassignment ? 'Session Reassigned to You' : 'New Session Assigned'}</h2>
        <p>Hi ${mentorName},</p>
        <p>${isReassignment
        ? 'A session has been reassigned to you because the original mentor cancelled. The mentee will need to confirm this assignment.'
        : 'A mentee has selected you for their session.'}</p>
        
        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #92400e;">${booking.sessionTitle}</h3>
          <p style="margin: 6px 0;"><strong>Mentee:</strong> ${menteeName}</p>
          <p style="margin: 6px 0;"><strong>Date:</strong> ${formatEmailDate(scheduledDate)}</p>
          <p style="margin: 6px 0;"><strong>Time:</strong> ${formatEmailTime(scheduledDate)}</p>
          <p style="margin: 6px 0;"><strong>Duration:</strong> ${booking.duration} minutes</p>
          <p style="margin: 6px 0;"><strong>Meeting Type:</strong> ${booking.meetingType.charAt(0).toUpperCase() + booking.meetingType.slice(1)} Call</p>
        </div>
        
        ${isReassignment ? '<p><strong>Note:</strong> The mentee will review and confirm this assignment. You will be notified of their decision.</p>' : ''}
        
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?section=schedule" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Your Schedule</a>
        
        <p style="margin-top: 20px;">Best regards,</p>
        <p><strong>The SharingMinds Team</strong></p>
      </div>
    `;

    await sendEmail({
      to: mentorEmail,
      subject,
      html,
      auditAction: 'email.booking.new_mentor_assigned',
      auditDetails: {
        to: mentorEmail,
        subject,
        template: 'new-mentor-assigned',
        sessionId: booking.sessionId,
        menteeName,
        isReassignment,
      },
    });

    return { success: true, message: 'New mentor assigned email sent' };
  } catch (error) {
    console.error('Error sending new mentor assigned email:', error);
    return { success: false, error: 'Failed to send new mentor assigned email' };
  }
}

/**
 * Email 11: Alternative Mentor Selected Confirmation (to Mentee)
 * Sent to mentee when they select an alternative mentor
 */
export async function sendAlternativeMentorSelectedEmail(
  menteeEmail: string,
  menteeName: string,
  newMentorName: string,
  booking: BookingEmailData
) {
  try {
    const subject = `New Mentor Confirmed: ${booking.sessionTitle}`;
    const scheduledDate = new Date(booking.scheduledAt);

    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
        <h2 style="color: #16a34a;">✅ New Mentor Confirmed!</h2>
        <p>Hi ${menteeName},</p>
        <p>Great news! Your new mentor selection has been confirmed.</p>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #166534;">${booking.sessionTitle}</h3>
          <p style="margin: 6px 0;"><strong>New Mentor:</strong> ${newMentorName}</p>
          <p style="margin: 6px 0;"><strong>Date:</strong> ${formatEmailDate(scheduledDate)}</p>
          <p style="margin: 6px 0;"><strong>Time:</strong> ${formatEmailTime(scheduledDate)}</p>
          <p style="margin: 6px 0;"><strong>Duration:</strong> ${booking.duration} minutes</p>
        </div>
        
        <p>Your new mentor has been notified and the session is confirmed.</p>
        
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?section=sessions" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Session</a>
        
        <p style="margin-top: 20px;">Best regards,</p>
        <p><strong>The SharingMinds Team</strong></p>
      </div>
    `;

    await sendEmail({
      to: menteeEmail,
      subject,
      html,
      auditAction: 'email.booking.alternative_mentor_selected',
      auditDetails: {
        to: menteeEmail,
        subject,
        template: 'alternative-mentor-selected',
        sessionId: booking.sessionId,
        newMentorName,
      },
    });

    return { success: true, message: 'Alternative mentor selected email sent' };
  } catch (error) {
    console.error('Error sending alternative mentor selected email:', error);
    return { success: false, error: 'Failed to send alternative mentor selected email' };
  }
}
