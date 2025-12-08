"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Loader2, Plus, X, Crown, Users, Eye } from "lucide-react";
import { useUserType } from "@/hooks/use-user-type";
import { useTeams } from "@/hooks/use-teams";
import { useMentors } from "@/hooks/use-mentors";
import { useCohortContext } from "@/contexts/cohort-context";
import { useCreateSession } from "@/hooks/use-create-session";
import { hasPermission } from "@/lib/permissions";
import { LocationSelector } from "@/components/sessions";
import { easternToUTC } from "@/lib/timezone";
import { cn } from "@/lib/utils";

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

export default function NewSessionPage() {
  const router = useRouter();
  const { userType, isLoading: isUserLoading } = useUserType();
  const { selectedCohortId } = useCohortContext();
  const { teams, isLoading: isTeamsLoading } = useTeams(selectedCohortId);
  const { mentors, isLoading: isMentorsLoading } = useMentors(selectedCohortId);
  const { createSession, isCreating } = useCreateSession();

  // Form state - initialize date/time with defaults
  const getDefaultDate = () => {
    const now = new Date();
    return now.toISOString().split("T")[0]; // YYYY-MM-DD
  };

  const getDefaultTime = () => {
    const now = new Date();
    // Round up to next hour
    now.setHours(now.getHours() + 1, 0, 0, 0);
    return now.toTimeString().slice(0, 5); // HH:MM
  };

  const [sessionType, setSessionType] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [selectedMentors, setSelectedMentors] = useState<SelectedMentor[]>([]);
  const [scheduledDate, setScheduledDate] = useState<string>(getDefaultDate);
  const [scheduledTime, setScheduledTime] = useState<string>(getDefaultTime);
  const [duration, setDuration] = useState<string>("60");
  const [meetingPlatform, setMeetingPlatform] = useState<string>("");
  const [meetingUrl, setMeetingUrl] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [agenda, setAgenda] = useState<string>("");

  // Mentor management helpers
  const addMentor = useCallback((contactId: string) => {
    if (selectedMentors.some(m => m.contactId === contactId)) return;

    // First mentor defaults to Lead, others to Supporting
    const role: MentorRole = selectedMentors.length === 0 ? "Lead Mentor" : "Supporting Mentor";
    setSelectedMentors(prev => [...prev, { contactId, role }]);
  }, [selectedMentors]);

  const removeMentor = useCallback((contactId: string) => {
    setSelectedMentors(prev => {
      const filtered = prev.filter(m => m.contactId !== contactId);
      // If we removed the lead and there are still mentors, promote the first one
      const hadLead = prev.find(m => m.contactId === contactId)?.role === "Lead Mentor";
      if (hadLead && filtered.length > 0 && !filtered.some(m => m.role === "Lead Mentor")) {
        filtered[0].role = "Lead Mentor";
      }
      return filtered;
    });
  }, []);

  const updateMentorRole = useCallback((contactId: string, newRole: MentorRole) => {
    setSelectedMentors(prev => {
      // If setting a new Lead, demote the current Lead to Supporting
      if (newRole === "Lead Mentor") {
        return prev.map(m => ({
          ...m,
          role: m.contactId === contactId ? newRole : (m.role === "Lead Mentor" ? "Supporting Mentor" : m.role)
        }));
      }
      return prev.map(m => m.contactId === contactId ? { ...m, role: newRole } : m);
    });
  }, []);

  // Get mentor info by ID
  const getMentorById = useCallback((contactId: string) => {
    return mentors.find((m: any) => m.id === contactId);
  }, [mentors]);

  // Available mentors (not already selected)
  const availableMentors = mentors.filter(
    (m: any) => !selectedMentors.some(sm => sm.contactId === m.id)
  );

  const isLoading = isUserLoading || isTeamsLoading || isMentorsLoading;

  // Check permission
  if (!isLoading && userType && !hasPermission(userType, "session", "create")) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              You do not have permission to create sessions.
            </p>
            <Button asChild className="mt-4">
              <Link href="/sessions">Back to Sessions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // At least one mentor required, and must have a lead
  const hasLeadMentor = selectedMentors.some(m => m.role === "Lead Mentor");
  const isFormValid = sessionType && teamId && selectedMentors.length > 0 && hasLeadMentor && scheduledDate && scheduledTime;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) return;

    // Convert Eastern time input to UTC for storage
    const scheduledStart = easternToUTC(scheduledDate, scheduledTime);

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
    });

    if (result) {
      router.push(`/sessions/${result.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      {/* Back Link */}
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/sessions">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sessions
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create New Session
          </CardTitle>
          <CardDescription>
            Schedule a mentorship session between a mentor and team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Session Type */}
            <div className="space-y-2">
              <Label htmlFor="sessionType">Session Type *</Label>
              <Select value={sessionType} onValueChange={setSessionType}>
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
              <Label htmlFor="team">Team *</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger id="team">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team: any) => (
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
                <Label>Mentors *</Label>
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
                          "flex items-center justify-between gap-2 rounded-lg border p-3",
                          selected.role === "Lead Mentor"
                            ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20"
                            : "bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full",
                            selected.role === "Lead Mentor"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                          )}>
                            <RoleIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{mentor.fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">{mentor.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Select
                            value={selected.role}
                            onValueChange={(value) => updateMentorRole(selected.contactId, value as MentorRole)}
                          >
                            <SelectTrigger className="w-[130px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MENTOR_ROLES.map((role) => {
                                const Icon = role.icon;
                                return (
                                  <SelectItem key={role.value} value={role.value}>
                                    <div className="flex items-center gap-2">
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
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeMentor(selected.contactId)}
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Remove {mentor.fullName}</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Mentor Dropdown */}
              {availableMentors.length > 0 ? (
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value) addMentor(value);
                  }}
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
                    {availableMentors.map((mentor: any) => (
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
                <p className="text-sm text-muted-foreground">All mentors have been added</p>
              ) : (
                <p className="text-sm text-muted-foreground">No mentors available in this cohort</p>
              )}

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
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time (ET) *</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Meeting Platform */}
            <div className="space-y-2">
              <Label htmlFor="platform">Meeting Platform</Label>
              <Select value={meetingPlatform} onValueChange={(value) => {
                setMeetingPlatform(value);
                // Clear location when switching away from In-Person
                if (value !== "In-Person") {
                  setLocationId("");
                }
              }}>
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
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={!isFormValid || isCreating}
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Session
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/sessions">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
