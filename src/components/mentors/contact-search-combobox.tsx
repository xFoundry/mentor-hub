"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Contact } from "@/types/schema";

const MIN_SEARCH_CHARS = 2;
const DEBOUNCE_MS = 300;

interface ContactSearchComboboxProps {
  value?: string; // contactId
  onSelect: (contact: Contact) => void;
  excludeIds?: string[];
  cohortId?: string; // To show if contact is already a mentor in this cohort
  placeholder?: string;
  disabled?: boolean;
}

export function ContactSearchCombobox({
  value,
  onSelect,
  excludeIds = [],
  cohortId,
  placeholder = "Search for a contact...",
  disabled = false,
}: ContactSearchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Debounce the search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search when debounced query changes
  React.useEffect(() => {
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (debouncedQuery.length < MIN_SEARCH_CHARS) {
      setContacts([]);
      setIsSearching(false);
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/contacts/search?q=${encodeURIComponent(debouncedQuery)}`,
          { signal: abortController.signal }
        );
        if (!response.ok) {
          throw new Error("Search failed");
        }
        const data = await response.json();
        setContacts(data.contacts || []);
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        console.error("Error searching contacts:", error);
        setContacts([]);
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearching(false);
        }
      }
    };

    performSearch();

    return () => {
      abortController.abort();
    };
  }, [debouncedQuery]);

  // Filter out excluded contacts
  const filteredContacts = React.useMemo(() => {
    return contacts.filter((contact) => !excludeIds.includes(contact.id));
  }, [contacts, excludeIds]);

  // Check if contact is already a mentor in the target cohort
  const isMentorInCohort = (contact: Contact): boolean => {
    if (!cohortId) return false;
    return contact.participation?.some(
      (p) =>
        p.capacity === "Mentor" &&
        p.status === "Active" &&
        p.cohorts?.some((c) => c.id === cohortId)
    ) ?? false;
  };

  const getInitials = (name?: string): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get empty state message
  const getEmptyMessage = () => {
    if (searchQuery.length === 0) {
      return "Type to search contacts...";
    }
    if (searchQuery.length < MIN_SEARCH_CHARS) {
      return `Type at least ${MIN_SEARCH_CHARS} characters to search...`;
    }
    if (isSearching) {
      return "Searching...";
    }
    return "No contacts found.";
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {selectedContact ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage
                  src={selectedContact.headshot?.[0]?.url}
                  alt={selectedContact.fullName || ""}
                />
                <AvatarFallback className="text-xs">
                  {getInitials(selectedContact.fullName)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedContact.fullName}</span>
            </div>
          ) : (
            <span className="text-muted-foreground flex items-center gap-2">
              <Search className="h-4 w-4" />
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name or email..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              <div className="flex items-center justify-center gap-2 py-2">
                {isSearching && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{getEmptyMessage()}</span>
              </div>
            </CommandEmpty>
            {filteredContacts.length > 0 && (
              <CommandGroup>
                {filteredContacts.slice(0, 50).map((contact) => {
                  const isAlreadyMentor = isMentorInCohort(contact);
                  return (
                    <CommandItem
                      key={contact.id}
                      value={contact.id}
                      onSelect={() => {
                        if (!isAlreadyMentor) {
                          setSelectedContact(contact);
                          onSelect(contact);
                          setOpen(false);
                          setSearchQuery("");
                        }
                      }}
                      disabled={isAlreadyMentor}
                      className={cn(
                        "flex items-center gap-3 py-2",
                        isAlreadyMentor && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={contact.headshot?.[0]?.url}
                          alt={contact.fullName || ""}
                        />
                        <AvatarFallback className="text-xs">
                          {getInitials(contact.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {contact.fullName || "Unknown"}
                          </span>
                          {isAlreadyMentor && (
                            <Badge variant="secondary" className="text-xs">
                              Already mentor
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate block">
                          {contact.email}
                        </span>
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value === contact.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  );
                })}
                {filteredContacts.length > 50 && (
                  <div className="p-2 text-center text-xs text-muted-foreground">
                    Showing first 50 results. Refine your search for more.
                  </div>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
