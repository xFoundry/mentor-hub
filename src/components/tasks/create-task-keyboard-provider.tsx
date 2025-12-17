"use client";

import { useEffect } from "react";
import { useCreateTaskDialog } from "@/contexts/create-task-dialog-context";
import { useUserType } from "@/hooks/use-user-type";
import { hasPermission } from "@/lib/permissions";

interface CreateTaskKeyboardProviderProps {
  children: React.ReactNode;
}

export function CreateTaskKeyboardProvider({
  children,
}: CreateTaskKeyboardProviderProps) {
  const { openDialog, isOpen } = useCreateTaskDialog();
  const { userType } = useUserType();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if dialog is already open
      if (isOpen) return;

      // Don't trigger if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Only for users with create permission
      if (!userType || !hasPermission(userType, "task", "create")) return;

      // Cmd/Ctrl + Shift + T to open task dialog
      if (
        event.key.toLowerCase() === "t" &&
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey
      ) {
        event.preventDefault();
        openDialog();
        return;
      }

      // Alternative: just "c" key when not in an input (like Linear)
      if (event.key.toLowerCase() === "c" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        openDialog();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openDialog, userType, isOpen]);

  return <>{children}</>;
}
