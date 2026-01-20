import { NextResponse } from "next/server";
import { baseqlClient } from "@/lib/baseql";
import { requireStaffSession } from "@/lib/api-auth";

interface Capacity {
  id: string;
  name: string;
}

/**
 * GET /api/capacities
 * Fetch all capacity options
 */
export async function GET() {
  try {
    const auth = await requireStaffSession();
    if (auth instanceof NextResponse) return auth;

    const query = `
      query GetCapacities {
        capacities(_order_by: { name: "asc" }) {
          id
          name
        }
      }
    `;

    const result = await baseqlClient.query<{ capacities: Capacity[] }>(query);

    // Filter out archived capacities
    const capacities = (result.capacities || []).filter(
      (c) => !c.name.toLowerCase().includes("archive")
    );

    return NextResponse.json({ capacities });
  } catch (error) {
    console.error("Error fetching capacities:", error);
    return NextResponse.json(
      { error: "Failed to fetch capacities" },
      { status: 500 }
    );
  }
}
