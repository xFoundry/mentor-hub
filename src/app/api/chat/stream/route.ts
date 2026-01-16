/**
 * API proxy for the orchestrator chat stream endpoint.
 * Forwards requests to the orchestrator service while keeping credentials server-side.
 */

import { NextRequest, NextResponse } from "next/server";

const ORCHESTRATOR_API_URL = process.env.ORCHESTRATOR_API_URL;

const buildUrl = (base: string, path: string) => {
  const normalized = base.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${normalized}${suffix}`;
};

export async function POST(request: NextRequest) {
  // Check if orchestrator URL is configured
  if (!ORCHESTRATOR_API_URL) {
    return NextResponse.json(
      { error: "Orchestrator API URL not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    // Forward the request to the orchestrator
    const response = await fetch(buildUrl(ORCHESTRATOR_API_URL, "/chat/stream"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add any auth headers here if needed
        // "Authorization": `Bearer ${process.env.ORCHESTRATOR_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Chat Stream Proxy] Orchestrator error:", errorText);
      return NextResponse.json(
        { error: `Orchestrator error: ${response.status}` },
        { status: response.status }
      );
    }

    // Stream the response back to the client
    // The response.body is a ReadableStream, we forward it directly
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[Chat Stream Proxy] Error:", error);
    return NextResponse.json(
      { error: "Failed to connect to orchestrator" },
      { status: 500 }
    );
  }
}

// Also support a health check
export async function GET() {
  if (!ORCHESTRATOR_API_URL) {
    return NextResponse.json(
      { status: "error", message: "Orchestrator API URL not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      buildUrl(ORCHESTRATOR_API_URL, "/chat/stream/health")
    );
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Chat Stream Proxy] Health check error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to reach orchestrator" },
      { status: 500 }
    );
  }
}
