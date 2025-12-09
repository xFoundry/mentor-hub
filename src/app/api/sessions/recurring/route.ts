import { NextRequest, NextResponse } from "next/server";
import type { RecurringSessionInput } from "@/types/recurring";
import { createRecurringSessions } from "@/lib/recurring/series-operations";
import { validateRecurrenceConfig } from "@/lib/recurring/rrule-helpers";

/**
 * POST /api/sessions/recurring
 *
 * Create a recurring session series
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const { sessionConfig, recurrence, scheduledStart } = body as RecurringSessionInput;

    if (!sessionConfig) {
      return NextResponse.json(
        { error: "sessionConfig is required" },
        { status: 400 }
      );
    }

    if (!recurrence) {
      return NextResponse.json(
        { error: "recurrence configuration is required" },
        { status: 400 }
      );
    }

    if (!scheduledStart) {
      return NextResponse.json(
        { error: "scheduledStart is required" },
        { status: 400 }
      );
    }

    // Validate required session config fields
    if (!sessionConfig.sessionType || !sessionConfig.teamId) {
      return NextResponse.json(
        { error: "sessionConfig must include sessionType and teamId" },
        { status: 400 }
      );
    }

    if (!sessionConfig.mentors || sessionConfig.mentors.length === 0) {
      return NextResponse.json(
        { error: "At least one mentor is required" },
        { status: 400 }
      );
    }

    // Validate at least one mentor has Lead role
    const hasLeadMentor = sessionConfig.mentors.some(
      (m) => m.role === "Lead Mentor"
    );
    if (!hasLeadMentor) {
      return NextResponse.json(
        { error: "At least one mentor must have the Lead Mentor role" },
        { status: 400 }
      );
    }

    // Validate recurrence config
    const recurrenceValidation = validateRecurrenceConfig(recurrence);
    if (!recurrenceValidation.isValid) {
      return NextResponse.json(
        { error: recurrenceValidation.error },
        { status: 400 }
      );
    }

    // Validate start date is in the future
    const startDate = new Date(scheduledStart);
    if (startDate <= new Date()) {
      return NextResponse.json(
        { error: "Start date must be in the future" },
        { status: 400 }
      );
    }

    // Create the recurring sessions
    console.log("[Recurring Sessions API] Creating series:", {
      frequency: recurrence.frequency,
      occurrences: recurrence.occurrences,
      endDate: recurrence.endDate,
      startDate: scheduledStart,
    });

    const result = await createRecurringSessions({
      sessionConfig,
      recurrence,
      scheduledStart,
    });

    console.log("[Recurring Sessions API] Created series:", {
      seriesId: result.seriesId,
      count: result.count,
      scheduledEmails: result.scheduledEmails,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Recurring Sessions API] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create recurring sessions",
      },
      { status: 500 }
    );
  }
}
