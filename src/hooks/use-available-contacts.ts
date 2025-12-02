"use client";

import useSWR from "swr";
import { getAvailableContacts, searchContacts } from "@/lib/baseql";
import type { Contact } from "@/types/schema";
import { useState, useMemo, useCallback } from "react";

/**
 * Hook to fetch available contacts for adding to a team
 * @param cohortId - Optional cohort ID to filter contacts
 * @param excludeTeamId - Optional team ID to exclude current members
 */
export function useAvailableContacts(cohortId?: string, excludeTeamId?: string) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, error, isLoading } = useSWR(
    [`/available-contacts`, cohortId],
    async () => {
      const result = await getAvailableContacts(cohortId);
      return result.contacts || [];
    }
  );

  // Filter contacts based on search term and exclude team members
  const filteredContacts = useMemo(() => {
    let contacts = data || [];

    // Client-side search filtering
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      contacts = contacts.filter((contact) => {
        const fullName = contact.fullName?.toLowerCase() || "";
        const email = contact.email?.toLowerCase() || "";
        return fullName.includes(term) || email.includes(term);
      });
    }

    return contacts;
  }, [data, searchTerm]);

  // Get contacts that are not already in the specified team
  const availableForTeam = useMemo(() => {
    if (!excludeTeamId) return filteredContacts;

    return filteredContacts.filter((contact) => {
      // Check if contact is already an active member of the team
      const activeMemberships = contact.members?.filter(
        (m: any) => m.status === "Active"
      ) || [];
      return !activeMemberships.some(
        (m: any) => m.team?.[0]?.id === excludeTeamId || m.team?.id === excludeTeamId
      );
    });
  }, [filteredContacts, excludeTeamId]);

  // Get current team info for each contact
  const contactsWithTeamInfo = useMemo(() => {
    return availableForTeam.map((contact) => {
      const activeMembership = contact.members?.find(
        (m: any) => m.status === "Active"
      );
      // Handle team being either array or object
      const teamData = activeMembership?.team;
      const currentTeam = Array.isArray(teamData) ? teamData[0] : teamData;

      return {
        ...contact,
        currentTeamName: (currentTeam as any)?.teamName || null,
        hasActiveTeam: !!currentTeam,
      };
    });
  }, [availableForTeam]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  return {
    contacts: contactsWithTeamInfo as (Contact & {
      currentTeamName: string | null;
      hasActiveTeam: boolean;
    })[],
    isLoading,
    error,
    searchTerm,
    setSearchTerm: handleSearch,
  };
}

/**
 * Hook for searching contacts with debounced API calls
 * Use this for real-time search in the add member dialog
 */
export function useContactSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  // Debounce the search term
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    // Simple debounce - in production, use useDebouncedValue or similar
    const timeoutId = setTimeout(() => {
      setDebouncedTerm(term);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, []);

  const { data, error, isLoading } = useSWR(
    debouncedTerm.length >= 2 ? [`/search-contacts`, debouncedTerm] : null,
    async () => {
      if (debouncedTerm.length < 2) return [];
      const result = await searchContacts(debouncedTerm);
      return result.contacts || [];
    }
  );

  return {
    contacts: data || [],
    isLoading: isLoading && debouncedTerm.length >= 2,
    error,
    searchTerm,
    setSearchTerm: handleSearch,
  };
}
