"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  MoreHorizontal,
  Pencil,
  FileText,
  Trash2,
  Link2,
  Check,
  MessageSquare,
  ClipboardList,
  Video,
  ExternalLink,
  Calendar,
  Clock,
  Users2,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SessionPhaseIndicator } from "./session-phase-indicator";
import { SeriesIndicator } from "../series-indicator";
import { EditorViewer } from "@/components/editor/editor-viewer";
import { formatAsEastern, TIMEZONE_ABBR } from "@/lib/timezone";
import type { Session } from "@/types/schema";
import type { SessionPhase } from "@/hooks/use-session-phase";
import type { UserType } from "@/lib/permissions";
import { isSessionPrepRequired, isSessionFeedbackRequired } from "@/components/sessions/session-transformers";

interface SessionDetailHeaderProps {
  session: Session;
  phase: SessionPhase;
  userType: UserType;
  minutesUntilStart: number | null;
  timeUntilStart: string | null;
  needsFeedback: boolean;
  canSubmitPrep: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  hasNotes: boolean;
  hasSubmittedPrep?: boolean;
  // Callbacks
  onEdit?: () => void;
  onDelete?: () => void;
  onAddNotes?: () => void;
  onViewNotes?: () => void;
  onAddFeedback?: () => void;
  onPrepare?: () => void;
  onEditAgenda?: () => void;
}

export function SessionDetailHeader({
  session,
  phase,
  userType,
  minutesUntilStart,
  timeUntilStart,
  needsFeedback,
  canSubmitPrep,
  canUpdate,
  canDelete,
  hasNotes,
  hasSubmittedPrep,
  onEdit,
  onDelete,
  onAddNotes,
  onViewNotes,
  onAddFeedback,
  onPrepare,
  onEditAgenda,
}: SessionDetailHeaderProps) {
  const router = useRouter();
  const [isCopied, setIsCopied] = useState(false);
  const [isAgendaExpanded, setIsAgendaExpanded] = useState(false);

  // Staff and mentors can edit the agenda
  const canEditAgenda = (userType === "staff" || userType === "mentor") && onEditAgenda;

  // Meeting link is locked for students who haven't submitted prep (only when prep is required)
  const isMeetingLocked = userType === "student" && !hasSubmittedPrep && isSessionPrepRequired(session);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/sessions/${session.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      toast.success("Session link copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleJoinMeeting = () => {
    if (session.meetingUrl) {
      window.open(session.meetingUrl, "_blank", "noopener,noreferrer");
    }
  };

  const team = session.team?.[0];
  const isLive = phase === "during";
  const isStartingSoon = phase === "starting-soon";

  return (
    <div className="space-y-4">
      {/* Top row: Back + Actions */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {/* Copy link */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleCopyLink}>
                  {isCopied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy session link</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Primary action based on phase */}
          {isLive && session.meetingUrl && !isMeetingLocked && (
            <Button onClick={handleJoinMeeting} className="gap-2 bg-green-600 hover:bg-green-700">
              <Video className="h-4 w-4" />
              Join Meeting
            </Button>
          )}
          {isLive && session.meetingUrl && isMeetingLocked && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onPrepare} variant="outline" className="gap-2">
                    <Lock className="h-4 w-4" />
                    Submit Prep to Join
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Meeting link is locked until you submit your prep</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {isStartingSoon && canSubmitPrep && (
            <Button onClick={onPrepare} className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Prepare Now
            </Button>
          )}

          {needsFeedback && phase === "completed" && (
            <Button onClick={onAddFeedback} className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Add Feedback
            </Button>
          )}

          {/* Secondary actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canUpdate && (
                <DropdownMenuItem onClick={onEdit} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit Session
                </DropdownMenuItem>
              )}

              {userType === "staff" && (
                <DropdownMenuItem onClick={hasNotes ? onViewNotes : onAddNotes} className="gap-2">
                  <FileText className="h-4 w-4" />
                  {hasNotes ? "Edit Meeting Notes" : "Add Meeting Notes"}
                </DropdownMenuItem>
              )}

              {hasNotes && userType !== "staff" && (
                <DropdownMenuItem onClick={onViewNotes} className="gap-2">
                  <FileText className="h-4 w-4" />
                  View Meeting Notes
                </DropdownMenuItem>
              )}

              {session.meetingUrl && !isLive && !isMeetingLocked && (
                <DropdownMenuItem onClick={handleJoinMeeting} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open Meeting Link
                </DropdownMenuItem>
              )}
              {session.meetingUrl && !isLive && isMeetingLocked && (
                <DropdownMenuItem onClick={onPrepare} className="gap-2">
                  <Lock className="h-4 w-4" />
                  Submit Prep to Unlock
                </DropdownMenuItem>
              )}

              {canSubmitPrep && !isStartingSoon && (
                <DropdownMenuItem onClick={onPrepare} className="gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Submit Pre-Meeting Prep
                </DropdownMenuItem>
              )}

              {needsFeedback && phase !== "completed" && (
                <DropdownMenuItem onClick={onAddFeedback} className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Add Feedback
                </DropdownMenuItem>
              )}

              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Session
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Session title and meta */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          {/* Title row with badges */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {session.sessionType || "Session"}
            </h1>
            <SessionPhaseIndicator
              phase={phase}
              timeUntilStart={timeUntilStart}
              minutesUntilStart={minutesUntilStart}
              isStartingSoon={phase === "starting-soon"}
              size="md"
            />
            <SeriesIndicator session={session} size="md" />
            {needsFeedback && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                Needs Feedback
              </Badge>
            )}
            {/* Staff badges for optional prep/feedback */}
            {userType === "staff" && !isSessionPrepRequired(session) && (
              <Badge variant="outline" className="text-slate-500 border-slate-300 dark:text-slate-400 dark:border-slate-600">
                Prep Optional
              </Badge>
            )}
            {userType === "staff" && !isSessionFeedbackRequired(session) && (
              <Badge variant="outline" className="text-slate-500 border-slate-300 dark:text-slate-400 dark:border-slate-600">
                Feedback Optional
              </Badge>
            )}
          </div>

          {/* Quick meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {session.scheduledStart && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{formatAsEastern(session.scheduledStart, "EEE, MMM d, yyyy")}</span>
              </div>
            )}
            {session.scheduledStart && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>
                  {formatAsEastern(session.scheduledStart, "h:mm a")} {TIMEZONE_ABBR}
                  {session.duration && ` · ${session.duration} min`}
                </span>
              </div>
            )}
            {team && (
              <div className="flex items-center gap-1.5">
                <Users2 className="h-4 w-4" />
                <span>{team.teamName}</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Agenda Section */}
      {session.agenda && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Agenda</span>
                {canEditAgenda && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={onEditAgenda}
                  >
                    <Pencil className="h-3 w-3" />
                    <span className="sr-only">Edit agenda</span>
                  </Button>
                )}
              </div>
              <div
                className={cn(
                  "text-sm text-muted-foreground overflow-hidden transition-all",
                  !isAgendaExpanded && "max-h-[4.5rem]"
                )}
              >
                <EditorViewer content={session.agenda} />
              </div>
              {session.agenda.length > 150 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setIsAgendaExpanded(!isAgendaExpanded)}
                >
                  {isAgendaExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show more
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty agenda state for staff/mentor who can add it */}
      {!session.agenda && canEditAgenda && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={onEditAgenda}
        >
          <FileText className="h-4 w-4" />
          Add Agenda
        </Button>
      )}
    </div>
  );
}
