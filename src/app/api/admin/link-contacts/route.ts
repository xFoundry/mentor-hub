import { NextResponse } from "next/server";
import { linkAuth0IdToContact, executeQuery } from "@/lib/baseql";
import { requireStaffSession } from "@/lib/api-auth";
import type { Contact } from "@/types/schema";

/**
 * POST /api/admin/link-contacts
 *
 * Staff-only endpoint to link two contact records together.
 * This copies the auth0Id from the source contact to the target contact,
 * allowing both contacts to be accessed by the same user.
 *
 * Request body:
 * - sourceContactId: The contact that has the auth0Id
 * - targetContactId: The contact to link (will receive the auth0Id)
 *
 * Security:
 * - Only staff users can access this endpoint
 * - Both contacts must exist
 * - Target contact must not already have a different auth0Id
 */
export async function POST(request: Request) {
  try {
    const auth = await requireStaffSession();
    if (auth instanceof NextResponse) return auth;

    // Parse request body
    const body = await request.json();
    const { sourceContactId, targetContactId } = body;

    if (!sourceContactId || !targetContactId) {
      return NextResponse.json(
        { error: "Both sourceContactId and targetContactId are required" },
        { status: 400 }
      );
    }

    if (sourceContactId === targetContactId) {
      return NextResponse.json(
        { error: "Source and target contacts must be different" },
        { status: 400 }
      );
    }

    // Fetch both contacts
    const query = `
      query GetContactsById($sourceId: String!, $targetId: String!) {
        source: contacts(_filter: { id: {_eq: $sourceId} }) {
          id
          email
          fullName
          auth0Id
        }
        target: contacts(_filter: { id: {_eq: $targetId} }) {
          id
          email
          fullName
          auth0Id
        }
      }
    `;

    const result = await executeQuery<{
      source: Contact[];
      target: Contact[];
    }>(query, { sourceId: sourceContactId, targetId: targetContactId });

    const sourceContact = result.source?.[0];
    const targetContact = result.target?.[0];

    if (!sourceContact) {
      return NextResponse.json(
        { error: "Source contact not found" },
        { status: 404 }
      );
    }

    if (!targetContact) {
      return NextResponse.json(
        { error: "Target contact not found" },
        { status: 404 }
      );
    }

    if (!sourceContact.auth0Id) {
      return NextResponse.json(
        {
          error: "Source contact has no auth0Id",
          message: "The source contact must have an auth0Id to link from. " +
            "This happens after the user has logged in at least once.",
        },
        { status: 400 }
      );
    }

    // Check if target already has a different auth0Id
    if (targetContact.auth0Id && targetContact.auth0Id !== sourceContact.auth0Id) {
      return NextResponse.json(
        {
          error: "Target contact already linked",
          message: `Target contact is already linked to a different Auth0 account. ` +
            `To change this, first unlink the target contact.`,
          existingAuth0Id: targetContact.auth0Id,
        },
        { status: 409 }
      );
    }

    // Already linked to the same auth0Id
    if (targetContact.auth0Id === sourceContact.auth0Id) {
      return NextResponse.json({
        success: true,
        message: "Contacts are already linked",
        alreadyLinked: true,
        auth0Id: sourceContact.auth0Id,
      });
    }

    // Link the target contact
    const updatedContact = await linkAuth0IdToContact(
      targetContactId,
      sourceContact.auth0Id
    );

    console.log(
      `[admin/link-contacts] Staff ${auth.email} linked contact ` +
      `${targetContactId} (${targetContact.email}) to auth0Id ${sourceContact.auth0Id} ` +
      `(from contact ${sourceContactId})`
    );

    return NextResponse.json({
      success: true,
      message: "Contacts successfully linked",
      linkedContact: updatedContact,
      auth0Id: sourceContact.auth0Id,
    });
  } catch (error) {
    console.error("[admin/link-contacts] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/link-contacts
 *
 * Staff-only endpoint to unlink a contact by removing its auth0Id.
 *
 * Request body:
 * - contactId: The contact to unlink
 */
export async function DELETE(request: Request) {
  try {
    const auth = await requireStaffSession();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { contactId } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: "contactId is required" },
        { status: 400 }
      );
    }

    // Clear the auth0Id (set to null/empty)
    // Note: BaseQL may require a specific way to clear a field
    const mutation = `
      mutation UnlinkContact($id: String!) {
        update_contacts(id: $id, auth0Id: "") {
          id
          email
          fullName
          auth0Id
        }
      }
    `;

    const { update_contacts: updatedContact } = await executeQuery<{
      update_contacts: Contact;
    }>(mutation, { id: contactId });

    console.log(
      `[admin/link-contacts] Staff ${auth.email} unlinked contact ${contactId}`
    );

    return NextResponse.json({
      success: true,
      message: "Contact unlinked successfully",
      contact: updatedContact,
    });
  } catch (error) {
    console.error("[admin/link-contacts] DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
