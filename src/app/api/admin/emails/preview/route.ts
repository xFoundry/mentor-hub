import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import { MeetingPrepReminderEmail } from "@/emails/meeting-prep-reminder";
import { ImmediateFeedbackReminderEmail } from "@/emails/immediate-feedback-reminder";
import { FeedbackFollowupReminderEmail } from "@/emails/feedback-followup-reminder";
import { getAppUrl } from "@/lib/resend";
import { requireStaffSession } from "@/lib/api-auth";

type EmailTemplate = "meeting-prep" | "immediate-feedback" | "feedback-followup";

/**
 * GET /api/admin/emails/preview
 * Preview an email template with sample data
 */
export async function GET(request: NextRequest) {
  const auth = await requireStaffSession();
  if (auth instanceof NextResponse) return auth;

  const searchParams = request.nextUrl.searchParams;
  const template = searchParams.get("template") as EmailTemplate;
  const format = searchParams.get("format") || "html"; // html or json

  if (!template) {
    return NextResponse.json(
      { error: "Missing template parameter" },
      { status: 400 }
    );
  }

  const appUrl = getAppUrl();
  const sampleSessionUrl = `${appUrl}/sessions/sample-session-id`;

  // Sample data for preview
  const sampleData = {
    recipientName: "Jane Doe",
    sessionType: "Weekly Check-in",
    mentorName: "John Smith",
    otherPartyName: "Team Alpha",
    sessionDate: "Monday, January 15, 2025",
    sessionTime: "2:00 PM",
    sessionUrl: sampleSessionUrl,
    hoursUntilSession: 48,
    role: "student" as const,
  };

  try {
    let html: string;
    let subject: string;

    switch (template) {
      case "meeting-prep":
        html = await render(
          MeetingPrepReminderEmail({
            recipientName: sampleData.recipientName,
            sessionType: sampleData.sessionType,
            mentorName: sampleData.mentorName,
            sessionDate: sampleData.sessionDate,
            sessionTime: sampleData.sessionTime,
            hoursUntilSession: sampleData.hoursUntilSession,
            sessionUrl: sampleData.sessionUrl,
          })
        );
        subject = "Submit meeting prep to unlock Zoom link - session in 2 days";
        break;

      case "immediate-feedback":
        html = await render(
          ImmediateFeedbackReminderEmail({
            recipientName: sampleData.recipientName,
            role: sampleData.role,
            sessionType: sampleData.sessionType,
            otherPartyName: sampleData.otherPartyName,
            sessionDate: sampleData.sessionDate,
            sessionTime: sampleData.sessionTime,
            sessionUrl: sampleData.sessionUrl,
          })
        );
        subject = `How was your session with ${sampleData.otherPartyName}?`;
        break;

      case "feedback-followup":
        html = await render(
          FeedbackFollowupReminderEmail({
            recipientName: sampleData.recipientName,
            role: sampleData.role,
            sessionType: sampleData.sessionType,
            otherPartyName: sampleData.otherPartyName,
            sessionDate: sampleData.sessionDate,
            sessionUrl: sampleData.sessionUrl,
          })
        );
        subject = `Reminder: Share your feedback from ${sampleData.sessionType}`;
        break;

      default:
        return NextResponse.json(
          { error: `Unknown template: ${template}` },
          { status: 400 }
        );
    }

    if (format === "html") {
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return NextResponse.json({
      template,
      subject,
      sampleData,
      html,
    });
  } catch (error) {
    console.error("[Admin] Error rendering email preview:", error);
    return NextResponse.json(
      { error: "Failed to render email preview" },
      { status: 500 }
    );
  }
}
