import { NextRequest, NextResponse } from "next/server";
import { getResendClient, rateLimitedResend } from "@/lib/resend";

/**
 * POST /api/admin/emails/[emailId]/cancel
 * Cancel a scheduled email
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  // TODO: Add auth check for staff only

  const { emailId } = await params;

  const resend = getResendClient();

  if (!resend) {
    return NextResponse.json(
      { error: "Email service not configured" },
      { status: 503 }
    );
  }

  try {
    await rateLimitedResend(() => resend.emails.cancel(emailId));

    return NextResponse.json({
      success: true,
      message: `Email ${emailId} cancelled`,
    });
  } catch (error) {
    console.error(`[Admin] Error cancelling email ${emailId}:`, error);
    return NextResponse.json(
      {
        error: "Failed to cancel email",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
