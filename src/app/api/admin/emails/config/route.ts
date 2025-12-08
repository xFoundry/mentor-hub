import { NextResponse } from "next/server";
import { getEmailConfig } from "@/lib/resend";

/**
 * GET /api/admin/emails/config
 * Returns email configuration status (staff only)
 */
export async function GET() {
  // TODO: Add auth check for staff only

  const config = getEmailConfig();

  return NextResponse.json({
    ...config,
    // Add helpful info for debugging
    envVars: {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? "***configured***" : "not set",
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "not set",
      EMAIL_TEST_MODE: process.env.EMAIL_TEST_MODE || "false",
      EMAIL_TEST_RECIPIENT: process.env.EMAIL_TEST_RECIPIENT || "not set",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "not set",
    },
  });
}
