"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Plus, X, Crown, Users, Eye } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Session, Contact } from "@/types/schema";
import type { SessionChanges } from "@/lib/notifications/types";
import { LocationSelector } from "./location-selector";
import { SessionUpdateConfirmationDialog } from "./session-update-confirmation-dialog";
import { easternToUTC } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { getMentorParticipants } from "./session-transformers";

// Mentor role types
type MentorRole = "Lead Mentor" | "Supporting Mentor" | "Observer";

interface SelectedMentor {
  contactId: string;
  role: MentorRole;
}

const MENTOR_ROLES: { value: MentorRole; label: string; icon: typeof Crown; description: string }[] = [
  { value: "Lead Mentor", label: "Lead", icon: Crown, description: "Primary facilitator" },
  { value: "Supporting Mentor", label: "Supporting", icon: Users, description: "Co-facilitator" },
  { value: "Observer", label: "Observer", icon: Eye, description: "Silent observer" },
];

const SESSION_TYPES = [
  { value: "Team Check-in", label: "Team Check-in" },
  { value: "Office Hours", label: "Office Hours" },
  { value: "1-on-1", label: "1-on-1" },
  { value: "Workshop", label: "Workshop" },
  { value: "Guest Lecture", label: "Guest Lecture" },
  { value: "Judging", label: "Judging" },
];

const SESSION_STATUSES = [
  { value: "Scheduled", label: "Scheduled" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "No-Show", label: "No-Show" },
];

const MEETING_PLATFORMS = [
  { value: "Zoom", label: "Zoom" },
  { value: "Google Meet", label: "Google Meet" },
  { value: "Teams", label: "Microsoft Teams" },
  { value: "In-Person", label: "In-Person" },
  { value: "Cal.com", label: "Cal.com" },
  { value: "Daily.co", label: "Daily.co" },
  { value: "Other", label: "Other" },
];

const DURATION_OPTIONS = [
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "90", label: "90 minutes" },
  { value: "120", label: "2 hours" },
];

interface EditSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  /** Available mentors for selection (from cohort) */
  availableMentors?: Contact[];
  onSave: (updates: {
    sessionType?: string;
    scheduledStart?: string;
    duration?: number;
    status?: string;
    meetingPlatform?: string;
    meetingUrl?: string;
    locationId?: string;
    agenda?: string;
    notificationRecipients?: string[] | null;
    mentors?: SelectedMentor[];
    requirePrep?: boolean;
    requireFeedback?: boolean;
  }) => Promise<void>;
}

// Fields that trigger the notification confirmation dialog
const NOTIFICATION_TRIGGER_FIELDS = ["scheduledStart", "duration", "locationId", "meetingUrl"];

export function EditSessionDialog({
  open,
  onOpenChange,
  session,
  availableMentors = [],
  onSave,
}: EditSessionDialogProps) {
  // Parse scheduledStart (UTC) into date and time for form fields
  // Times from Airtable are proper UTC - browser will display in local timezone
  const parseDateTime = (isoString?: string) => {
    if (!isoString) return { date: "", time: "" };
    try {
      // Parse as UTC - format will display in browser's local timezone (Eastern for our users)
      const parsed = new Date(isoString);
      return {
        date: format(parsed, "yyyy-MM-dd"),
        time: format(parsed, "HH:mm"),
      };
    } catch {
      return { date: "", time: "" };
    }
  };

  const initialDateTime = parseDateTime(session.scheduledStart);

  // Form state
  const [sessionType, setSessionType] = useState(session.sessionType || "");
  const [status, setStatus] = useState(session.status || "Scheduled");
  const [scheduledDate, setScheduledDate] = useState(initialDateTime.date);
  const [scheduledTime, setScheduledTime] = useState(initialDateTime.time);
  const [duration, setDuration] = useState(String(session.duration || 60));
  const [meetingPlatform, setMeetingPlatform] = useState(session.meetingPlatform || "");
  const [meetingUrl, setMeetingUrl] = useState(session.meetingUrl || "");
  const [locationId, setLocationId] = useState(session.locations?.[0]?.id || "");
  const [agenda, setAgenda] = useState(session.agenda || "");
  // Requirement flags - default to true if undefined (backwards compatibility)
  const [requirePrep, setRequirePrep] = useState(session.requirePrep !== false);
  const [requireFeedback, setRequireFeedback] = useState(session.requireFeedback !== false);

  // Initialize selected mentors from session's sessionParticipants
  const getInitialMentors = useCallback((): SelectedMentor[] => {
    const participants = getMentorParticipants(session);
    return participants.map(p => ({
      contactId: p.contact?.id || "",
      role: (p.role as MentorRole) || "Supporting Mentor",
    })).filter(m => m.contactId);
  }, [session]);

  const [selectedMentors, setSelectedMentors] = useState<SelectedMentor[]>(getInitialMentors);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mentor management helpers
  const addMentor = useCallback((contactId: string) => {
    if (selectedMentors.some(m => m.contactId === contactId)) return;
    const role: MentorRole = selectedMentors.length === 0 ? "Lead Mentor" : "Supporting Mentor";
    setSelectedMentors(prev => [...prev, { contactId, role }]);
  }, [selectedMentors]);

  const removeMentor = useCallback((contactId: string) => {
    setSelectedMentors(prev => {
      const filtered = prev.filter(m => m.contactId !== contactId);
      const hadLead = prev.find(m => m.contactId === contactId)?.role === "Lead Mentor";
      if (hadLead && filtered.length > 0 && !filtered.some(m => m.role === "Lead Mentor")) {
        filtered[0].role = "Lead Mentor";
      }
      return filtered;
    });
  }, []);

  const updateMentorRole = useCallback((contactId: string, newRole: MentorRole) => {
    setSelectedMentors(prev => {
      if (newRole === "Lead Mentor") {
        return prev.map(m => ({
          ...m,
          role: m.contactId === contactId ? newRole : (m.role === "Lead Mentor" ? "Supporting Mentor" : m.role)
        }));
      }
      return prev.map(m => m.contactId === contactId ? { ...m, role: newRole } : m);
    });
  }, []);

  // Get mentor info by ID - check both availableMentors and session's current participants
  const getMentorById = useCallback((contactId: string): Contact | undefined => {
    // First check available mentors
    const fromAvailable = availableMentors.find(m => m.id === contactId);
    if (fromAvailable) return fromAvailable;
    // Fall back to session participants (for mentors not in current cohort filter)
    const participants = getMentorParticipants(session);
    return participants.find(p => p.contact?.id === contactId)?.contact;
  }, [availableMentors, session]);

  // Available mentors not already selected
  const selectableMentors = useMemo(() => {
    return availableMentors.filter(m => !selectedMentors.some(sm => sm.contactId === m.id));
  }, [availableMentors, selectedMentors]);

  // Check for lead mentor
  const hasLeadMentor = selectedMentors.some(m => m.role === "Lead Mentor");

  // Confirmation dialog state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, unknown> | null>(null);
  const [pendingChanges, setPendingChanges] = useState<SessionChanges | null>(null);

  // Reset form when session changes or dialog opens
  useEffect(() => {
    if (open) {
      const dateTime = parseDateTime(session.scheduledStart);
      setSessionType(session.sessionType || "");
      setStatus(session.status || "Scheduled");
      setScheduledDate(dateTime.date);
      setScheduledTime(dateTime.time);
      setDuration(String(session.duration || 60));
      setMeetingPlatform(session.meetingPlatform || "");
      setMeetingUrl(session.meetingUrl || "");
      setLocationId(session.locations?.[0]?.id || "");
      setAgenda(session.agenda || "");
      setSelectedMentors(getInitialMentors());
      setRequirePrep(session.requirePrep !== false);
      setRequireFeedback(session.requireFeedback !== false);
      setErrors({});
    }
  }, [open, session, getInitialMentors]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!sessionType) {
      newErrors.sessionType = "Session type is required";
    }
    if (!scheduledDate) {
      newErrors.scheduledDate = "Date is required";
    }
    if (!scheduledTime) {
      newErrors.scheduledTime = "Time is required";
    }
    if (meetingUrl && !isValidUrl(meetingUrl)) {
      newErrors.meetingUrl = "Please enter a valid URL";
    }
    if (selectedMentors.length === 0) {
      newErrors.mentors = "At least one mentor is required";
    } else if (!hasLeadMentor) {
      newErrors.mentors = "Please assign one mentor as Lead Mentor";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  // Helper to check if updates contain notification-triggering changes
  const hasNotificationTriggeringChanges = (updates: Record<string, unknown>): boolean => {
    return NOTIFICATION_TRIGGER_FIELDS.some((field) => field in updates);
  };

  // Build SessionChanges object for the confirmation dialog
  const buildChangesForConfirmation = (updates: Record<string, unknown>): SessionChanges => {
    const changes: SessionChanges = {};
    const originalDateTime = parseDateTime(session.scheduledStart);
    const originalScheduledStart = originalDateTime.date && originalDateTime.time
      ? `${originalDateTime.date}T${originalDateTime.time}:00`
      : "";

    const nextScheduledStart = typeof updates.scheduledStart === "string"
      ? updates.scheduledStart
      : "";
    if (nextScheduledStart && nextScheduledStart !== originalScheduledStart) {
      changes.scheduledStart = {
        old: session.scheduledStart || "",
        new: nextScheduledStart,
      };
    }
    const nextDuration = typeof updates.duration === "number" ? updates.duration : undefined;
    if (nextDuration && nextDuration !== session.duration) {
      changes.duration = {
        old: session.duration || 60,
        new: nextDuration,
      };
    }
    if (updates.locationId !== undefined) {
      const oldLocationId = session.locations?.[0]?.id || "";
      const newLocationId = typeof updates.locationId === "string" ? updates.locationId : "";
      if (oldLocationId !== newLocationId) {
        changes.locationId = { old: oldLocationId, new: newLocationId };
        changes.locationName = {
          old: session.locations?.[0]?.name || "",
          new: "", // Will be resolved by the API
        };
      }
    }
    const nextMeetingUrl = typeof updates.meetingUrl === "string" ? updates.meetingUrl : "";
    if (updates.meetingUrl !== undefined && nextMeetingUrl !== (session.meetingUrl || "")) {
      changes.meetingUrl = {
        old: session.meetingUrl || "",
        new: nextMeetingUrl,
      };
    }

    return changes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const updates: Record<string, unknown> = {};

    // Convert Eastern time input to UTC for storage
    const newScheduledStart = easternToUTC(scheduledDate, scheduledTime);

    // Compare with original - also convert to ISO for consistent comparison
    const originalScheduledStart = session.scheduledStart
      ? new Date(session.scheduledStart).toISOString()
      : "";

    // Only include changed fields
    if (sessionType !== session.sessionType) {
      updates.sessionType = sessionType;
    }
    if (status !== session.status) {
      updates.status = status;
    }
    if (newScheduledStart !== originalScheduledStart) {
      updates.scheduledStart = newScheduledStart;
    }
    if (parseInt(duration) !== session.duration) {
      updates.duration = parseInt(duration);
    }
    if (meetingPlatform !== (session.meetingPlatform || "")) {
      updates.meetingPlatform = meetingPlatform || undefined;
    }
    if (meetingUrl !== (session.meetingUrl || "")) {
      updates.meetingUrl = meetingUrl || undefined;
    }
    // Handle location changes
    const currentLocationId = session.locations?.[0]?.id || "";
    if (meetingPlatform === "In-Person") {
      if (locationId !== currentLocationId) {
        updates.locationId = locationId || undefined;
      }
    } else if (currentLocationId) {
      // Clear location if switching away from In-Person
      updates.locationId = undefined;
    }
    if (agenda !== (session.agenda || "")) {
      updates.agenda = agenda || undefined;
    }

    // Check if mentors changed
    const initialMentors = getInitialMentors();
    const mentorsChanged =
      selectedMentors.length !== initialMentors.length ||
      selectedMentors.some((sm) => {
        const original = initialMentors.find(im => im.contactId === sm.contactId);
        return !original || original.role !== sm.role;
      }) ||
      initialMentors.some((im) => !selectedMentors.find(sm => sm.contactId === im.contactId));

    if (mentorsChanged) {
      updates.mentors = selectedMentors;
    }

    // Check if requirement flags changed
    // For backwards compatibility, undefined means true
    const originalRequirePrep = session.requirePrep !== false;
    const originalRequireFeedback = session.requireFeedback !== false;
    if (requirePrep !== originalRequirePrep) {
      updates.requirePrep = requirePrep;
    }
    if (requireFeedback !== originalRequireFeedback) {
      updates.requireFeedback = requireFeedback;
    }

    // If no changes, just close the dialog
    if (Object.keys(updates).length === 0) {
      onOpenChange(false);
      return;
    }

    // Check if changes trigger the notification confirmation
    if (hasNotificationTriggeringChanges(updates)) {
      // Store updates and show confirmation dialog
      const changes = buildChangesForConfirmation(updates);
      setPendingUpdates(updates);
      setPendingChanges(changes);
      setShowConfirmation(true);
    } else {
      // No notification-triggering changes, save directly
      setIsSubmitting(true);
      try {
        await onSave(updates);
        onOpenChange(false);
      } catch (error) {
        console.error("Error updating session:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Handle confirmation dialog save
  const handleConfirmedSave = async (selectedRecipientIds: string[] | null) => {
    if (!pendingUpdates) return;

    setIsSubmitting(true);
    try {
      await onSave({
        ...pendingUpdates,
        notificationRecipients: selectedRecipientIds,
      });
      setPendingUpdates(null);
      setPendingChanges(null);
      setShowConfirmation(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating session:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {/* Loading Overlay for non-notification-triggering saves */}
        {isSubmitting && !showConfirmation && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div>
                <p className="font-medium">Saving changes...</p>
                <p className="text-sm text-muted-foreground">
                  Please wait
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
          <DialogDescription>
            Update the session details. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Session Type */}
          <div className="space-y-2">
            <Label htmlFor="sessionType">
              Session Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={sessionType}
              onValueChange={setSessionType}
              disabled={isSubmitting}
            >
              <SelectTrigger id="sessionType">
                <SelectValue placeholder="Select session type" />
              </SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.sessionType && (
              <p className="text-sm text-destructive">{errors.sessionType}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as typeof status)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mentors - Multiple Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                Mentors <span className="text-destructive">*</span>
              </Label>
              {selectedMentors.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectedMentors.length} selected
                </span>
              )}
            </div>

            {/* Selected Mentors */}
            {selectedMentors.length > 0 && (
              <div className="space-y-2">
                {selectedMentors.map((selected) => {
                  const mentor = getMentorById(selected.contactId);
                  if (!mentor) return null;

                  const roleConfig = MENTOR_ROLES.find(r => r.value === selected.role);
                  const RoleIcon = roleConfig?.icon || Users;

                  return (
                    <div
                      key={selected.contactId}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg border p-2.5",
                        selected.role === "Lead Mentor"
                          ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20"
                          : "bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0",
                          selected.role === "Lead Mentor"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                            : "bg-muted text-muted-foreground"
                        )}>
                          <RoleIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{mentor.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">{mentor.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Select
                          value={selected.role}
                          onValueChange={(value) => updateMentorRole(selected.contactId, value as MentorRole)}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="w-[110px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MENTOR_ROLES.map((role) => {
                              const Icon = role.icon;
                              return (
                                <SelectItem key={role.value} value={role.value}>
                                  <div className="flex items-center gap-1.5">
                                    <Icon className="h-3 w-3" />
                                    {role.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMentor(selected.contactId)}
                          disabled={isSubmitting}
                        >
                          <X className="h-3.5 w-3.5" />
                          <span className="sr-only">Remove {mentor.fullName}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Mentor Dropdown */}
            {selectableMentors.length > 0 ? (
              <Select
                value=""
                onValueChange={(value) => {
                  if (value) addMentor(value);
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger className={cn(
                  selectedMentors.length === 0 && "border-dashed"
                )}>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Plus className="h-4 w-4" />
                    <span>{selectedMentors.length === 0 ? "Select a mentor" : "Add another mentor"}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {selectableMentors.map((mentor) => (
                    <SelectItem key={mentor.id} value={mentor.id}>
                      <div className="flex flex-col">
                        <span>{mentor.fullName}</span>
                        <span className="text-xs text-muted-foreground">{mentor.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : availableMentors.length > 0 ? (
              <p className="text-sm text-muted-foreground">All available mentors have been added</p>
            ) : (
              <p className="text-sm text-muted-foreground">No mentors available to add</p>
            )}

            {/* Validation error */}
            {errors.mentors && (
              <p className="text-sm text-destructive">{errors.mentors}</p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                disabled={isSubmitting}
              />
              {errors.scheduledDate && (
                <p className="text-sm text-destructive">{errors.scheduledDate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">
                Time (ET) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                disabled={isSubmitting}
              />
              {errors.scheduledTime && (
                <p className="text-sm text-destructive">{errors.scheduledTime}</p>
              )}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Select
              value={duration}
              onValueChange={setDuration}
              disabled={isSubmitting}
            >
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Meeting Platform */}
          <div className="space-y-2">
            <Label htmlFor="platform">Meeting Platform</Label>
            <Select
              value={meetingPlatform || undefined}
              onValueChange={(value) => {
                setMeetingPlatform(value);
                // Clear location when switching away from In-Person
                if (value !== "In-Person") {
                  setLocationId("");
                }
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger id="platform">
                <SelectValue placeholder="Select platform (optional)" />
              </SelectTrigger>
              <SelectContent>
                {MEETING_PLATFORMS.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location (for In-Person meetings) */}
          {meetingPlatform === "In-Person" && (
            <div className="space-y-2">
              <Label>Location</Label>
              <LocationSelector
                value={locationId}
                onValueChange={setLocationId}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Meeting URL */}
          <div className="space-y-2">
            <Label htmlFor="meetingUrl">Meeting URL</Label>
            <Input
              id="meetingUrl"
              type="url"
              placeholder="https://..."
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              disabled={isSubmitting}
            />
            {errors.meetingUrl && (
              <p className="text-sm text-destructive">{errors.meetingUrl}</p>
            )}
          </div>

          {/* Agenda */}
          <div className="space-y-2">
            <Label htmlFor="agenda">Agenda</Label>
            <Textarea
              id="agenda"
              placeholder="Session agenda and topics to cover..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Requirements Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Requirements</Label>
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="requirePrep"
                  checked={requirePrep}
                  onCheckedChange={(checked) => setRequirePrep(checked === true)}
                  disabled={isSubmitting}
                />
                <div className="grid gap-0.5 leading-none">
                  <label
                    htmlFor="requirePrep"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Require meeting preparation
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Students will receive prep reminders and prompts to submit before the meeting
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="requireFeedback"
                  checked={requireFeedback}
                  onCheckedChange={(checked) => setRequireFeedback(checked === true)}
                  disabled={isSubmitting}
                />
                <div className="grid gap-0.5 leading-none">
                  <label
                    htmlFor="requireFeedback"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Require post-session feedback
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Participants will receive feedback reminders after the session
                  </p>
                </div>
              </div>
            </div>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Confirmation dialog for notification-triggering changes */}
      <SessionUpdateConfirmationDialog
        open={showConfirmation}
        onOpenChange={(open) => {
          setShowConfirmation(open);
          if (!open) {
            setPendingUpdates(null);
            setPendingChanges(null);
          }
        }}
        session={session}
        changes={pendingChanges || {}}
        onConfirm={handleConfirmedSave}
        isSubmitting={isSubmitting}
      />
    </Dialog>
  );
}
