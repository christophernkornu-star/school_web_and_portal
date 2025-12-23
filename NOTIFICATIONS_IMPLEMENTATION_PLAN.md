# Notification System Implementation Plan

Currently, the **Notification Settings** in the Admin Portal allow you to configure preferences (SMTP details, SMS keys, and toggles), but the **actual sending logic** is not yet implemented.

To make notifications work, we need to implement the following:

## 1. Email Service Integration
We need to choose an email provider and implement a sending service.
*   **Recommended Provider:** [Resend](https://resend.com) (easiest for Next.js) or Nodemailer (for generic SMTP).
*   **Implementation:**
    *   Create `lib/email.ts` to handle email sending.
    *   It should read credentials from `notification_settings` table.

## 2. SMS Service Integration
*   **Provider:** Generic SMS API (based on the API Key/Sender ID fields in settings).
*   **Implementation:**
    *   Create `lib/sms.ts` to handle SMS sending.

## 3. Trigger Points
We need to hook into existing actions to trigger notifications:

| Notification Type | Trigger Event | File to Modify |
|-------------------|---------------|----------------|
| **Attendance** | When a teacher marks a student absent | `app/teacher/attendance/page.tsx` |
| **Results** | When results are published/approved | `app/admin/results/page.tsx` |
| **Fees** | When a payment is recorded or reminder sent | `app/admin/finance/page.tsx` |
| **Announcements** | When a new announcement is created | `app/admin/announcements/page.tsx` |

## 4. Background Jobs (Optional but Recommended)
Sending emails/SMS during a web request can be slow. Ideally, we should use Supabase Edge Functions or a queue system, but for a simple start, we can use Next.js Server Actions.

## Next Steps
If you want to proceed, I recommend starting with **Email Notifications** using Nodemailer (since you already have SMTP fields in the settings).

1.  Install `nodemailer`.
2.  Create the `sendEmail` utility function.
3.  Connect it to the "Announcements" feature first as a test.
