"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, ShieldAlert } from "lucide-react";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { useContacts, type ContactFilters } from "@/hooks/use-contacts";
import { ContactsTableView } from "@/components/contacts/contacts-table-view";
import { ContactFiltersComponent } from "@/components/contacts/contact-filters";
import {
  ContactEditSheet,
  type ContactFormData,
} from "@/components/contacts/contact-edit-sheet";
import type { Contact } from "@/types/schema";

export default function ContactsPage() {
  const { userType, isLoading: isUserLoading } = useEffectiveUser();

  // Filter state
  const [filters, setFilters] = useState<ContactFilters>({});

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>(
    undefined
  );

  // Fetch contacts with filters
  const {
    contacts,
    isLoading: isContactsLoading,
    updateContact,
    createContact,
  } = useContacts(filters);

  const handleContactClick = useCallback((contact: Contact) => {
    setEditingContact(contact);
    setSheetOpen(true);
  }, []);

  const handleCreateClick = useCallback(() => {
    setEditingContact(undefined);
    setSheetOpen(true);
  }, []);

  const handleSave = useCallback(
    async (formData: ContactFormData) => {
      if (editingContact) {
        // Update existing contact
        await updateContact(editingContact.id, formData);
      } else {
        // Create new contact
        await createContact({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          bio: formData.bio,
          type: formData.type,
          expertise: formData.expertise,
          linkedIn: formData.linkedIn,
          gitHub: formData.gitHub,
          websiteUrl: formData.websiteUrl,
          webflowStatus: formData.webflowStatus,
          headshot: formData.headshot,
        });
      }
    },
    [editingContact, updateContact, createContact]
  );

  const hasActiveFilters = Boolean(
    filters.searchTerm ||
    (filters.types && filters.types.length > 0) ||
    (filters.webflowStatuses && filters.webflowStatuses.length > 0) ||
    filters.hasName
  );

  // Show loading state while checking user type
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show access denied for non-staff users
  if (userType !== "staff") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-sm">
          You don&apos;t have permission to access the Contacts Management page.
          This feature is only available to staff members.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 h-full gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Manage all contacts in the system. Click on a row to edit.
          </p>
        </div>
        <Button onClick={handleCreateClick}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Filters */}
      <div className="shrink-0">
        <ContactFiltersComponent filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Contact count */}
      {!isContactsLoading && (
        <p className="text-sm text-muted-foreground shrink-0">
          {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          {hasActiveFilters ? " found" : " total"}
        </p>
      )}

      {/* Table - takes remaining space */}
      <div className="flex-1 min-h-0">
        <ContactsTableView
          contacts={contacts}
          isLoading={isContactsLoading}
          hasFilters={hasActiveFilters}
          onContactClick={handleContactClick}
          className="h-full"
        />
      </div>

      {/* Edit/Create Sheet */}
      <ContactEditSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        contact={editingContact}
        onSave={handleSave}
      />
    </div>
  );
}
