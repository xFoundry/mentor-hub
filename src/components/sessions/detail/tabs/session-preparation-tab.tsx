"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  MessageSquare,
  Link as LinkIcon,
  AlertCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Session, PreMeetingSubmission, Task } from "@/types/schema";
import type { UserType } from "@/lib/permissions";
import type { SessionPhase } from "@/hooks/use-session-phase";

interface SessionPreparationTabProps {
  session: Session;
  userType: UserType;
  phase: SessionPhase;
  tasks: Task[];
  userContactId?: string;
  /** Auto-expand all submissions (for mentors when session is starting soon) */
  autoExpand?: boolean;
  /** Has user submitted their prep? */
  hasUserSubmitted?: boolean;
  /** Callback to open pre-meeting wizard */
  onOpenPrepWizard?: () => void;
}

export function SessionPreparationTab({
  session,
  userType,
  phase,
  tasks,
  userContactId,
  autoExpand = false,
  hasUserSubmitted = false,
  onOpenPrepWizard,
}: SessionPreparationTabProps) {
  const isStudent = userType === "student";
  const isMentor = userType === "mentor";
  const submissions = session.preMeetingSubmissions || [];

  // Team has one submission per session - get the latest one
  const teamSubmission = submissions[0] || null;
  const hasTeamSubmitted = teamSubmission !== null;

  // Get open tasks for this session
  const openTasks = useMemo(() => {
    return tasks.filter(t => t.status !== "Completed" && t.status !== "Cancelled");
  }, [tasks]);

  const canSubmitPrep = isStudent &&
    (phase === "upcoming" || phase === "starting-soon") &&
    !hasTeamSubmitted;

  const canEditPrep = isStudent &&
    (phase === "upcoming" || phase === "starting-soon") &&
    hasTeamSubmitted;

  return (
    <div className="space-y-6">
      {/* Student: Prompt to submit prep */}
      {isStudent && canSubmitPrep && (
        <Alert className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">
            Prepare for your meeting
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            <p>
              Share your agenda, questions, and topics to make the most of your session.
              Your mentor will review these before the meeting.
            </p>
            <Button
              onClick={onOpenPrepWizard}
              className="mt-3"
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Start Preparation
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Student: Team already submitted - can edit */}
      {canEditPrep && (
        <Alert className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">
            Team preparation is submitted
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            <p>
              Your mentor can see your team's agenda and questions. You can update this before the meeting.
            </p>
            <Button
              variant="outline"
              onClick={onOpenPrepWizard}
              className="mt-3"
            >
              Edit Submission
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Mentor/Staff: Submission status */}
      {(isMentor || userType === "staff") && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Team Preparation
              </CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  hasTeamSubmitted
                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800"
                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                )}
              >
                {hasTeamSubmitted ? "Submitted" : "Not submitted"}
              </Badge>
            </div>
            <CardDescription>
              {hasTeamSubmitted
                ? "Review what the team wants to discuss in this session"
                : "The team hasn't submitted their preparation yet"}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Mentor: Alert when meeting is starting soon */}
      {isMentor && phase === "starting-soon" && hasTeamSubmitted && (
        <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">
            Meeting starting soon
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Review the team's submissions below to prepare for your discussion.
          </AlertDescription>
        </Alert>
      )}

      {/* Team Submission */}
      {hasTeamSubmitted ? (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Team Submission
          </h3>
          <PreparationSubmissionCard
            submission={teamSubmission}
            defaultExpanded={autoExpand}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="font-medium">No preparation submitted</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isStudent
                ? "Share your team's agenda and questions for this session"
                : "The team hasn't submitted their preparation yet"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Related Tasks Section */}
      {openTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" />
              Open Tasks to Discuss
            </CardTitle>
            <CardDescription>
              Review these tasks before the session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {openTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{task.name}</p>
                    {task.dueDate && (
                      <p className="text-xs text-muted-foreground">
                        Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {task.status}
                  </Badge>
                </div>
              ))}
              {openTasks.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{openTasks.length - 5} more tasks
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Individual submission card with expandable sections
 */
function PreparationSubmissionCard({
  submission,
  defaultExpanded = false,
}: {
  submission: PreMeetingSubmission;
  defaultExpanded?: boolean;
}) {
  const respondent = submission.respondant?.[0];
  const submittedDate = submission.submitted
    ? format(new Date(submission.submitted), "MMM d, yyyy 'at' h:mm a")
    : null;

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const sections = [
    { key: "agenda", icon: FileText, label: "Agenda Items", content: submission.agendaItems },
    { key: "questions", icon: HelpCircle, label: "Questions", content: submission.questions },
    { key: "topics", icon: MessageSquare, label: "Topics to Discuss", content: submission.topicsToDiscuss },
    { key: "materials", icon: LinkIcon, label: "Materials & Links", content: submission.materialsLinks },
  ].filter(s => s.content);

  if (sections.length === 0) return null;

  // Default value for accordion - all sections if defaultExpanded
  const defaultValue = defaultExpanded
    ? sections.map(s => s.key)
    : [sections[0]?.key].filter(Boolean);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={respondent?.headshot?.[0]?.url}
                alt={respondent?.fullName || "User"}
              />
              <AvatarFallback>{getInitials(respondent?.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-sm font-medium">
                {respondent?.fullName || "Unknown User"}
              </CardTitle>
              {submittedDate && (
                <CardDescription className="flex items-center gap-1 text-xs mt-0.5">
                  <Clock className="h-3 w-3" />
                  {submittedDate}
                </CardDescription>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {sections.length} item{sections.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion
          type="multiple"
          defaultValue={defaultValue}
          className="w-full"
        >
          {sections.map(({ key, icon: Icon, label, content }) => (
            <AccordionItem key={key} value={key} className="border-b-0">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {label}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-6 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {content}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
