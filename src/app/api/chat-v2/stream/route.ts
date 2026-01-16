/**
 * API proxy for the LangGraph orchestrator chat stream endpoint.
 * Forwards requests to the orchestrator-langgraph service while keeping credentials server-side.
 */

import { NextRequest, NextResponse } from "next/server";

const ORCHESTRATOR_LANGGRAPH_URL = process.env.ORCHESTRATOR_LANGGRAPH_URL;

const buildUrl = (base: string, path: string) => {
  const normalized = base.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${normalized}${suffix}`;
};

export async function POST(request: NextRequest) {
  // Check if orchestrator URL is configured
  if (!ORCHESTRATOR_LANGGRAPH_URL) {
    console.error("[Chat V2] ORCHESTRATOR_LANGGRAPH_URL not configured");
    return NextResponse.json(
      {
        error: "LangGraph Orchestrator URL not configured. Set ORCHESTRATOR_LANGGRAPH_URL in .env.local",
        hint: "For local dev: ORCHESTRATOR_LANGGRAPH_URL=http://localhost:8000"
      },
      { status: 500 }
    );
  }

  const streamUrl = buildUrl(ORCHESTRATOR_LANGGRAPH_URL, "/chat/stream");
  console.log(`[Chat V2] Connecting to: ${streamUrl}`);

  try {
    const body = await request.json();

    // Forward the request to the LangGraph orchestrator with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout

    const response = await fetch(streamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Chat V2 Stream Proxy] Orchestrator error:", errorText);
      return NextResponse.json(
        { error: `LangGraph Orchestrator error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    // Stream the response back to the client
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = errorMessage.includes("abort");
    const isConnectionRefused = errorMessage.includes("ECONNREFUSED");

    console.error("[Chat V2 Stream Proxy] Error:", errorMessage);

    if (isConnectionRefused) {
      return NextResponse.json(
        {
          error: "Cannot connect to LangGraph orchestrator",
          hint: `Is the orchestrator running at ${ORCHESTRATOR_LANGGRAPH_URL}? Start it with: cd orchestrator-langgraph && uvicorn app.main:app --reload`
        },
        { status: 503 }
      );
    }

    if (isTimeout) {
      return NextResponse.json(
        { error: "Request timed out", hint: "The orchestrator took too long to respond" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Failed to connect to LangGraph orchestrator", details: errorMessage },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  if (!ORCHESTRATOR_LANGGRAPH_URL) {
    return NextResponse.json(
      { status: "error", message: "LangGraph Orchestrator URL not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      buildUrl(ORCHESTRATOR_LANGGRAPH_URL, "/chat/stream/health")
    );
    const data = await response.json();
    return NextResponse.json({
      ...data,
      backend: "langgraph",
    });
  } catch (error) {
    console.error("[Chat V2 Stream Proxy] Health check error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to reach LangGraph orchestrator" },
      { status: 500 }
    );
  }
}
