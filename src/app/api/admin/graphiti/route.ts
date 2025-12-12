/**
 * Graphiti API Proxy
 *
 * Proxies requests to the Graphiti service with HMAC authentication.
 * Staff-only endpoint for admin tools.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const GRAPHITI_API_URL = process.env.GRAPHITI_API_URL;
const GRAPHITI_API_SECRET = process.env.GRAPHITI_API_SECRET;

/**
 * Generate HMAC-SHA256 signature for request authentication
 */
function generateSignature(timestamp: string, body: string): string {
  if (!GRAPHITI_API_SECRET) {
    throw new Error("GRAPHITI_API_SECRET is not configured");
  }

  const payload = `${timestamp}.${body}`;
  return crypto
    .createHmac("sha256", GRAPHITI_API_SECRET)
    .update(payload)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  // TODO: Add auth check for staff only

  if (!GRAPHITI_API_URL) {
    return NextResponse.json(
      { error: "GRAPHITI_API_URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const { endpoint, method = "POST", body } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: "endpoint is required" },
        { status: 400 }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyString = body ? JSON.stringify(body) : "";
    const signature = generateSignature(timestamp, bodyString);

    const url = `${GRAPHITI_API_URL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for long operations

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Graphiti-Signature": signature,
          "X-Graphiti-Timestamp": timestamp,
        },
        body: bodyString || undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return NextResponse.json(
          {
            error: `Graphiti API error (${response.status})`,
            details: data,
          },
          { status: response.status }
        );
      }

      return NextResponse.json(data);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          { error: "Request timed out after 120 seconds" },
          { status: 504 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Graphiti proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // TODO: Add auth check for staff only

  if (!GRAPHITI_API_URL) {
    return NextResponse.json(
      { error: "GRAPHITI_API_URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json(
        { error: "endpoint query param is required" },
        { status: 400 }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(timestamp, "");

    const url = `${GRAPHITI_API_URL}${endpoint}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Graphiti-Signature": signature,
        "X-Graphiti-Timestamp": timestamp,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Graphiti API error (${response.status})`,
          details: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Graphiti proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
