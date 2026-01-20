"use client";

import { useState, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Loader2, Plus, X, Crown, Users, Eye, UserPlus } from "lucide-react";
import { useTeams } from "@/hooks/use-teams";
import { useMentors, type MentorWithCohort } from "@/hooks/use-mentors";
import { useCohortContext } from "@/contexts/cohort-context";
import { useCreateSession } from "@/hooks/use-create-session";
import { useCreateRecurringSession } from "@/hooks/use-create-recurring-session";
import { LocationSelector } from "./location-selector";
import { RecurrenceToggle, RecurrenceConfigComponent } from "./recurrence-config";
import { AddMentorDialog } from "@/components/mentors";
import { easternToUTC } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import type { RecurrenceConfig } from "@/types/recurring";
import type { Session, Contact, Team } from "@/types/schema";

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

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Callback when session is created successfully */
  onSuccess?: (session: Session) => void;
  /** Pre-selected team ID */
  defaultTeamId?: string;
}

export function CreateSessionDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultTeamId,
}: CreateSessionDialogProps) {
  const { selectedCohortId } = useCohortContext();
  const { teams, isLoading: isTeamsLoading } = useTeams(selectedCohortId);
  const { mentors, isLoading: isMentorsLoading, mutate: mutateMentors } = useMentors(selectedCohortId);
  const { createSession, isCreating } = useCreateSession();
  const { createRecurringSessions, isCreating: isCreatingRecurring } = useCreateRecurringSession();

  // Add mentor dialog state
  const [showAddMentorDialog, setShowAddMentorDialog] = useState(false);

  // Form state helpers
  const getDefaultDate = () => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  };

  const getDefaultTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    return now.toTimeString().slice(0, 5);
  };

  // Form state
  const [sessionType, setSessionType] = useState<string>("");
  const [teamId, setTeamId] = useState<string>(defaultTeamId || "");
  const [selectedMentors, setSelectedMentors] = useState<SelectedMentor[]>([]);
  const [scheduledDate, setScheduledDate] = useState<string>(getDefaultDate);
  const [scheduledTime, setScheduledTime] = useState<string>(getDefaultTime);
  const [duration, setDuration] = useState<string>("60");
  const [meetingPlatform, setMeetingPlatform] = useState<string>("");
  const [meetingUrl, setMeetingUrl] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [agenda, setAgenda] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfig | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Requirement flags (staff-only settings)
  const [requirePrep, setRequirePrep] = useState(true);
  const [requireFeedback, setRequireFeedback] = useState(true);

  const isSubmitting = isCreating || isCreatingRecurring;
  const isLoading = isTeamsLoading || isMentorsLoading;

  const resetForm = useCallback(() => {
    setSessionType("");
    setTeamId(defaultTeamId || "");
    setSelectedMentors([]);
    setScheduledDate(getDefaultDate());
    setScheduledTime(getDefaultTime());
    setDuration("60");
    setMeetingPlatform("");
    setMeetingUrl("");
    setLocationId("");
    setAgenda("");
    setIsRecurring(false);
    setRecurrenceConfig(null);
    setErrors({});
    setRequirePrep(true);
    setRequireFeedback(true);
  }, [defaultTeamId]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }, [onOpenChange, resetForm]);

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

  const getMentorById = useCallback((contactId: string) => {
    return mentors.find((m: MentorWithCohort) => m.id === contactId);
  }, [mentors]);

  // Available mentors (not already selected)
  const availableMentors = mentors.filter(
    (m: MentorWithCohort) => !selectedMentors.some(sm => sm.contactId === m.id)
  );

  // Validation
  const hasLeadMentor = selectedMentors.some(m => m.role === "Lead Mentor");
  const isRecurrenceValid = !isRecurring || (recurrenceConfig && (recurrenceConfig.occurrences || recurrenceConfig.endDate));
  const isFormValid = sessionType && teamId && selectedMentors.length > 0 && hasLeadMentor && scheduledDate && scheduledTime && isRecurrenceValid;

  // Handle newly added mentor
  const handleMentorAdded = useCallback((contact: Contact) => {
    // Refresh mentors list
    mutateMentors();
    // Add the new mentor to selection
    addMentor(contact.id);
  }, [mutateMentors, addMentor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) return;

    const scheduledStart = easternToUTC(scheduledDate, scheduledTime);

    if (isRecurring && recurrenceConfig) {
      const result = await createRecurringSessions({
        sessionConfig: {
          sessionType,
          teamId,
          mentors: selectedMentors,
          duration: parseInt(duration) || 60,
          meetingPlatform: meetingPlatform || undefined,
          meetingUrl: meetingUrl || undefined,
          locationId: meetingPlatform === "In-Person" && locationId ? locationId : undefined,
          agenda: agenda || undefined,
          cohortId: selectedCohortId !== "all" ? selectedCohortId : undefined,
          requirePrep,
          requireFeedback,
        },
        recurrence: recurrenceConfig,
        scheduledStart,
      });

      if (result && result.sessions.length > 0) {
        onSuccess?.(result.sessions[0]);
        onOpenChange(false);
      }
    } else {
      const result = await createSession({
        sessionType,
        teamId,
        mentors: selectedMentors,
        scheduledStart,
        duration: parseInt(duration) || 60,
        meetingPlatform: meetingPlatform || undefined,
        meetingUrl: meetingUrl || undefined,
        locationId: meetingPlatform === "In-Person" && locationId ? locationId : undefined,
        agenda: agenda || undefined,
        status: "Scheduled",
        cohortId: selectedCohortId !== "all" ? selectedCohortId : undefined,
        requirePrep,
        requireFeedback,
      });

      if (result) {
        onSuccess?.(result);
        onOpenChange(false);
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={isSubmitting ? undefined : handleOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {/* Loading Overlay */}
          {isSubmitting && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div>
                  <p className="font-medium">
                    {isRecurring ? "Creating recurring sessions..." : "Creating session..."}
                  </p>
                  <p className="text-sm text-muted-foreground">Please wait</p>
                </div>
              </div>
            </div>
          )}

          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Create New Session
            </DialogTitle>
            <DialogDescription>
              Schedule a mentorship session between a mentor and team.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {/* Session Type */}
              <div className="space-y-2">
                <Label htmlFor="sessionType">
                  Session Type <span className="text-destructive">*</span>
                </Label>
                <Select value={sessionType} onValueChange={setSessionType} disabled={isSubmitting}>
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
              </div>

              {/* Team */}
              <div className="space-y-2">
                <Label htmlFor="team">
                  Team <span className="text-destructive">*</span>
                </Label>
                <Select value={teamId} onValueChange={setTeamId} disabled={isSubmitting}>
                  <SelectTrigger id="team">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team: Team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.teamName}
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

                {/* Add Mentor Dropdown + Quick Add Button */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    {availableMentors.length > 0 ? (
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
                          {availableMentors.map((mentor: MentorWithCohort) => (
                            <SelectItem key={mentor.id} value={mentor.id}>
                              <div className="flex flex-col">
                                <span>{mentor.fullName}</span>
                                <span className="text-xs text-muted-foreground">{mentor.email}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : mentors.length > 0 ? (
                      <p className="text-sm text-muted-foreground py-2">All mentors have been added</p>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">No mentors available in this cohort</p>
                    )}
                  </div>

                  {/* Quick Add Mentor Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowAddMentorDialog(true)}
                    disabled={isSubmitting}
                    title="Add new mentor to cohort"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Validation hint */}
                {selectedMentors.length > 0 && !hasLeadMentor && (
                  <p className="text-sm text-destructive">
                    Please assign one mentor as Lead Mentor
                  </p>
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
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select value={duration} onValueChange={setDuration} disabled={isSubmitting}>
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
                  {isRecurring && (
                    <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                      These settings will apply to all sessions in this series.
                    </p>
                  )}
                </div>
              </div>

              {/* Recurring Session */}
              <div className="space-y-4">
                <RecurrenceToggle
                  enabled={isRecurring}
                  onToggle={(enabled) => {
                    setIsRecurring(enabled);
                    if (enabled && !recurrenceConfig) {
                      setRecurrenceConfig({ frequency: "weekly", occurrences: 12 });
                    }
                  }}
                />

                {isRecurring && (
                  <div className="pl-4 border-l-2 border-primary/20">
                    <RecurrenceConfigComponent
                      value={recurrenceConfig}
                      onChange={setRecurrenceConfig}
                      startDate={scheduledDate}
                      startTime={scheduledTime}
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!isFormValid || isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-4 w-4" />
                      {isRecurring ? "Create Recurring Sessions" : "Create Session"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Nested Add Mentor Dialog */}
      <AddMentorDialog
        open={showAddMentorDialog}
        onOpenChange={setShowAddMentorDialog}
        defaultCohortId={selectedCohortId !== "all" ? selectedCohortId : undefined}
        onSuccess={handleMentorAdded}
      />
    </>
  );
}
