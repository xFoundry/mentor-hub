"use client";

import useSWR from "swr";
import {
  getAllContacts,
  createContact as createContactApi,
  updateContact as updateContactApi,
} from "@/lib/baseql";
import type { Contact } from "@/types/schema";
import { toast } from "sonner";
import { useCallback, useMemo } from "react";

export interface ContactFilters {
  searchTerm?: string;
  types?: string[];
  webflowStatuses?: string[];
  /** Only show contacts that have both firstName and lastName */
  hasName?: boolean;
}

/**
 * Hook to fetch and manage contacts (staff-only)
 * Supports client-side filtering by type, webflowStatus, and search term
 */
export function useContacts(filters?: ContactFilters) {
  // Create a stable cache key - always fetch all, filter client-side
  const cacheKey = useMemo(() => ["/contacts"], []);

  const {
    data,
    error,
    isLoading,
    mutate: boundMutate,
  } = useSWR<Contact[]>(cacheKey, async () => {
    const result = await getAllContacts();
    return result.contacts || [];
  });

  // Apply client-side filtering
  const filteredContacts = useMemo(() => {
    let contacts = data || [];

    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      contacts = contacts.filter(
        (contact) =>
          contact.fullName?.toLowerCase().includes(term) ||
          contact.firstName?.toLowerCase().includes(term) ||
          contact.lastName?.toLowerCase().includes(term) ||
          contact.email?.toLowerCase().includes(term)
      );
    }

    if (filters?.types && filters.types.length > 0) {
      contacts = contacts.filter(
        (contact) => contact.type && filters.types!.includes(contact.type)
      );
    }

    if (filters?.webflowStatuses && filters.webflowStatuses.length > 0) {
      contacts = contacts.filter(
        (contact) =>
          contact.webflowStatus &&
          filters.webflowStatuses!.includes(contact.webflowStatus)
      );
    }

    if (filters?.hasName) {
      contacts = contacts.filter(
        (contact) =>
          contact.firstName?.trim() && contact.lastName?.trim()
      );
    }

    return contacts;
  }, [data, filters?.searchTerm, filters?.types, filters?.webflowStatuses, filters?.hasName]);

  /**
   * Update a contact with optimistic updates
   */
  const updateContact = useCallback(
    async (
      contactId: string,
      updates: {
        firstName?: string;
        lastName?: string;
        // Note: fullName is a computed field in Airtable - don't include it
        email?: string;
        phone?: string;
        bio?: string;
        type?: string;
        expertise?: string[];
        linkedIn?: string;
        gitHub?: string;
        websiteUrl?: string;
        webflowStatus?: string;
        headshot?: { url: string; filename: string }[];
      }
    ) => {
      const currentData = data || [];

      // Create optimistic data
      const optimisticData = currentData.map((contact) =>
        contact.id === contactId ? { ...contact, ...updates } as Contact : contact
      );

      try {
        // Optimistic update with bound mutate
        await boundMutate(
          async (currentContacts): Promise<Contact[]> => {
            // Compute fullName for optimistic UI update (but don't send to API - it's a formula field)
            let computedFullName: string | undefined;
            if (updates.firstName || updates.lastName) {
              const contact = currentData.find((c) => c.id === contactId);
              const firstName = updates.firstName ?? contact?.firstName ?? "";
              const lastName = updates.lastName ?? contact?.lastName ?? "";
              computedFullName = `${firstName} ${lastName}`.trim();
            }

            // Make API call (don't include fullName - it's computed by Airtable)
            await updateContactApi(contactId, updates);

            // Return updated data with computed fullName for UI
            return (currentContacts || []).map((contact: Contact) =>
              contact.id === contactId
                ? {
                    ...contact,
                    ...updates,
                    ...(computedFullName ? { fullName: computedFullName } : {})
                  } as Contact
                : contact
            );
          },
          {
            optimisticData,
            rollbackOnError: true,
            revalidate: false,
            populateCache: true,
          }
        );

        toast.success("Contact updated");
      } catch (error) {
        console.error("Error updating contact:", error);
        toast.error("Failed to update contact");
        throw error;
      }
    },
    [data, boundMutate]
  );

  /**
   * Create a new contact with optimistic updates
   */
  const createContact = useCallback(
    async (input: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      bio?: string;
      expertise?: string[];
      linkedIn?: string;
      gitHub?: string;
      websiteUrl?: string;
      type?: string;
      webflowStatus?: string;
      headshot?: { url: string; filename: string }[];
    }) => {
      // Create optimistic contact (will be replaced with real one after API call)
      const optimisticContact: Contact = {
        id: `temp-${Date.now()}`,
        fullName: `${input.firstName} ${input.lastName}`.trim(),
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        bio: input.bio,
        expertise: input.expertise,
        linkedIn: input.linkedIn,
        gitHub: input.gitHub,
        websiteUrl: input.websiteUrl,
        type: input.type as Contact["type"],
        webflowStatus: input.webflowStatus as Contact["webflowStatus"],
        headshot: input.headshot,
      };

      const currentData = data || [];
      const optimisticData = [optimisticContact, ...currentData];

      try {
        const result = await boundMutate(
          async () => {
            // Make API call
            const response = await createContactApi(input);
            const newContact = response.insert_contacts;

            // Return updated data with real contact
            return [newContact, ...currentData];
          },
          {
            optimisticData,
            rollbackOnError: true,
            revalidate: false,
            populateCache: true,
          }
        );

        toast.success("Contact created");
        return result?.[0]; // Return the new contact
      } catch (error) {
        console.error("Error creating contact:", error);
        toast.error("Failed to create contact");
        throw error;
      }
    },
    [data, boundMutate]
  );

  /**
   * Force revalidation of contacts
   */
  const revalidate = useCallback(() => {
    return boundMutate();
  }, [boundMutate]);

  return {
    contacts: filteredContacts,
    allContacts: data || [],
    isLoading,
    error,
    updateContact,
    createContact,
    revalidate,
    mutate: boundMutate,
  };
}

/**
 * Create a contacts cache key for external mutation
 */
export function getContactsCacheKey() {
  return ["/contacts"];
}

/**
 * Contact type options
 */
export const CONTACT_TYPE_OPTIONS = [
  "Student",
  "Mentor",
  "Staff",
  "Faculty",
  "External",
  "Leadership",
] as const;

/**
 * Webflow status options
 */
export const WEBFLOW_STATUS_OPTIONS = ["Active", "Draft", "Archived"] as const;

/**
 * Expertise options (from BaseQL schema)
 */
export const EXPERTISE_OPTIONS = [
  "Development",
  "Design",
  "Product",
  "Marketing",
  "Sales",
  "Operations",
  "Finance",
  "Legal",
  "Strategy",
  "Leadership",
  "Investment",
  "Manufacturing",
  "Hardware",
  "Software",
  "Analytics",
  "Research",
  "Innovation",
  "Scaling",
  "Branding",
  "Distribution",
  "Healthcare",
  "FinTech",
  "Sustainability",
  "Retail",
  "Education",
  "International",
  "Partnerships",
  "Technology",
  "AI",
  "Networking",
  "Pitching",
  "UX",
  "Fundraising",
  "Enterprise",
  "Security",
  "Media",
  "Compliance",
  "Talent",
  "Supply Chain",
  "Bootstrapping",
  "Growth",
] as const;
