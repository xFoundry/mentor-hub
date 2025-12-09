"use client";

import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, CalendarDays, CalendarRange } from "lucide-react";
import type { SeriesScope } from "@/types/recurring";

interface SeriesScopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (scope: SeriesScope) => void;
  mode: "edit" | "delete";
  isLoading?: boolean;
}

const SCOPE_OPTIONS: { value: SeriesScope; label: string; description: string; icon: typeof Calendar }[] = [
  {
    value: "single",
    label: "This session only",
    description: "Only affects this one session",
    icon: Calendar,
  },
  {
    value: "future",
    label: "This and future sessions",
    description: "Affects this session and all sessions after it",
    icon: CalendarDays,
  },
  {
    value: "all",
    label: "All sessions in series",
    description: "Affects all sessions in this recurring series",
    icon: CalendarRange,
  },
];

/**
 * Dialog for selecting scope when editing/deleting recurring sessions
 */
export function SeriesScopeDialog({
  open,
  onOpenChange,
  onConfirm,
  mode,
  isLoading = false,
}: SeriesScopeDialogProps) {
  const [selectedScope, setSelectedScope] = useState<SeriesScope>("single");

  const handleConfirm = () => {
    onConfirm(selectedScope);
  };

  const title = mode === "edit" ? "Edit recurring session" : "Delete recurring session";
  const description =
    mode === "edit"
      ? "This session is part of a recurring series. Which sessions would you like to edit?"
      : "This session is part of a recurring series. Which sessions would you like to delete?";
  const actionText = mode === "edit" ? "Edit" : "Delete";
  const actionVariant = mode === "delete" ? "destructive" : "default";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <RadioGroup
          value={selectedScope}
          onValueChange={(val) => setSelectedScope(val as SeriesScope)}
          className="gap-3 py-4"
        >
          {SCOPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <div key={option.value} className="flex items-start space-x-3">
                <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                <Label
                  htmlFor={option.value}
                  className="flex-1 cursor-pointer space-y-1"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {option.label}
                  </div>
                  <p className="text-sm text-muted-foreground font-normal">
                    {option.description}
                  </p>
                </Label>
              </div>
            );
          })}
        </RadioGroup>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              actionVariant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook to manage series scope dialog state
 */
export function useSeriesScopeDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"edit" | "delete">("edit");
  const [pendingCallback, setPendingCallback] = useState<((scope: SeriesScope) => void) | null>(null);

  const openDialog = (
    dialogMode: "edit" | "delete",
    callback: (scope: SeriesScope) => void
  ) => {
    setMode(dialogMode);
    setPendingCallback(() => callback);
    setIsOpen(true);
  };

  const handleConfirm = (scope: SeriesScope) => {
    if (pendingCallback) {
      pendingCallback(scope);
    }
    setIsOpen(false);
    setPendingCallback(null);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setPendingCallback(null);
  };

  return {
    isOpen,
    mode,
    openDialog,
    handleConfirm,
    handleCancel,
    setIsOpen: (open: boolean) => {
      if (!open) handleCancel();
      else setIsOpen(open);
    },
  };
}
