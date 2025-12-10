import { NextRequest, NextResponse } from "next/server";
import { triggerSync, getGraphitiHealth } from "@/lib/graphiti-client";

/**
 * Graphiti Sync Cron Job
 *
 * This endpoint is called by Vercel cron every 10 minutes.
 * It triggers incremental data sync from Airtable to the Graphiti knowledge graph.
 *
 * The sync process:
 * 1. Fetches updated records from Airtable via BaseQL
 * 2. Transforms them into episodes for Graphiti
 * 3. Adds them to the Neo4j knowledge graph
 *
 * Security: Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Check if Graphiti service is configured
    if (!process.env.GRAPHITI_API_URL || !process.env.GRAPHITI_API_SECRET) {
      return NextResponse.json({
        message: "Graphiti sync disabled - API not configured",
        configured: false,
      });
    }

    // Check Graphiti service health
    let healthStatus;
    try {
      healthStatus = await getGraphitiHealth();
    } catch {
      return NextResponse.json(
        {
          error: "Graphiti service unavailable",
          message: "Could not reach Graphiti API",
        },
        { status: 503 }
      );
    }

    if (healthStatus.status !== "healthy") {
      return NextResponse.json(
        {
          error: "Graphiti service unhealthy",
          status: healthStatus,
        },
        { status: 503 }
      );
    }

    // Trigger incremental sync
    const syncResult = await triggerSync({
      fullSync: false, // Incremental sync only
    });

    const duration = Date.now() - startTime;

    return NextResponse.json({
      message: "Graphiti sync completed",
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      sync: syncResult,
    });
  } catch (error) {
    console.error("[Cron] Graphiti sync error:", error);

    return NextResponse.json(
      {
        error: "Graphiti sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for manual sync triggers
 *
 * Supports full sync via request body:
 * POST /api/cron/graphiti-sync
 * { "fullSync": true, "cohortId": "optional-cohort-filter" }
 */
export async function POST(request: NextRequest) {
  // Verify cron secret for manual triggers too
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Check configuration
    if (!process.env.GRAPHITI_API_URL || !process.env.GRAPHITI_API_SECRET) {
      return NextResponse.json({
        message: "Graphiti sync disabled - API not configured",
        configured: false,
      });
    }

    // Parse request body
    let body: { fullSync?: boolean; cohortId?: string; entities?: string[] } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine - use defaults
    }

    // Trigger sync with provided options
    const syncResult = await triggerSync({
      fullSync: body.fullSync ?? false,
      cohortId: body.cohortId,
      entities: body.entities,
    });

    const duration = Date.now() - startTime;

    return NextResponse.json({
      message: body.fullSync ? "Full Graphiti sync completed" : "Graphiti sync completed",
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      options: {
        fullSync: body.fullSync ?? false,
        cohortId: body.cohortId,
        entities: body.entities,
      },
      sync: syncResult,
    });
  } catch (error) {
    console.error("[Cron] Manual Graphiti sync error:", error);

    return NextResponse.json(
      {
        error: "Graphiti sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
