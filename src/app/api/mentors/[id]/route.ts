import { NextRequest, NextResponse } from "next/server";
import { updateContact, updateParticipation } from "@/lib/baseql";
import type { Contact, Participation } from "@/types/schema";
import { requireStaffSession } from "@/lib/api-auth";

interface UpdateMentorInput {
  // Contact fields
  firstName?: string;
  lastName?: string;
  email?: string;
  bio?: string;
  expertise?: string[];
  linkedIn?: string;
  websiteUrl?: string;
  // Participation fields
  participationId?: string;
  status?: string;
}

/**
 * PUT /api/mentors/[id]
 *
 * Update a mentor's contact info and/or participation status.
 * The [id] parameter is the contact ID.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffSession();
    if (auth instanceof NextResponse) return auth;

    const { id: contactId } = await params;
    const body: UpdateMentorInput = await request.json();

    if (!contactId) {
      return NextResponse.json(
        { error: "Missing contact ID" },
        { status: 400 }
      );
    }

    const results: {
      contact?: Contact | Contact[];
      participation?: Participation | Participation[];
    } = {};

    // Update contact fields if any are provided
    const contactUpdates: Partial<Contact> = {};
    if (body.firstName !== undefined) contactUpdates.firstName = body.firstName;
    if (body.lastName !== undefined) contactUpdates.lastName = body.lastName;
    if (body.email !== undefined) contactUpdates.email = body.email;
    if (body.bio !== undefined) contactUpdates.bio = body.bio;
    if (body.expertise !== undefined) contactUpdates.expertise = body.expertise;
    if (body.linkedIn !== undefined) contactUpdates.linkedIn = body.linkedIn;
    if (body.websiteUrl !== undefined) contactUpdates.websiteUrl = body.websiteUrl;

    // If firstName or lastName changed, update fullName too
    if (body.firstName !== undefined || body.lastName !== undefined) {
      const firstName = body.firstName || "";
      const lastName = body.lastName || "";
      contactUpdates.fullName = `${firstName} ${lastName}`.trim();
    }

    if (Object.keys(contactUpdates).length > 0) {
      const contactResult = await updateContact(contactId, contactUpdates);
      results.contact = contactResult.update_contacts;
      console.log(`[Mentors API] Updated contact ${contactId}:`, Object.keys(contactUpdates));
    }

    // Update participation status if provided
    if (body.participationId && body.status !== undefined) {
      const participationResult = await updateParticipation(body.participationId, {
        status: body.status,
      });
      results.participation = participationResult.update_participation;
      console.log(`[Mentors API] Updated participation ${body.participationId} status to ${body.status}`);
    }

    if (Object.keys(results).length === 0) {
      return NextResponse.json(
        { error: "No valid update fields provided" },
        { status: 400 }
      );
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("[Mentors API] Error updating mentor:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update mentor" },
      { status: 500 }
    );
  }
}
