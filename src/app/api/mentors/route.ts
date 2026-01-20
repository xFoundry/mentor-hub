import { NextRequest, NextResponse } from "next/server";
import {
  createContact,
  createParticipation,
  checkExistingParticipation,
  getUserParticipation,
} from "@/lib/baseql";
import { requireStaffSession } from "@/lib/api-auth";

interface CreateMentorInput {
  mode: "link" | "create";
  cohortId: string;
  capacityId: string;
  capacityName: string;
  // For "link" mode
  contactId?: string;
  // For "create" mode
  firstName?: string;
  lastName?: string;
  email?: string;
  bio?: string;
  expertise?: string[];
  linkedIn?: string;
  websiteUrl?: string;
}

/**
 * POST /api/mentors
 *
 * Create a new mentor participation record.
 * Supports two modes:
 * - "link": Link an existing contact as a mentor to a cohort
 * - "create": Create a new contact and link as mentor to a cohort
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaffSession();
    if (auth instanceof NextResponse) return auth;

    const body: CreateMentorInput = await request.json();
    const { mode, cohortId, capacityId, capacityName } = body;

    console.log("[Mentors API] Received request:", JSON.stringify(body, null, 2));

    // Validate required fields
    if (!cohortId) {
      return NextResponse.json(
        { error: "Missing required field: cohortId" },
        { status: 400 }
      );
    }

    if (!capacityId || !capacityName) {
      return NextResponse.json(
        { error: "Missing required fields: capacityId and capacityName" },
        { status: 400 }
      );
    }

    if (!mode || (mode !== "link" && mode !== "create")) {
      return NextResponse.json(
        { error: "Invalid mode. Must be 'link' or 'create'" },
        { status: 400 }
      );
    }

    let contactId: string;

    if (mode === "link") {
      // Link existing contact
      if (!body.contactId) {
        return NextResponse.json(
          { error: "Missing required field: contactId (for link mode)" },
          { status: 400 }
        );
      }
      contactId = body.contactId;

      // Check if participation already exists
      const existingCheck = await checkExistingParticipation(
        contactId,
        cohortId,
        capacityId
      );

      if (existingCheck.exists) {
        return NextResponse.json(
          {
            error: "This contact already has this capacity in this cohort",
            existingParticipation: existingCheck.participation,
          },
          { status: 409 }
        );
      }
    } else {
      // Create new contact
      const { firstName, lastName, email } = body;

      if (!firstName || !lastName || !email) {
        return NextResponse.json(
          { error: "Missing required fields: firstName, lastName, email (for create mode)" },
          { status: 400 }
        );
      }

      // Check if contact with this email already exists
      const existingContact = await getUserParticipation(email);
      if (existingContact.contact) {
        return NextResponse.json(
          {
            error: "A contact with this email already exists. Use 'link' mode to add them as a mentor.",
            existingContact: {
              id: existingContact.contact.id,
              fullName: existingContact.contact.fullName,
              email: existingContact.contact.email,
            },
          },
          { status: 409 }
        );
      }

      // Create the new contact
      const createResult = await createContact({
        firstName,
        lastName,
        email,
        bio: body.bio,
        expertise: body.expertise,
        linkedIn: body.linkedIn,
        websiteUrl: body.websiteUrl,
        type: "Mentor",
      });

      const createdContact = Array.isArray(createResult.insert_contacts)
        ? createResult.insert_contacts[0]
        : createResult.insert_contacts;

      if (!createdContact?.id) {
        return NextResponse.json(
          { error: "Failed to create contact" },
          { status: 500 }
        );
      }

      contactId = createdContact.id;
      console.log(`[Mentors API] Created new contact: ${createdContact.fullName} (${contactId})`);
    }

    // Create participation record
    console.log("[Mentors API] Creating participation with:", {
      contactId,
      cohortId,
      capacityLinkId: capacityId,
      capacityName,
      status: "Active",
    });

    const participationResult = await createParticipation({
      contactId,
      cohortId,
      capacityLinkId: capacityId,
      capacityName,
      status: "Active",
    });

    const createdParticipation = Array.isArray(participationResult.insert_participation)
      ? participationResult.insert_participation[0]
      : participationResult.insert_participation;

    if (!createdParticipation?.id) {
      return NextResponse.json(
        { error: "Failed to create participation record" },
        { status: 500 }
      );
    }

    console.log(`[Mentors API] Created mentor participation: ${createdParticipation.id} for contact ${contactId} in cohort ${cohortId}`);

    return NextResponse.json({
      participation: createdParticipation,
      contact: createdParticipation.contacts?.[0],
    });
  } catch (error) {
    console.error("[Mentors API] Error creating mentor:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create mentor" },
      { status: 500 }
    );
  }
}
