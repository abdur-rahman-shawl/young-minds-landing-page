# Email Catalog

**Source:** `lib/emails.ts`
**Sender Address (`GMAIL_APP_USER`):** `info.sharingminds@gmail.com`

---

## 1. Mentor Application Receipt
**Trigger:** After a mentor submits the application form successfully.
**From:** "SharingMinds" <info.sharingminds@gmail.com>
**To:** Applicant Email
**Subject:** "We've Received Your SharingMinds Application!"

### Body Content
- **Heading:** "Thank You for Applying to SharingMinds!"
- **Greeting:** "Hi {name},"
- **Confirmation:** "We're thrilled you want to join our community of mentors. This email confirms we've successfully received your application."
- **SLA:** "We'll get back to you within 5-7 business days."
- **Call to Action:** "Go to Dashboard" button.

### Raw HTML Template
```html
<div style="font-family: sans-serif; padding: 20px; color: #333;">
  <h2 style="color: #0056b3;">Thank You for Applying to SharingMinds!</h2>
  <p>Hi ${name},</p>
  <p>We're thrilled you want to join our community of mentors. This email confirms we've successfully received your application.</p>
  <p>Our team will carefully review your profile. We'll get back to you within <strong>5-7 business days</strong> with the next steps. You can check the status of your application on your dashboard.</p>
  <p>In the meantime, feel free to explore our website and learn more about our mission.</p>
  <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Go to Dashboard</a>
  <p>Best regards,</p>
  <p><strong>The SharingMinds Team</strong></p>
</div>
```

### Visual Preview
<div style="font-family: sans-serif; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 8px; max-width: 600px; background: white;">
  <h2 style="color: #0056b3;">Thank You for Applying to SharingMinds!</h2>
  <p>Hi Alex Mentor,</p>
  <p>We're thrilled you want to join our community of mentors. This email confirms we've successfully received your application.</p>
  <p>Our team will carefully review your profile. We'll get back to you within <strong>5-7 business days</strong> with the next steps. You can check the status of your application on your dashboard.</p>
  <p>In the meantime, feel free to explore our website and learn more about our mission.</p>
  <a href="#" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Go to Dashboard</a>
  <p>Best regards,</p>
  <p><strong>The SharingMinds Team</strong></p>
</div>

---

## 2. Mentor Application Approved
**Trigger:** When a mentor application is approved by an admin.
**From:** "SharingMinds" <info.sharingminds@gmail.com>
**To:** Mentor Email
**Subject:** "Congratulations! Your SharingMinds Mentor Application is Approved"

### Raw HTML Template
```html
<div style="font-family: sans-serif; padding: 20px; color: #333;">
  <h2 style="color: #0056b3;">Congratulations, ${name}!</h2>
  <p>We are excited to welcome you to the SharingMinds community of mentors. Your application has been approved!</p>
  <p>You can now access your mentor dashboard to set up your availability and start connecting with mentees.</p>
  ${couponSection}
  <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Go to Dashboard</a>
  <p>Best regards,</p>
  <p><strong>The SharingMinds Team</strong></p>
</div>
```

### Visual Preview
<div style="font-family: sans-serif; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 8px; max-width: 600px; background: white;">
  <h2 style="color: #0056b3;">Congratulations, Alex Mentor!</h2>
  <p>We are excited to welcome you to the SharingMinds community of mentors. Your application has been approved!</p>
  <p>You can now access your mentor dashboard to set up your availability and start connecting with mentees.</p>
  <div style="background: #f0f9ff; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px dashed #0056b3;">
    <h3 style="margin:0 0 10px 0; color: #0056b3; font-size: 16px;">Onboarding coupon unlocked</h3>
    <p style="margin:0;">Use code: <strong>WELCOME50</strong> to get 50% off your first session commission.</p>
  </div>
  <a href="#" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Go to Dashboard</a>
  <p>Best regards,</p>
  <p><strong>The SharingMinds Team</strong></p>
</div>

---

## 3. Mentor Application Rejected
**Trigger:** When a mentor application is rejected.
**From:** "SharingMinds" <info.sharingminds@gmail.com>
**To:** Mentor Email
**Subject:** "Important: Update Regarding Your SharingMinds Mentor Application"

### Raw HTML Template
```html
<div style="font-family: sans-serif; padding: 20px; color: #333;">
  <h2 style="color: #e74c3c;">Update on Your Mentor Application, ${name}</h2>
  <p>Thank you for your interest in becoming a mentor with SharingMinds.</p>
  <p>After careful review, we regret to inform you that your application has not been approved at this time.</p>
  ${notes ? `<p><strong>Reason for rejection:</strong></p><p>${notes}</p>` : ''}
  <p>We encourage you to review your application based on the feedback provided (if any) and consider reapplying in the future if you meet our updated criteria.</p>
  <p>Best regards,</p>
  <p><strong>The SharingMinds Team</strong></p>
</div>
```

### Visual Preview
<div style="font-family: sans-serif; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 8px; max-width: 600px; background: white;">
  <h2 style="color: #e74c3c;">Update on Your Mentor Application, Alex Mentor</h2>
  <p>Thank you for your interest in becoming a mentor with SharingMinds.</p>
  <p>After careful review, we regret to inform you that your application has not been approved at this time.</p>
  <p><strong>Reason for rejection:</strong></p>
  <p>The profile information provided was incomplete. Specifically, the LinkedIn URL was invalid and the bio was too short.</p>
  <p>We encourage you to review your application based on the feedback provided (if any) and consider reapplying in the future if you meet our updated criteria.</p>
  <p>Best regards,</p>
  <p><strong>The SharingMinds Team</strong></p>
</div>

---

## 4. Mentor Application Reverification Request
**Trigger:** When reviewers need more information or updates.
**From:** "SharingMinds" <info.sharingminds@gmail.com>
**To:** Mentor Email
**Subject:** "Action Required: Updates Needed for Your SharingMinds Mentor Application"

### Raw HTML Template
```html
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
```

### Visual Preview
<div style="font-family: sans-serif; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 8px; max-width: 600px; background: white;">
  <h2 style="color: #f39c12;">Updates Requested for Your Mentor Application, Alex Mentor</h2>
  <p>Thank you for your application to become a mentor with SharingMinds.</p>
  <p>Our team has reviewed your profile and requires some additional information or updates before we can proceed with your approval.</p>
  <p><strong>Details for updates:</strong></p>
  <p>Please upload a clearer profile picture and add more details to your 'Experience' section.</p>
  <p>Please log in to your dashboard to view the specific details and make the necessary changes. Once updated, your application will be re-reviewed.</p>
  <a href="#" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Go to Dashboard</a>
  <p>Best regards,</p>
  <p><strong>The SharingMinds Team</strong></p>
</div>

---

## 5. Contact Enquiry Notification
**Trigger:** When the contact form is submitted.
**From:** "Sharing Minds" <info.sharingminds@gmail.com>
**To:** Admins
**Subject:** "New Contact Enquiry: {subject}"

### Raw HTML Template
```html
<div style="font-family: Arial, sans-serif; padding: 20px; color: #0f172a;">
  <h2 style="color: #4f46e5; margin-bottom: 12px;">New Contact Enquiry</h2>
  <p style="margin: 6px 0;"><strong>Name:</strong> ${safeName}</p>
  <p style="margin: 6px 0;"><strong>Email:</strong> ${safeEmail}</p>
  <p style="margin: 6px 0;"><strong>Subject:</strong> ${safeSubject}</p>
  <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
    <p style="margin: 0 0 8px 0; font-weight: 600;">Message</p>
    <p style="margin: 0; line-height: 1.6;">${safeMessage}</p>
  </div>
</div>
```

### Visual Preview
<div style="font-family: Arial, sans-serif; padding: 20px; color: #0f172a; border: 1px solid #ddd; border-radius: 8px; max-width: 600px; background: white;">
  <h2 style="color: #4f46e5; margin-bottom: 12px;">New Contact Enquiry</h2>
  <p style="margin: 6px 0;"><strong>Name:</strong> Jane Mentee</p>
  <p style="margin: 6px 0;"><strong>Email:</strong> jane.mentee@example.com</p>
  <p style="margin: 6px 0;"><strong>Subject:</strong> Course Availability Question</p>
  <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
    <p style="margin: 0 0 8px 0; font-weight: 600;">Message</p>
    <p style="margin: 0; line-height: 1.6;">Hi, I was wondering when the Advanced React course will be available? I am very interested in enrolling.</p>
  </div>
</div>
