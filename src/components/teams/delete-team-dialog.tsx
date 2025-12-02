"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamName: string;
  memberCount: number;
  sessionCount: number;
  taskCount: number;
  onConfirm: () => Promise<void>;
}

export function DeleteTeamDialog({
  open,
  onOpenChange,
  teamName,
  memberCount,
  sessionCount,
  taskCount,
  onConfirm,
}: DeleteTeamDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isConfirmValid = confirmText === teamName;

  const handleConfirm = async () => {
    if (!isConfirmValid) return;

    setIsSubmitting(true);

    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting team:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmText("");
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Team
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You are about to delete <strong>{teamName}</strong>. This action
                will archive the team and cannot be easily undone.
              </p>

              {(memberCount > 0 || sessionCount > 0 || taskCount > 0) && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 space-y-2">
                  <p className="font-medium text-destructive text-sm">
                    This team has associated data:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {memberCount > 0 && (
                      <li>
                        - {memberCount} member{memberCount !== 1 ? "s" : ""}
                      </li>
                    )}
                    {sessionCount > 0 && (
                      <li>
                        - {sessionCount} session{sessionCount !== 1 ? "s" : ""}
                      </li>
                    )}
                    {taskCount > 0 && (
                      <li>
                        - {taskCount} task{taskCount !== 1 ? "s" : ""}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="confirmText">
                  Type <strong>{teamName}</strong> to confirm deletion:
                </Label>
                <Input
                  id="confirmText"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Enter team name"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={!isConfirmValid || isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Team"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
