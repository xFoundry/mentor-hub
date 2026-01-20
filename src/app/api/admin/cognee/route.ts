/**
 * Cognee API Proxy
 *
 * Proxies requests to the Cognee service with HMAC authentication.
 * Staff-only endpoint for admin tools.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireStaffSession } from "@/lib/api-auth";

const COGNEE_API_URL = process.env.COGNEE_API_URL;
const COGNEE_API_SECRET = process.env.COGNEE_API_SECRET;

/**
 * Generate HMAC-SHA256 signature for request authentication
 */
function generateSignature(timestamp: string, body: string): string {
  if (!COGNEE_API_SECRET) {
    throw new Error("COGNEE_API_SECRET is not configured");
  }

  const payload = `${timestamp}.${body}`;
  return crypto
    .createHmac("sha256", COGNEE_API_SECRET)
    .update(payload)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  const auth = await requireStaffSession();
  if (auth instanceof NextResponse) return auth;

  if (!COGNEE_API_URL) {
    return NextResponse.json(
      { error: "COGNEE_API_URL is not configured" },
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

    const url = `${COGNEE_API_URL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for sync operations

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Signature": signature,
          "X-Timestamp": timestamp,
        },
        body: bodyString || undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return NextResponse.json(
          {
            error: `Cognee API error (${response.status})`,
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
          { error: "Request timed out after 300 seconds" },
          { status: 504 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Cognee proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireStaffSession();
  if (auth instanceof NextResponse) return auth;

  if (!COGNEE_API_URL) {
    return NextResponse.json(
      { error: "COGNEE_API_URL is not configured" },
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

    const url = `${COGNEE_API_URL}${endpoint}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": signature,
        "X-Timestamp": timestamp,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Cognee API error (${response.status})`,
          details: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Cognee proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
