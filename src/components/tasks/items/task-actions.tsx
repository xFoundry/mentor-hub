"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil, Eye, MessageSquarePlus, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserType } from "@/types/schema";

export interface TaskActionsProps {
  userType: UserType;
  onEditClick?: () => void;
  onPostUpdateClick?: () => void;
  /** Use compact mode (icon-only buttons) */
  compact?: boolean;
  /** Always use dropdown menu instead of inline buttons */
  useDropdown?: boolean;
  className?: string;
}

/**
 * Task action buttons for Edit/View Task and Post Update.
 * - Staff: "Edit" button
 * - Mentor: "View Task" button
 * - Student: "Edit" + "Post Update" buttons
 */
export function TaskActions({
  userType,
  onEditClick,
  onPostUpdateClick,
  compact = false,
  useDropdown = false,
  className,
}: TaskActionsProps) {
  // Determine button labels based on user type
  const editLabel = userType === "mentor" ? "View Task" : "Edit";
  const editIcon = userType === "mentor" ? Eye : Pencil;
  const EditIcon = editIcon;

  // Students can post updates
  const showPostUpdate = userType === "student";

  // Stop propagation to prevent card/row click
  const handleClick = (callback?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    callback?.();
  };

  // Dropdown version for very compact spaces
  if (useDropdown) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", className)}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Task actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={handleClick(onEditClick)}>
            <EditIcon className="h-4 w-4 mr-2" />
            {editLabel}
          </DropdownMenuItem>
          {showPostUpdate && (
            <DropdownMenuItem onClick={handleClick(onPostUpdateClick)}>
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              Post Update
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Inline buttons (responsive)
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size={compact ? "icon" : "sm"}
        className={cn(compact ? "h-7 w-7" : "h-7")}
        onClick={handleClick(onEditClick)}
      >
        <EditIcon className={cn("h-3.5 w-3.5", !compact && "mr-1.5")} />
        {!compact && <span className="hidden sm:inline">{editLabel}</span>}
        {compact && <span className="sr-only">{editLabel}</span>}
      </Button>

      {showPostUpdate && (
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className={cn(compact ? "h-7 w-7" : "h-7")}
          onClick={handleClick(onPostUpdateClick)}
        >
          <MessageSquarePlus className={cn("h-3.5 w-3.5", !compact && "mr-1.5")} />
          {!compact && <span className="hidden sm:inline">Post Update</span>}
          {compact && <span className="sr-only">Post Update</span>}
        </Button>
      )}
    </div>
  );
}
