import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  getUserByAuth0Id,
  getUserParticipation,
  linkAuth0IdToContact,
} from "@/lib/baseql";

/**
 * POST /api/auth/link-identity
 *
 * Links the current Auth0 user's ID to their BaseQL contact record.
 * This endpoint is called after successful Auth0 authentication.
 *
 * Security:
 * - Only uses auth0Id from the verified server-side session
 * - Never accepts auth0Id from request parameters (prevents spoofing)
 * - Validates contact exists before linking
 * - Detects conflicts when contact is already linked to different auth0Id
 */
export async function POST() {
  try {
    // Get the current session (server-side verified)
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const auth0Id = session.user.sub;
    const email = session.user.email?.toLowerCase().trim();

    if (!auth0Id) {
      return NextResponse.json(
        { error: "No Auth0 ID in session" },
        { status: 400 }
      );
    }

    // Step 1: Check if already linked by auth0Id
    const { contacts: linkedContacts, participation: linkedParticipation } =
      await getUserByAuth0Id(auth0Id);

    if (linkedContacts.length > 0) {
      // Already linked - return existing data
      return NextResponse.json({
        linked: true,
        isNewLink: false,
        contacts: linkedContacts,
        participation: linkedParticipation,
      });
    }

    // Step 2: Not linked yet - try to find contact by email
    if (!email) {
      return NextResponse.json({
        linked: false,
        error: "no_email",
        message: "No email in Auth0 profile. Cannot auto-link.",
      });
    }

    const { contact: emailContact, participation: emailParticipation } =
      await getUserParticipation(email);

    if (!emailContact) {
      // No contact found with this email
      return NextResponse.json({
        linked: false,
        error: "contact_not_found",
        message: "No profile found for this email address.",
      });
    }

    // Step 3: Check if contact already has a different auth0Id
    if (emailContact.auth0Id && emailContact.auth0Id !== auth0Id) {
      // This contact is linked to a different Auth0 account
      console.warn(
        `[link-identity] Conflict: Contact ${emailContact.id} (${email}) ` +
        `already linked to ${emailContact.auth0Id}, attempted by ${auth0Id}`
      );
      return NextResponse.json({
        linked: false,
        error: "already_linked_different",
        message: "This contact is linked to a different Auth0 account. " +
          "Please contact support if you believe this is an error.",
        conflictDetected: true,
      });
    }

    // Step 4: Link auth0Id to contact
    try {
      const updatedContact = await linkAuth0IdToContact(emailContact.id, auth0Id);

      console.log(
        `[link-identity] Successfully linked ${auth0Id} to contact ` +
        `${emailContact.id} (${email})`
      );

      return NextResponse.json({
        linked: true,
        isNewLink: true,
        contact: updatedContact,
        participation: emailParticipation,
      });
    } catch (linkError) {
      console.error("[link-identity] Failed to link auth0Id:", linkError);
      return NextResponse.json(
        {
          linked: false,
          error: "link_failed",
          message: "Failed to link account. Please try again.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[link-identity] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/link-identity
 *
 * Check current linking status for the authenticated user.
 */
export async function GET() {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const auth0Id = session.user.sub;

    if (!auth0Id) {
      return NextResponse.json(
        { error: "No Auth0 ID in session" },
        { status: 400 }
      );
    }

    const { contacts, participation } = await getUserByAuth0Id(auth0Id);

    return NextResponse.json({
      linked: contacts.length > 0,
      contacts,
      participation,
      auth0Id, // Include for debugging (only visible to authenticated user)
    });
  } catch (error) {
    console.error("[link-identity] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
