"use client";

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
import { useDeleteSession } from "@/hooks/use-delete-session";
import type { Session } from "@/types/schema";
import { format } from "date-fns";
import { parseAsLocalTime } from "./session-transformers";

interface DeleteSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session | null;
  onDeleted?: () => void;
}

export function DeleteSessionDialog({
  open,
  onOpenChange,
  session,
  onDeleted,
}: DeleteSessionDialogProps) {
  const { deleteSession, isDeleting } = useDeleteSession();

  if (!session) return null;

  const sessionDate = session.scheduledStart
    ? format(parseAsLocalTime(session.scheduledStart), "MMM d, yyyy 'at' h:mm a")
    : "Unscheduled";

  const teamName = session.team?.[0]?.teamName || "Unknown team";
  const mentorName = session.mentor?.[0]?.fullName || "Unknown mentor";

  const handleDelete = async () => {
    const success = await deleteSession(session.id);
    if (success) {
      onOpenChange(false);
      onDeleted?.();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Session</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to delete this session? This action cannot be undone.
              </p>
              <div className="rounded-md border bg-muted/50 p-3 space-y-1 text-sm">
                <p><span className="font-medium">Type:</span> {session.sessionType || "Session"}</p>
                <p><span className="font-medium">Team:</span> {teamName}</p>
                <p><span className="font-medium">Mentor:</span> {mentorName}</p>
                <p><span className="font-medium">Date:</span> {sessionDate}</p>
                {session.status && (
                  <p><span className="font-medium">Status:</span> {session.status}</p>
                )}
              </div>
              <p className="text-destructive font-medium">
                All associated feedback and action items linked only to this session may be affected.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete Session"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
