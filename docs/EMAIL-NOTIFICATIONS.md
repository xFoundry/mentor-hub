# Email Notifications & Meeting Link Access

This document outlines the automated email notification system and the meeting link access rules for students in Mentor Hub.

## Automated Email Reminders

| Email | Recipients | When Sent | Subject Line |
|-------|-----------|-----------|--------------|
| **Prep Reminder (48h)** | Students only | 48 hours before session | "Submit meeting prep to unlock Zoom link - session in 2 days" |
| **Prep Reminder (24h)** | Students only | 24 hours before session | "Submit meeting prep to unlock Zoom link - session tomorrow" |
| **Feedback Request** | Students + Mentor | When session ends (start time + duration) | Students: "How was your session with [Mentor]?" / Mentors: "Quick feedback on your session with [Team]" |
| **Session Update** | Selectable (staff chooses) | When session time/location/meeting URL changes | "Your [Session Type] has been updated" |

## Zoom Link Access for Students

**The Zoom link is LOCKED for students until they submit their meeting prep.**

### How it works:

1. Student sees the session in the portal with a **blurred/locked meeting link**
2. The lock message says: *"Meeting link locked - Submit your meeting prep to unlock"*
3. Once they submit prep (via the Preparation tab), the link becomes visible
4. **Mentors and staff always see the full meeting link** - no restrictions

This encourages students to come prepared to sessions and gives mentors visibility into what students want to discuss before the meeting.

## Email Content Details

### Prep Reminder Emails

Sent to students 48h and 24h before their session. Includes:

- Session date/time (in Eastern Time with "ET" suffix)
- Mentor name
- Prominent notice that "Meeting Link Locked" until prep is submitted
- Tips on what to include in prep:
  - Topics or questions you want to discuss
  - Updates on action items from previous sessions
  - Any challenges or wins you want to share
  - Materials or links relevant to your conversation
- CTA button: "Submit Meeting Prep"

### Feedback Request Emails

Sent to all participants (students AND mentor) when the session ends. Includes:

- Session details (date, time, mentor/team name)
- Role-specific messaging:
  - **Students** see: "Your feedback helps [Mentor] understand what's working and how to better support you"
  - **Mentors** see: "Capture any notes, observations, or follow-up items while they're fresh"
- CTA button: "Submit Feedback"
- Note that feedback takes ~2 minutes and is confidential

### Session Update Emails

Sent when staff updates key session details. Staff can choose which recipients to notify. Shows:

- What changed (old value → new value) for:
  - Time
  - Duration
  - Location
  - Meeting URL
- Updated session details
- CTA button: "View Session Details"

## Staff Workflow

When creating/scheduling a session:

1. **Create session in portal** with date/time, mentor, and team
2. **Add the Zoom meeting URL** (or select location if in-person)
3. **Emails are automatically scheduled** based on session time
4. **Add the portal session link to the Google Calendar invite** so everyone has easy access

### Email Scheduling Logic

- Emails are scheduled via Resend's scheduled send feature
- If a session is rescheduled:
  - **Within 24 hours**: Both prep reminders are cancelled (too late)
  - **More than 24 hours out**: 48h prep is cancelled, 24h prep is rescheduled
  - **Feedback email**: Always rescheduled to new session end time
- If a session is cancelled/deleted: All scheduled emails are cancelled

## Technical Notes

- All times are displayed in **Eastern Time (ET)** across emails and the portal
- Emails are sent via [Resend](https://resend.com)
- Test mode available: Set `EMAIL_TEST_MODE=true` and `EMAIL_TEST_RECIPIENT=your-email@example.com` to redirect all emails
- Email management available at `/admin/emails` for staff users
