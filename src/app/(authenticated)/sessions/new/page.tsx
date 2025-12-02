"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { useUserType } from "@/hooks/use-user-type";
import { useTeams } from "@/hooks/use-teams";
import { useMentors } from "@/hooks/use-mentors";
import { useCohortContext } from "@/contexts/cohort-context";
import { useCreateSession } from "@/hooks/use-create-session";
import { hasPermission } from "@/lib/permissions";

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

  // Form state
  const [sessionType, setSessionType] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [mentorId, setMentorId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [duration, setDuration] = useState<string>("60");
  const [meetingPlatform, setMeetingPlatform] = useState<string>("");
  const [meetingUrl, setMeetingUrl] = useState<string>("");
  const [agenda, setAgenda] = useState<string>("");

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

  const isFormValid = sessionType && teamId && mentorId && scheduledDate && scheduledTime;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) return;

    // Combine date and time
    const scheduledStart = `${scheduledDate}T${scheduledTime}:00`;

    const result = await createSession({
      sessionType,
      teamId,
      mentorId,
      scheduledStart,
      duration: parseInt(duration) || 60,
      meetingPlatform: meetingPlatform || undefined,
      meetingUrl: meetingUrl || undefined,
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

            {/* Mentor */}
            <div className="space-y-2">
              <Label htmlFor="mentor">Mentor *</Label>
              <Select value={mentorId} onValueChange={setMentorId}>
                <SelectTrigger id="mentor">
                  <SelectValue placeholder="Select mentor" />
                </SelectTrigger>
                <SelectContent>
                  {mentors.map((mentor: any) => (
                    <SelectItem key={mentor.id} value={mentor.id}>
                      {mentor.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Label htmlFor="time">Time *</Label>
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
              <Select value={meetingPlatform} onValueChange={setMeetingPlatform}>
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
