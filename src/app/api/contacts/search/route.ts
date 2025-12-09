import { NextRequest, NextResponse } from "next/server";
import { baseqlClient } from "@/lib/baseql";
import type { Contact } from "@/types/schema";

// In-memory cache for contacts
let contactsCache: Contact[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getContactsFromCache(): Promise<Contact[]> {
  const now = Date.now();

  // Return cached data if valid
  if (contactsCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return contactsCache;
  }

  // Fetch fresh data
  const graphqlQuery = `
    query GetContactsForSearch {
      contacts(
        _order_by: { fullName: "asc" }
      ) {
        id
        fullName
        firstName
        lastName
        email
        bio
        expertise
        linkedIn
        websiteUrl
        headshot
        type
        participation {
          id
          capacity
          status
          cohorts {
            id
            shortName
          }
        }
      }
    }
  `;

  const result = await baseqlClient.query<{ contacts: Contact[] }>(graphqlQuery);
  contactsCache = result.contacts || [];
  cacheTimestamp = now;

  return contactsCache;
}

/**
 * GET /api/contacts/search?q=searchTerm
 * Search contacts by name or email (case-insensitive partial match)
 * Uses in-memory caching to avoid repeated BaseQL queries
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim().toLowerCase();

  if (!query || query.length < 2) {
    return NextResponse.json({ contacts: [] });
  }

  try {
    const allContacts = await getContactsFromCache();

    // Filter contacts by name or email (case-insensitive)
    const filteredContacts = allContacts.filter((contact) => {
      const fullName = contact.fullName?.toLowerCase() || "";
      const email = contact.email?.toLowerCase() || "";
      return fullName.includes(query) || email.includes(query);
    });

    // Limit results
    const limitedContacts = filteredContacts.slice(0, 50);

    return NextResponse.json({ contacts: limitedContacts });
  } catch (error) {
    console.error("Error searching contacts:", error);
    return NextResponse.json(
      { error: "Failed to search contacts" },
      { status: 500 }
    );
  }
}
