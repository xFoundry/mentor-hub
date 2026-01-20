import { NextRequest, NextResponse } from "next/server";
import { requireAuthSession } from "@/lib/api-auth";

/**
 * GraphQL Proxy Route
 *
 * Proxies GraphQL requests to BaseQL, keeping the API key server-side.
 * This prevents the BaseQL API key from being exposed in the browser.
 */

const BASEQL_API_URL = process.env.BASEQL_API_URL;
const BASEQL_API_KEY = process.env.BASEQL_API_KEY;

function getOperationName(query?: string): string {
  if (!query) return "unknown";
  const match = query.match(/\b(query|mutation)\s+([A-Za-z0-9_]+)/);
  return match?.[2] ?? "anonymous";
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthSession();
  if (auth instanceof NextResponse) return auth;

  const requestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

  if (!BASEQL_API_URL || !BASEQL_API_KEY) {
    console.error("[GraphQL Proxy] BaseQL not configured");
    return NextResponse.json(
      { errors: [{ message: "GraphQL endpoint not configured" }] },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const operationName = getOperationName(body?.query);

    // Debug: log query for troubleshooting (first 200 chars)
    console.log(
      "[GraphQL Proxy] Query:",
      JSON.stringify(body).substring(0, 200),
      "user:",
      auth.email,
      "op:",
      operationName,
      "requestId:",
      requestId
    );

    const response = await fetch(BASEQL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: BASEQL_API_KEY,
      },
      body: JSON.stringify(body),
    });

    // Check if BaseQL returned an error status
    if (!response.ok) {
      const errorText = await response.text();
      const cfRay = response.headers.get("cf-ray");
      const cfCacheStatus = response.headers.get("cf-cache-status");
      console.error(
        `[GraphQL Proxy] BaseQL returned ${response.status} (op=${operationName}, requestId=${requestId}, cfRay=${cfRay ?? "n/a"}, cfCache=${cfCacheStatus ?? "n/a"}): ${errorText}`
      );
      return NextResponse.json(
        { errors: [{ message: `BaseQL error: ${response.status} ${response.statusText}` }] },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[GraphQL Proxy] Error:", errorMsg);
    return NextResponse.json(
      { errors: [{ message: errorMsg }] },
      { status: 500 }
    );
  }
}
