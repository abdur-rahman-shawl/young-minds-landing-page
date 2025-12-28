
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
