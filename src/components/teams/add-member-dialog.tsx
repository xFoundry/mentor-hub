"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2, UserPlus, Check, AlertCircle } from "lucide-react";
import { useAvailableContacts } from "@/hooks/use-available-contacts";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  cohortId?: string;
  currentMemberIds: string[];
  onAddMember: (contactId: string, type?: string) => Promise<void>;
}

export function AddMemberDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  cohortId,
  currentMemberIds,
  onAddMember,
}: AddMemberDialogProps) {
  const { contacts, isLoading, searchTerm, setSearchTerm } = useAvailableContacts(
    cohortId,
    teamId
  );
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [memberType, setMemberType] = useState("Member");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedContactId(null);
      setMemberType("Member");
      setSearchTerm("");
    }
  }, [open, setSearchTerm]);

  // Filter out contacts who are already members
  const availableContacts = contacts.filter(
    (contact) => !currentMemberIds.includes(contact.id)
  );

  const handleSubmit = async () => {
    if (!selectedContactId) return;

    setIsSubmitting(true);

    try {
      await onAddMember(selectedContactId, memberType);
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding member:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Search for a contact to add to {teamName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Contacts</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="pl-9"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Contact list */}
          <div className="space-y-2">
            <Label>Available Contacts</Label>
            <ScrollArea className="h-[200px] rounded-md border">
              {isLoading ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : availableContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchTerm
                      ? "No contacts found matching your search"
                      : "No available contacts"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {availableContacts.map((contact) => {
                    const initials = contact.fullName
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) || "?";
                    const isSelected = selectedContactId === contact.id;

                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => setSelectedContactId(contact.id)}
                        className={`w-full flex items-center gap-3 rounded-md p-2 text-left transition-colors ${
                          isSelected
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted"
                        }`}
                        disabled={isSubmitting}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={(contact as any).headshot?.[0]?.url}
                            alt={contact.fullName || ""}
                          />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">
                              {contact.fullName || "Unknown"}
                            </p>
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {contact.email}
                          </p>
                        </div>
                        {(contact as any).currentTeamName && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {(contact as any).currentTeamName}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Member type selection */}
          {selectedContactId && (
            <div className="space-y-2">
              <Label htmlFor="memberType">Member Type</Label>
              <Select
                value={memberType}
                onValueChange={setMemberType}
                disabled={isSubmitting}
              >
                <SelectTrigger id="memberType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Member">Member</SelectItem>
                  <SelectItem value="Lead">Team Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selected contact preview */}
          {selectedContact && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground mb-1">Adding:</p>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={(selectedContact as any).headshot?.[0]?.url}
                    alt={selectedContact.fullName || ""}
                  />
                  <AvatarFallback>
                    {selectedContact.fullName
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedContact.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    as {memberType}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedContactId || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
