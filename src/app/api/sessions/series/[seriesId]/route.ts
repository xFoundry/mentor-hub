import { NextRequest, NextResponse } from "next/server";
import type { SeriesScope } from "@/types/recurring";
import {
  getSeriesSessions,
  getSeriesInfo,
  updateSeriesSessions,
  deleteSeriesSessions,
} from "@/lib/recurring/series-operations";

interface RouteParams {
  params: Promise<{ seriesId: string }>;
}

/**
 * GET /api/sessions/series/[seriesId]
 *
 * Get all sessions in a series
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { seriesId } = await params;

    if (!seriesId) {
      return NextResponse.json(
        { error: "seriesId is required" },
        { status: 400 }
      );
    }

    const sessions = await getSeriesSessions(seriesId);
    const info = await getSeriesInfo(seriesId);

    return NextResponse.json({
      seriesId,
      sessions,
      info,
    });
  } catch (error) {
    console.error("[Series API] GET error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get series sessions",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sessions/series/[seriesId]
 *
 * Update sessions in a series
 * Query params:
 *   - scope: "single" | "future" | "all"
 *   - sessionId: required for "single" and "future" scope
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { seriesId } = await params;
    const { searchParams } = new URL(request.url);
    const scope = (searchParams.get("scope") || "single") as SeriesScope;
    const sessionId = searchParams.get("sessionId");

    if (!seriesId) {
      return NextResponse.json(
        { error: "seriesId is required" },
        { status: 400 }
      );
    }

    if ((scope === "single" || scope === "future") && !sessionId) {
      return NextResponse.json(
        { error: "sessionId is required for single/future scope" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate scope
    if (!["single", "future", "all"].includes(scope)) {
      return NextResponse.json(
        { error: "Invalid scope. Must be 'single', 'future', or 'all'" },
        { status: 400 }
      );
    }

    const result = await updateSeriesSessions(
      seriesId,
      sessionId || "",
      body,
      scope
    );

    console.log("[Series API] Updated sessions:", {
      seriesId,
      scope,
      sessionId,
      updatedCount: result.updatedCount,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Series API] PATCH error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update series sessions",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/series/[seriesId]
 *
 * Delete sessions in a series
 * Query params:
 *   - scope: "single" | "future" | "all"
 *   - sessionId: required for "single" and "future" scope
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { seriesId } = await params;
    const { searchParams } = new URL(request.url);
    const scope = (searchParams.get("scope") || "single") as SeriesScope;
    const sessionId = searchParams.get("sessionId");

    if (!seriesId) {
      return NextResponse.json(
        { error: "seriesId is required" },
        { status: 400 }
      );
    }

    if ((scope === "single" || scope === "future") && !sessionId) {
      return NextResponse.json(
        { error: "sessionId is required for single/future scope" },
        { status: 400 }
      );
    }

    // Validate scope
    if (!["single", "future", "all"].includes(scope)) {
      return NextResponse.json(
        { error: "Invalid scope. Must be 'single', 'future', or 'all'" },
        { status: 400 }
      );
    }

    const result = await deleteSeriesSessions(seriesId, sessionId || "", scope);

    console.log("[Series API] Deleted sessions:", {
      seriesId,
      scope,
      sessionId,
      deletedCount: result.deletedCount,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Series API] DELETE error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete series sessions",
      },
      { status: 500 }
    );
  }
}
