"use client";

import { useState, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Info, Mail, Users } from "lucide-react";
import type { Session } from "@/types/schema";
import type { SessionChanges, SessionParticipant } from "@/lib/notifications/types";
import { getSessionParticipants } from "@/lib/notifications/scheduler";
import { formatAsEastern, TIMEZONE_ABBR } from "@/lib/timezone";

interface SessionUpdateConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  changes: SessionChanges;
  onConfirm: (selectedRecipientIds: string[] | null) => Promise<void>;
  isSubmitting: boolean;
}

type NotificationOption = "none" | "select" | "all";

export function SessionUpdateConfirmationDialog({
  open,
  onOpenChange,
  session,
  changes,
  onConfirm,
  isSubmitting,
}: SessionUpdateConfirmationDialogProps) {
  const [notificationOption, setNotificationOption] = useState<NotificationOption>("all");
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());

  // Get all participants from the session
  const participants = useMemo(() => {
    return getSessionParticipants(session);
  }, [session]);

  // Initialize selected recipients when option changes to "select"
  const handleOptionChange = (value: NotificationOption) => {
    setNotificationOption(value);
    if (value === "select") {
      // Pre-select all by default when switching to select mode
      setSelectedRecipients(new Set(participants.map((p) => p.id)));
    }
  };

  const toggleRecipient = (id: string) => {
    const newSet = new Set(selectedRecipients);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRecipients(newSet);
  };

  const handleConfirm = async () => {
    let recipientIds: string[] | null = null;

    if (notificationOption === "all") {
      recipientIds = participants.map((p) => p.id);
    } else if (notificationOption === "select" && selectedRecipients.size > 0) {
      recipientIds = Array.from(selectedRecipients);
    }
    // If "none" or no selections, recipientIds stays null

    await onConfirm(recipientIds);
  };

  const formatChangeValue = (
    type: keyof SessionChanges,
    value: string | number | undefined
  ): string => {
    if (value === undefined || value === "") return "Not set";

    if (type === "scheduledStart") {
      try {
        // Format in Eastern timezone with ET suffix
        return `${formatAsEastern(value as string, "MMM d, yyyy 'at' h:mm a")} ${TIMEZONE_ABBR}`;
      } catch {
        return String(value);
      }
    }

    if (type === "duration") {
      const mins = value as number;
      if (mins >= 60) {
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return remainingMins > 0
          ? `${hours}h ${remainingMins}m`
          : `${hours} hour${hours > 1 ? "s" : ""}`;
      }
      return `${mins} minutes`;
    }

    return String(value);
  };

  const changesList = useMemo(() => {
    const items: Array<{ label: string; old: string; new: string }> = [];

    if (changes.scheduledStart) {
      items.push({
        label: "Time",
        old: formatChangeValue("scheduledStart", changes.scheduledStart.old),
        new: formatChangeValue("scheduledStart", changes.scheduledStart.new),
      });
    }

    if (changes.duration) {
      items.push({
        label: "Duration",
        old: formatChangeValue("duration", changes.duration.old),
        new: formatChangeValue("duration", changes.duration.new),
      });
    }

    if (changes.locationId) {
      items.push({
        label: "Location",
        old: changes.locationName?.old || "Not set",
        new: changes.locationName?.new || "Not set",
      });
    }

    if (changes.meetingUrl) {
      items.push({
        label: "Meeting URL",
        old: changes.meetingUrl.old || "Not set",
        new: changes.meetingUrl.new || "Not set",
      });
    }

    return items;
  }, [changes]);

  const recipientCount =
    notificationOption === "all"
      ? participants.length
      : notificationOption === "select"
        ? selectedRecipients.size
        : 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Session Update</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Changes Summary */}
              <div>
                <p className="font-medium text-foreground mb-2">
                  The following changes will be saved:
                </p>
                <div className="rounded-md border bg-muted/50 p-3 space-y-2">
                  {changesList.map((change, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">{change.label}:</span>{" "}
                      <span className="text-muted-foreground line-through">
                        {change.old}
                      </span>{" "}
                      <span className="text-foreground">→ {change.new}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notification Options */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    Email Notification
                  </span>
                </div>

                <RadioGroup
                  value={notificationOption}
                  onValueChange={(v) => handleOptionChange(v as NotificationOption)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="none" />
                    <Label htmlFor="none" className="font-normal cursor-pointer">
                      Don't send notification emails
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="select" id="select" />
                    <Label htmlFor="select" className="font-normal cursor-pointer">
                      Select recipients
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="font-normal cursor-pointer">
                      Send to all participants ({participants.length}{" "}
                      {participants.length === 1 ? "person" : "people"})
                    </Label>
                  </div>
                </RadioGroup>

                {/* Recipient Selection */}
                {notificationOption === "select" && (
                  <div className="mt-3 rounded-md border p-3 max-h-40 overflow-y-auto">
                    {participants.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No participants found
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {participants.map((participant) => (
                          <div
                            key={participant.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={participant.id}
                              checked={selectedRecipients.has(participant.id)}
                              onCheckedChange={() =>
                                toggleRecipient(participant.id)
                              }
                            />
                            <Label
                              htmlFor={participant.id}
                              className="font-normal cursor-pointer flex items-center gap-1"
                            >
                              {participant.name}
                              <span className="text-xs text-muted-foreground">
                                ({participant.role === "mentor" ? "Mentor" : "Student"})
                              </span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Info Note */}
              <div className="flex items-start gap-2 rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 text-sm text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Scheduled reminder emails will be automatically updated based on the
                  new session time.
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isSubmitting || (notificationOption === "select" && selectedRecipients.size === 0)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : recipientCount > 0 ? (
              <>
                <Users className="mr-2 h-4 w-4" />
                Save & Notify ({recipientCount})
              </>
            ) : (
              "Save Changes"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
