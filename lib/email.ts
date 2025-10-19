
import nodemailer from 'nodemailer';

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_APP_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"Sharing Minds" <${process.env.GMAIL_APP_USER}>`,
    to,
    subject,
    html,
  });
}

export async function sendApplicationReceivedEmail(email: string, name: string) {
  try {
    const subject = 'We\'ve Received Your Sharing Minds Application!';
    const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0056b3;">Thank You for Applying to Sharing Minds!</h2>
          <p>Hi ${name},</p>
          <p>We\'re thrilled you want to join our community of mentors. This email confirms we\'ve successfully received your application.</p>
          <p>Our team will carefully review your profile. We\'ll get back to you within <strong>5-7 business days</strong> with the next steps.</p>
          <p>In the meantime, feel free to explore our website and learn more about our mission.</p>
          <p>Best regards,</p>
          <p><strong>The Sharing Minds Team</strong></p>
        </div>
      `;

    await sendEmail({ to: email, subject, html });

    return { success: true, message: 'Application received email sent successfully' };
  } catch (error) {
    console.error('Error sending application received email:', error);
    return { success: false, error: 'Failed to send application received email' };
  }
}

export async function sendMentorApplicationApprovedEmail(email: string, name: string) {
  try {
    const subject = 'Congratulations! Your Sharing Minds Mentor Application is Approved';
    const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0056b3;">Congratulations, ${name}!</h2>
          <p>We are excited to welcome you to the Sharing Minds community of mentors. Your application has been approved!</p>
          <p>You can now access your mentor dashboard to set up your availability and start connecting with mentees.</p>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Go to Dashboard</a>
          <p>Best regards,</p>
          <p><strong>The Sharing Minds Team</strong></p>
        </div>
      `;

    await sendEmail({ to: email, subject, html });

    return { success: true, message: 'Mentor application approved email sent successfully' };
  } catch (error) {
    console.error('Error sending mentor application approved email:', error);
    return { success: false, error: 'Failed to send mentor application approved email' };
  }
}
