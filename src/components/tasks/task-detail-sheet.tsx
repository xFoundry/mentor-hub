"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Save,
  Trash2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Plus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar as CalendarIcon,
} from "lucide-react";
import { PrioritySelector, type Priority } from "./create-task-dialog/priority-selector";
import { StatusSelector, type TaskStatus as StatusType } from "./create-task-dialog/status-selector";
import { EffortSelector, type LevelOfEffort } from "./create-task-dialog/effort-selector";
import { DueDatePicker } from "./create-task-dialog/due-date-picker";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Task, Update, UserType, Contact } from "@/types/schema";
import {
  useTaskPermissions,
  getEditableFields,
  type TaskField,
} from "@/hooks/use-task-permissions";
import { useTeamMembers, type TeamMember } from "@/hooks/use-team-members";
import { PRIORITY_CONFIG } from "./task-transformers";

// Health status configuration
const HEALTH_CONFIG = {
  "On Track": { icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
  "At Risk": { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  "Off Track": { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
  "Completed": { icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10" },
} as const;

type HealthStatus = keyof typeof HEALTH_CONFIG;

export interface TaskDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  userType: UserType;
  userEmail: string;
  userContactId: string;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onCreateUpdate: (input: {
    taskId: string;
    authorId: string;
    health: string;
    message: string;
  }) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  /** Optional: Team ID for fetching team members. Falls back to task.team[0].id */
  teamId?: string;
  /** Optional: Pre-loaded team members. If provided, skips the useTeamMembers fetch */
  teamMembers?: TeamMember[];
}

export function TaskDetailSheet({
  open,
  onOpenChange,
  task,
  userType,
  userEmail,
  userContactId,
  onTaskUpdate,
  onCreateUpdate,
  onTaskDelete,
  teamId: propTeamId,
  teamMembers: propTeamMembers,
}: TaskDetailSheetProps) {
  // Permission hooks
  const { canEditTask, canEditField, canDelete } = useTaskPermissions(userType, userEmail);

  // Get team members for assignee selection
  // Use provided teamId/teamMembers if available, otherwise derive from task
  const effectiveTeamId = propTeamId ?? task?.team?.[0]?.id;
  const { members: fetchedMembers, isLoading: isLoadingMembers } = useTeamMembers(
    propTeamMembers ? undefined : effectiveTeamId  // Skip fetch if members provided via props
  );
  const teamMembers = propTeamMembers ?? fetchedMembers;

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("Not Started");
  const [priority, setPriority] = useState<string>("Medium");
  const [levelOfEffort, setLevelOfEffort] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);

  // Progress update state
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [updateHealth, setUpdateHealth] = useState<HealthStatus>("On Track");
  const [updateMessage, setUpdateMessage] = useState("");
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);
  const [showAllUpdates, setShowAllUpdates] = useState(false);

  // Sync form state when task changes
  useEffect(() => {
    if (task && open) {
      setName(task.name || "");
      setDescription(task.description || "");
      setStatus(task.status || "Not Started");
      setPriority(task.priority || "Medium");
      setLevelOfEffort(task.levelOfEffort || "");
      setDueDate(task.due ? parseISO(task.due) : undefined);
      setSelectedAssigneeId(task.assignedTo?.[0]?.id || "");
      // Reset UI state
      setShowAddUpdate(false);
      setUpdateHealth("On Track");
      setUpdateMessage("");
      setShowAllUpdates(false);
    }
  }, [task, open]);

  // Computed permissions
  const isEditable = useMemo(() => {
    return task ? canEditTask(task) : false;
  }, [task, canEditTask]);

  const editableFields = useMemo(() => {
    if (!task) return [];
    return getEditableFields(userType, task, userEmail);
  }, [userType, task, userEmail]);

  const canEditFieldForTask = useCallback((field: TaskField): boolean => {
    return isEditable && editableFields.includes(field);
  }, [isEditable, editableFields]);

  // Check for changes
  const hasChanges = useMemo(() => {
    if (!task) return false;
    const taskDueDate = task.due ? parseISO(task.due) : undefined;
    const dueDateChanged = dueDate?.toISOString()?.split("T")[0] !== taskDueDate?.toISOString()?.split("T")[0];
    const assigneeChanged = selectedAssigneeId !== (task.assignedTo?.[0]?.id || "");

    return (
      name !== (task.name || "") ||
      description !== (task.description || "") ||
      status !== (task.status || "Not Started") ||
      priority !== (task.priority || "Medium") ||
      levelOfEffort !== (task.levelOfEffort || "") ||
      dueDateChanged ||
      assigneeChanged
    );
  }, [task, name, description, status, priority, levelOfEffort, dueDate, selectedAssigneeId]);

  // Handle close with unsaved changes check
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen && hasChanges) {
      setPendingClose(true);
      setShowUnsavedDialog(true);
    } else {
      onOpenChange(newOpen);
    }
  }, [hasChanges, onOpenChange]);

  // Handle save
  const handleSave = async () => {
    if (!task || !isEditable) return;

    setIsSubmitting(true);
    try {
      const updates: Partial<Task> = {};

      // Only include changed + permitted fields
      if (name !== (task.name || "") && canEditFieldForTask("name")) {
        updates.name = name;
      }
      if (description !== (task.description || "") && canEditFieldForTask("description")) {
        updates.description = description;
      }
      if (status !== (task.status || "Not Started") && canEditFieldForTask("status")) {
        updates.status = status as Task["status"];
      }
      if (priority !== (task.priority || "Medium") && canEditFieldForTask("priority")) {
        updates.priority = priority as Task["priority"];
      }
      if (levelOfEffort !== (task.levelOfEffort || "") && canEditFieldForTask("levelOfEffort")) {
        updates.levelOfEffort = levelOfEffort as Task["levelOfEffort"];
      }

      const taskDueDate = task.due ? parseISO(task.due) : undefined;
      const dueDateChanged = dueDate?.toISOString()?.split("T")[0] !== taskDueDate?.toISOString()?.split("T")[0];
      if (dueDateChanged && canEditFieldForTask("due")) {
        updates.due = dueDate ? format(dueDate, "yyyy-MM-dd") : undefined;
      }

      // Handle assignee changes
      const assigneeChanged = selectedAssigneeId !== (task.assignedTo?.[0]?.id || "");
      if (assigneeChanged && canEditFieldForTask("assignedTo")) {
        // BaseQL expects an array of IDs for linked records (cast to any since type expects Contact[])
        (updates as Record<string, unknown>).assignedTo = selectedAssigneeId ? [selectedAssigneeId] : [];
      }

      if (Object.keys(updates).length > 0) {
        await onTaskUpdate(task.id, updates);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!task || !onTaskDelete) return;

    setIsDeleting(true);
    try {
      await onTaskDelete(task.id);
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting task:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle add progress update
  const handleAddUpdate = async () => {
    if (!task || !updateMessage.trim()) return;

    setIsAddingUpdate(true);
    try {
      await onCreateUpdate({
        taskId: task.id,
        authorId: userContactId,
        health: updateHealth,
        message: updateMessage.trim(),
      });
      setShowAddUpdate(false);
      setUpdateHealth("On Track");
      setUpdateMessage("");
    } catch (error) {
      console.error("Error adding update:", error);
    } finally {
      setIsAddingUpdate(false);
    }
  };

  // Get updates to display
  const updates = task?.updates || [];
  const displayedUpdates = showAllUpdates ? updates : updates.slice(0, 3);
  const hiddenUpdatesCount = updates.length - 3;

  if (!task) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Header: Task Name */}
              <SheetHeader className="p-0 space-y-4">
                <SheetTitle className={cn(canEditFieldForTask("name") && "sr-only")}>
                  {task.name || "Untitled Task"}
                </SheetTitle>
                {canEditFieldForTask("name") && (
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-lg font-semibold h-auto py-2 px-3"
                    placeholder="Task name"
                    disabled={isSubmitting}
                    aria-label="Task name"
                  />
                )}
                <SheetDescription className="sr-only">
                  View and edit task details
                </SheetDescription>

                {/* Status Badges Row */}
                <div className="flex flex-wrap gap-2">
                  {/* Status */}
                  {canEditFieldForTask("status") ? (
                    <StatusSelector
                      value={status as StatusType}
                      onChange={setStatus}
                      disabled={isSubmitting}
                    />
                  ) : (
                    <Badge variant="outline">{status}</Badge>
                  )}

                  {/* Priority */}
                  {canEditFieldForTask("priority") ? (
                    <PrioritySelector
                      value={priority as Priority}
                      onChange={setPriority}
                      disabled={isSubmitting}
                    />
                  ) : (
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG]?.color,
                        color: PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG]?.color,
                      }}
                    >
                      {priority}
                    </Badge>
                  )}

                  {/* Level of Effort */}
                  {canEditFieldForTask("levelOfEffort") ? (
                    <EffortSelector
                      value={levelOfEffort as LevelOfEffort | undefined}
                      onChange={(value) => setLevelOfEffort(value || "")}
                      disabled={isSubmitting}
                    />
                  ) : levelOfEffort ? (
                    <Badge variant="secondary">{levelOfEffort}</Badge>
                  ) : null}

                  {/* Due Date - inline in the badges row */}
                  {canEditFieldForTask("due") ? (
                    <DueDatePicker
                      value={dueDate ? format(dueDate, "yyyy-MM-dd") : undefined}
                      onChange={(value) => setDueDate(value ? parseISO(value) : undefined)}
                      disabled={isSubmitting}
                    />
                  ) : dueDate ? (
                    <Badge variant="outline" className="gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {format(dueDate, "MMM d")}
                    </Badge>
                  ) : null}
                </div>
              </SheetHeader>

              <Separator />

              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className={cn(!canEditFieldForTask("description") && "text-muted-foreground")}>
                    Description
                  </Label>
                  {!canEditFieldForTask("description") && isEditable && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                {canEditFieldForTask("description") ? (
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description..."
                    rows={3}
                    disabled={isSubmitting}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {description || "No description"}
                  </p>
                )}
              </div>

              <Separator />

              {/* Metadata */}
              <div className="space-y-4">
                {/* Assignee */}
                <div className="flex items-center justify-between">
                  <Label className={cn(!canEditFieldForTask("assignedTo") && "text-muted-foreground")}>
                    Assignee
                  </Label>
                  {canEditFieldForTask("assignedTo") && teamMembers.length > 0 ? (
                    <Select
                      value={selectedAssigneeId || "__unassigned__"}
                      onValueChange={(value) => setSelectedAssigneeId(value === "__unassigned__" ? "" : value)}
                      disabled={isSubmitting || isLoadingMembers}
                    >
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue placeholder="Select assignee">
                          {selectedAssigneeId ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-xs">
                                  {teamMembers.find(m => m.contact.id === selectedAssigneeId)?.contact.fullName?.charAt(0) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">
                                {teamMembers.find(m => m.contact.id === selectedAssigneeId)?.contact.fullName || "Unknown"}
                              </span>
                            </div>
                          ) : (
                            "Unassigned"
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unassigned__">Unassigned</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.contact.id} value={member.contact.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-xs">
                                  {member.contact.fullName?.charAt(0) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span>{member.contact.fullName}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      {task.assignedTo?.[0] ? (
                        <>
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {task.assignedTo[0].fullName?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{task.assignedTo[0].fullName}</span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Team */}
                {task.team?.[0] && (
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Team</Label>
                    <Link
                      href={`/teams/${task.team[0].id}`}
                      className="text-sm hover:underline flex items-center gap-1"
                    >
                      {task.team[0].teamName}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}

                {/* Session */}
                {task.session?.[0] && (
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Session</Label>
                    <Link
                      href={`/sessions/${task.session[0].id}`}
                      className="text-sm hover:underline flex items-center gap-1"
                    >
                      {task.session[0].sessionType || "Session"}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}

                {/* Source */}
                {task.source && (
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Source</Label>
                    <span className="text-sm">{task.source}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Progress Updates */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    Progress Updates {updates.length > 0 && `(${updates.length})`}
                  </h3>
                  {isEditable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddUpdate(!showAddUpdate)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Update
                    </Button>
                  )}
                </div>

                {/* Add Update Form */}
                {showAddUpdate && (
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                    <div className="space-y-2">
                      <Label>How is this task progressing?</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(HEALTH_CONFIG) as HealthStatus[]).map((h) => {
                          const config = HEALTH_CONFIG[h];
                          const Icon = config.icon;
                          return (
                            <Button
                              key={h}
                              type="button"
                              variant={updateHealth === h ? "default" : "outline"}
                              size="sm"
                              className="justify-start"
                              onClick={() => setUpdateHealth(h)}
                            >
                              <Icon className={cn("h-4 w-4 mr-2", updateHealth !== h && config.color)} />
                              {h}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>What&apos;s the latest?</Label>
                      <Textarea
                        value={updateMessage}
                        onChange={(e) => setUpdateMessage(e.target.value)}
                        placeholder="Share progress, blockers, or next steps..."
                        rows={3}
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {updateMessage.length}/500
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAddUpdate(false);
                          setUpdateMessage("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddUpdate}
                        disabled={!updateMessage.trim() || isAddingUpdate}
                      >
                        {isAddingUpdate ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          "Post Update"
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Updates Timeline */}
                {updates.length > 0 ? (
                  <div className="space-y-3">
                    {displayedUpdates.map((update) => (
                      <UpdateItem key={update.id} update={update} />
                    ))}
                    {hiddenUpdatesCount > 0 && !showAllUpdates && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowAllUpdates(true)}
                      >
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show {hiddenUpdatesCount} more update{hiddenUpdatesCount > 1 ? "s" : ""}
                      </Button>
                    )}
                    {showAllUpdates && updates.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowAllUpdates(false)}
                      >
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Show less
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No updates yet. Add one to track progress.
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <SheetFooter className="border-t px-6 py-4">
            <div className="flex w-full items-center justify-between">
              <div>
                {canDelete && onTaskDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {hasChanges ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleOpenChange(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSubmitting || !isEditable}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                )}
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{task.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowUnsavedDialog(false);
                setPendingClose(false);
              }}
            >
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUnsavedDialog(false);
                setPendingClose(false);
                onOpenChange(false);
              }}
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Sub-component for individual update
function UpdateItem({ update }: { update: Update }) {
  const health = update.health as HealthStatus | undefined;
  const config = health ? HEALTH_CONFIG[health] : null;
  const Icon = config?.icon || CheckCircle2;
  const author = update.author?.[0];

  return (
    <div className="flex gap-3 text-sm">
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          config?.bg || "bg-muted"
        )}
      >
        <Icon className={cn("h-4 w-4", config?.color || "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className={cn("font-medium", config?.color)}>{health || "Update"}</span>
          <span>·</span>
          <span>
            {update.created
              ? format(parseISO(update.created), "MMM d, yyyy")
              : "Unknown date"}
          </span>
          {author && (
            <>
              <span>·</span>
              <span>{author.fullName}</span>
            </>
          )}
        </div>
        <p className="mt-1 text-foreground whitespace-pre-wrap">{update.message}</p>
      </div>
    </div>
  );
}
