import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/baseql";
import { getResendClient, rateLimitedResend } from "@/lib/resend";
import { parseScheduledEmailIds } from "@/lib/notifications/types";
import { calculateScheduleTimes } from "@/lib/timezone";
import type { Session } from "@/types/schema";
import { requireStaffSession } from "@/lib/api-auth";

interface ScheduledEmailInfo {
  emailId: string;
  emailKey: string;
  sessionId: string;
  sessionType: string;
  scheduledFor: string | null;
  status: string;
  recipient: string;
  error?: string;
}

/**
 * GET /api/admin/emails/scheduled
 * Returns all scheduled emails from sessions with their status
 */
export async function GET() {
  const auth = await requireStaffSession();
  if (auth instanceof NextResponse) return auth;

  try {
    // Fetch sessions with scheduled email IDs
    // Note: Direct table query uses `sessions`, not `mentorshipSessions`
    // (mentorshipSessions is used for relationship fields on other tables)
    const query = `
      query SessionsWithScheduledEmails {
        sessions(
          _order_by: { scheduledStart: "desc" }
        ) {
          id
          sessionId
          sessionType
          scheduledStart
          duration
          status
          scheduledEmailIds
          mentor {
            id
            fullName
            email
          }
          team {
            id
            teamName
            members {
              contact {
                id
                fullName
                email
              }
            }
          }
        }
      }
    `;

    const result = await executeQuery<{ sessions: Session[] }>(query);
    const sessions: Session[] = result.sessions || [];

    // Collect all scheduled emails
    const scheduledEmails: ScheduledEmailInfo[] = [];
    const resend = getResendClient();

    for (const session of sessions) {
      if (!session.scheduledEmailIds) continue;

      const emailIds = parseScheduledEmailIds(session.scheduledEmailIds as string);

      for (const [key, emailId] of Object.entries(emailIds)) {
        // Extract recipient from key (format: type_email)
        const parts = key.split("_");
        const recipient = parts.slice(1).join("_");
        const emailType = parts[0];

        // Calculate scheduledFor from session data using timezone utility
        // Times from Airtable are proper UTC, converted to Eastern for display
        let scheduledFor: string | null = null;
        if (session.scheduledStart) {
          const times = calculateScheduleTimes(
            session.scheduledStart as string,
            session.duration || 60
          );

          let targetTime: Date;
          if (emailType === "prep48h") {
            targetTime = times.prep48h;
          } else if (emailType === "prep24h") {
            targetTime = times.prep24h;
          } else if (emailType === "feedbackImmediate") {
            targetTime = times.feedbackImmediate;
          } else {
            targetTime = times.sessionStart;
          }

          // Return proper UTC ISO string - frontend will convert to Eastern for display
          scheduledFor = targetTime.toISOString();
        }

        const emailInfo: ScheduledEmailInfo = {
          emailId,
          emailKey: key,
          sessionId: session.id,
          sessionType: session.sessionType || "Session",
          scheduledFor,
          status: "unknown",
          recipient,
        };

        // Try to get email status from Resend (with rate limiting)
        if (resend) {
          try {
            const emailData = await rateLimitedResend(() => resend.emails.get(emailId));
            if (emailData.data) {
              emailInfo.status = emailData.data.last_event || "scheduled";
            } else if (emailData.error) {
              emailInfo.status = "error";
              emailInfo.error = emailData.error.message || "Resend API error";
            }
          } catch (error) {
            emailInfo.status = "error";
            emailInfo.error = error instanceof Error ? error.message : "Failed to fetch email status";
          }
        }

        scheduledEmails.push(emailInfo);
      }
    }

    // Sort by scheduled time
    scheduledEmails.sort((a, b) => {
      if (!a.scheduledFor) return 1;
      if (!b.scheduledFor) return -1;
      return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
    });

    return NextResponse.json({
      emails: scheduledEmails,
      total: scheduledEmails.length,
    });
  } catch (error) {
    console.error("[Admin Emails] Error fetching scheduled emails:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch scheduled emails" },
      { status: 500 }
    );
  }
}
