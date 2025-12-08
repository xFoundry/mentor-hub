"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  ExternalLink,
  FileText,
  Users2,
  User,
  Mail,
  Building2,
  CalendarDays,
} from "lucide-react";
import { isPast, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { parseAsLocalTime } from "@/components/sessions/session-transformers";
import { formatAsEastern, TIMEZONE_ABBR } from "@/lib/timezone";
import { BlurredMeetingLink } from "@/components/sessions/blurred-meeting-link";
import type { Session } from "@/types/schema";
import type { UserType } from "@/lib/permissions";

interface SessionOverviewTabProps {
  session: Session;
  userType: UserType;
  onViewNotes?: () => void;
  hasSubmittedPrep?: boolean;
  onPrepare?: () => void;
}

export function SessionOverviewTab({
  session,
  userType,
  onViewNotes,
  hasSubmittedPrep,
  onPrepare,
}: SessionOverviewTabProps) {
  const isMentor = userType === "mentor";
  const isStudent = userType === "student";
  const isLocked = isStudent && !hasSubmittedPrep;
  const mentor = session.mentor?.[0];
  const team = session.team?.[0];
  const teamMembers = team?.members || [];
  const hasNotes = session.summary || session.fullTranscript;

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Hero Card: Who you're meeting with */}
      {isMentor && team ? (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold leading-none tracking-tight">{team.teamName}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {teamMembers.length} team member{teamMembers.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/teams/${team.id}`}>View Team</Link>
              </Button>
            </div>
          </div>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3">
              {teamMembers.slice(0, 8).map((member: any) => {
                const contact = member.contact?.[0];
                if (!contact) return null;
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 rounded-lg border bg-card p-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={contact.headshot?.[0]?.url} alt={contact.fullName} />
                      <AvatarFallback className="text-xs">
                        {getInitials(contact.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <p className="font-medium leading-none">{contact.fullName}</p>
                      {member.type && (
                        <p className="text-xs text-muted-foreground">{member.type}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {teamMembers.length > 8 && (
                <div className="flex items-center justify-center rounded-lg border bg-muted px-3 text-sm text-muted-foreground">
                  +{teamMembers.length - 8} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : mentor ? (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-background shadow-lg">
                <AvatarImage src={mentor.headshot?.[0]?.url} alt={mentor.fullName} />
                <AvatarFallback className="text-lg">{getInitials(mentor.fullName)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {mentor.fullName}
                </h3>
                {mentor.email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    {mentor.email}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Session Details Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Schedule Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {session.scheduledStart && (
              <>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {formatAsEastern(session.scheduledStart, "EEEE, MMMM d, yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isPast(parseAsLocalTime(session.scheduledStart))
                        ? formatDistanceToNow(parseAsLocalTime(session.scheduledStart), { addSuffix: true })
                        : `in ${formatDistanceToNow(parseAsLocalTime(session.scheduledStart))}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {formatAsEastern(session.scheduledStart, "h:mm a")} {TIMEZONE_ABBR}
                    </p>
                    {session.duration && (
                      <p className="text-sm text-muted-foreground">
                        {session.duration} minutes
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Meeting Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="h-4 w-4" />
              Meeting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {session.meetingPlatform && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{session.meetingPlatform}</Badge>
              </div>
            )}

            {session.meetingPlatform === "In-Person" && session.locations?.[0] && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{session.locations[0].name}</p>
                  {session.locations[0].building && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {session.locations[0].building}
                    </p>
                  )}
                  {session.locations[0].address && (
                    <p className="text-sm text-muted-foreground">
                      {session.locations[0].address}
                    </p>
                  )}
                </div>
              </div>
            )}

            <BlurredMeetingLink
              meetingUrl={session.meetingUrl}
              isLocked={isLocked}
              onPrepare={onPrepare}
            />
          </CardContent>
        </Card>
      </div>

      {/* Agenda */}
      {session.agenda && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Agenda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {session.agenda}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Meeting Notes Preview */}
      {hasNotes && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Meeting Notes
              </CardTitle>
              <Button variant="outline" size="sm" onClick={onViewNotes}>
                View Full Notes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              {session.summary && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Summary</Badge>
                  <span>{session.summary.length.toLocaleString()} characters</span>
                </div>
              )}
              {session.fullTranscript && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Transcript</Badge>
                  <span>{session.fullTranscript.length.toLocaleString()} characters</span>
                </div>
              )}
              {session.granolaNotesUrl && (
                <Button variant="ghost" size="sm" asChild className="mt-2">
                  <a href={session.granolaNotesUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-3 w-3" />
                    View in Granola
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
