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

export async function POST(request: NextRequest) {
  const auth = await requireAuthSession();
  if (auth instanceof NextResponse) return auth;

  if (!BASEQL_API_URL || !BASEQL_API_KEY) {
    console.error("[GraphQL Proxy] BaseQL not configured");
    return NextResponse.json(
      { errors: [{ message: "GraphQL endpoint not configured" }] },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    // Debug: log query for troubleshooting (first 200 chars)
    console.log(
      "[GraphQL Proxy] Query:",
      JSON.stringify(body).substring(0, 200),
      "user:",
      auth.email
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
      console.error(`[GraphQL Proxy] BaseQL returned ${response.status}: ${errorText}`);
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
