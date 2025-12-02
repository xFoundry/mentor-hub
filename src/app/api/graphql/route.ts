import { NextRequest, NextResponse } from "next/server";

/**
 * GraphQL Proxy Route
 *
 * Proxies GraphQL requests to BaseQL, keeping the API key server-side.
 * This prevents the BaseQL API key from being exposed in the browser.
 */

const BASEQL_API_URL = process.env.BASEQL_API_URL;
const BASEQL_API_KEY = process.env.BASEQL_API_KEY;

export async function POST(request: NextRequest) {
  if (!BASEQL_API_URL || !BASEQL_API_KEY) {
    console.error("[GraphQL Proxy] BaseQL not configured");
    return NextResponse.json(
      { errors: [{ message: "GraphQL endpoint not configured" }] },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const response = await fetch(BASEQL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: BASEQL_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[GraphQL Proxy] Error:", error);
    return NextResponse.json(
      { errors: [{ message: "Failed to execute GraphQL query" }] },
      { status: 500 }
    );
  }
}
