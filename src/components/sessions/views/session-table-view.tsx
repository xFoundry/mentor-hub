"use client";

import { useMemo, useState } from "react";
import {
  TableProvider,
  TableHeader,
  TableHeaderGroup,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/kibo-ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Session, UserType } from "@/types/schema";
import { useSessionPermissions } from "@/hooks/use-session-permissions";
import { createSessionTableColumns } from "../items/session-table-columns";
import { sessionNeedsFeedback, isCurrentUserMentor } from "../session-transformers";
import { DeleteSessionDialog } from "../delete-session-dialog";

export interface SessionTableViewProps {
  sessions: Session[];
  userType: UserType;
  userEmail: string;
  isLoading?: boolean;
  onSessionClick?: (session: Session) => void;
  onFeedbackClick?: (sessionId: string) => void;
  showTeamName?: boolean;
  showMentorName?: boolean;
  showFeedbackStatus?: boolean;
  /** When true, only sessions where userEmail matches the mentor are interactive */
  restrictInteractionToUserSessions?: boolean;
  className?: string;
}

export function SessionTableView({
  sessions,
  userType,
  userEmail,
  isLoading = false,
  onSessionClick,
  onFeedbackClick,
  restrictInteractionToUserSessions = false,
  className,
}: SessionTableViewProps) {
  const { visibleColumns, canAddFeedback } = useSessionPermissions(userType, userEmail);

  // Delete dialog state
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDeleteClick = (session: Session) => {
    setSessionToDelete(session);
    setIsDeleteDialogOpen(true);
  };

  // Create columns based on user permissions
  const columns = useMemo(() => {
    return createSessionTableColumns({
      userType,
      userEmail,
      visibleColumns,
      onSessionClick,
      onFeedbackClick,
      onDeleteClick: userType === "staff" ? handleDeleteClick : undefined,
      canAddFeedback,
      restrictInteractionToUserSessions,
    });
  }, [userType, userEmail, visibleColumns, onSessionClick, onFeedbackClick, canAddFeedback, restrictInteractionToUserSessions]);

  if (isLoading) {
    return <SessionTableViewSkeleton />;
  }

  if (sessions.length === 0) {
    return <SessionTableViewEmpty />;
  }

  return (
    <div className={cn("rounded-md border", className)}>
      <TableProvider columns={columns} data={sessions}>
        <TableHeader>
          {({ headerGroup }) => (
            <TableHeaderGroup key={headerGroup.id} headerGroup={headerGroup}>
              {({ header }) => <TableHead key={header.id} header={header} />}
            </TableHeaderGroup>
          )}
        </TableHeader>
        <TableBody>
          {({ row }) => {
            const session = row.original as Session;
            const isUserSession = !restrictInteractionToUserSessions || isCurrentUserMentor(session, userEmail);
            const needsFeedback = isUserSession && sessionNeedsFeedback(session, userType);
            const isClickable = onSessionClick && isUserSession;

            return (
              <TableRow
                key={row.id}
                row={row}
                className={cn(
                  isClickable && "cursor-pointer hover:bg-muted/50",
                  needsFeedback && "bg-yellow-50/50 dark:bg-yellow-950/20",
                  !isUserSession && "opacity-60"
                )}
                onClick={() => isClickable && onSessionClick?.(session)}
              >
                {({ cell }) => <TableCell key={cell.id} cell={cell} />}
              </TableRow>
            );
          }}
        </TableBody>
      </TableProvider>

      <DeleteSessionDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        session={sessionToDelete}
      />
    </div>
  );
}

function SessionTableViewSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}

function SessionTableViewEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center border rounded-md">
      <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">No sessions to display</p>
    </div>
  );
}
