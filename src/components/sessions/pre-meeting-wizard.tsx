"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  ListTodo,
  FileEdit,
  Send,
  TrendingUp,
  AlertTriangle,
  XCircle,
  ChevronDown,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusSelector, type TaskStatus } from "@/components/tasks/create-task-dialog";
import type { Session, Task } from "@/types/schema";
import { useCreatePreMeetingSubmission } from "@/hooks/use-pre-meeting-submission";

// Number of tasks to show at a time
const TASKS_PER_PAGE = 3;

// Health status configuration (matching TaskDetailSheet)
const HEALTH_CONFIG = {
  "On Track": { icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
  "At Risk": { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-100" },
  "Off Track": { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  "Completed": { icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-100" },
} as const;

type HealthStatus = keyof typeof HEALTH_CONFIG;

interface TaskStatusUpdate {
  taskId: string;
  newStatus: string;
}

interface PreMeetingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  tasks: Task[];
  contactId: string;
  onTasksUpdate: (updates: TaskStatusUpdate[]) => Promise<void>;
  onCreateUpdate?: (input: {
    taskId: string;
    authorId: string;
    health: string;
    message: string;
  }) => Promise<void>;
}

export function PreMeetingWizard({
  open,
  onOpenChange,
  session,
  tasks,
  contactId,
  onTasksUpdate,
  onCreateUpdate,
}: PreMeetingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createSubmission } = useCreatePreMeetingSubmission();

  // Pagination state for tasks
  const [visibleTaskCount, setVisibleTaskCount] = useState(TASKS_PER_PAGE);

  // Task status updates state (for changing task status)
  const [taskStatusUpdates, setTaskStatusUpdates] = useState<Record<string, TaskStatus>>({});

  // Task progress updates state (for adding progress update messages)
  const [taskProgressUpdates, setTaskProgressUpdates] = useState<Record<string, { health: HealthStatus; message: string }>>({});

  // Track which task cards are expanded to show the update form
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Pre-meeting prep state
  const [agendaItems, setAgendaItems] = useState("");
  const [questions, setQuestions] = useState("");
  const [topicsToDiscuss, setTopicsToDiscuss] = useState("");
  const [materialsLinks, setMaterialsLinks] = useState("");

  // Filter and sort tasks: show incomplete tasks sorted by due date
  const relevantTasks = useMemo(() => {
    return tasks
      .filter((task) => task.status !== "Completed" && task.status !== "Cancelled")
      .sort((a, b) => {
        // Tasks with due dates come first, sorted chronologically
        if (a.due && b.due) {
          return new Date(a.due).getTime() - new Date(b.due).getTime();
        }
        // Tasks with due dates before tasks without
        if (a.due && !b.due) return -1;
        if (!a.due && b.due) return 1;
        // Both without due dates - sort by name
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [tasks]);

  // Get visible tasks based on pagination
  const visibleTasks = relevantTasks.slice(0, visibleTaskCount);
  const remainingTaskCount = relevantTasks.length - visibleTaskCount;
  const hasMoreTasks = remainingTaskCount > 0;

  const totalSteps = 2;
  const progress = (currentStep / totalSteps) * 100;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setVisibleTaskCount(TASKS_PER_PAGE);
      setTaskStatusUpdates({});
      setTaskProgressUpdates({});
      setExpandedTasks(new Set());
      setAgendaItems("");
      setQuestions("");
      setTopicsToDiscuss("");
      setMaterialsLinks("");
    }
  }, [open]);

  const handleShowMoreTasks = () => {
    setVisibleTaskCount((prev) => prev + TASKS_PER_PAGE);
  };

  const handleTaskStatusChange = (taskId: string, status: TaskStatus) => {
    setTaskStatusUpdates((prev) => ({
      ...prev,
      [taskId]: status,
    }));
  };

  const handleTaskProgressChange = (taskId: string, field: "health" | "message", value: string) => {
    setTaskProgressUpdates((prev) => ({
      ...prev,
      [taskId]: {
        health: field === "health" ? (value as HealthStatus) : (prev[taskId]?.health || "On Track"),
        message: field === "message" ? value : (prev[taskId]?.message || ""),
      },
    }));
  };

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // First, update task statuses if any were changed
      const changedStatuses = Object.entries(taskStatusUpdates)
        .filter(([taskId, newStatus]) => {
          const task = tasks.find((t) => t.id === taskId);
          return task && task.status !== newStatus;
        })
        .map(([taskId, newStatus]) => ({ taskId, newStatus }));

      if (changedStatuses.length > 0) {
        await onTasksUpdate(changedStatuses);
      }

      // Then, create progress updates for tasks that have messages
      if (onCreateUpdate) {
        const progressUpdates = Object.entries(taskProgressUpdates)
          .filter(([, update]) => update.message.trim())
          .map(([taskId, update]) => ({
            taskId,
            authorId: contactId,
            health: update.health,
            message: update.message.trim(),
          }));

        for (const update of progressUpdates) {
          await onCreateUpdate(update);
        }
      }

      // Finally, create the pre-meeting submission
      await createSubmission({
        sessionId: session.id,
        respondantId: contactId,
        agendaItems: agendaItems.trim() || undefined,
        questions: questions.trim() || undefined,
        topicsToDiscuss: topicsToDiscuss.trim() || undefined,
        materialsLinks: materialsLinks.trim() || undefined,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting pre-meeting prep:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = agendaItems.trim() || questions.trim() || topicsToDiscuss.trim();

  // Count tasks with progress updates
  const tasksWithUpdates = Object.values(taskProgressUpdates).filter((u) => u.message.trim()).length;

  // Format due date for display
  const formatDueDate = (due: string) => {
    const date = new Date(due);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d overdue`, className: "text-red-600" };
    } else if (diffDays === 0) {
      return { text: "Due today", className: "text-amber-600" };
    } else if (diffDays === 1) {
      return { text: "Due tomorrow", className: "text-amber-600" };
    } else if (diffDays <= 7) {
      return { text: `Due in ${diffDays}d`, className: "text-muted-foreground" };
    } else {
      return { text: date.toLocaleDateString(), className: "text-muted-foreground" };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStep === 1 ? (
              <ListTodo className="h-5 w-5" />
            ) : (
              <FileEdit className="h-5 w-5" />
            )}
            Pre-Meeting Preparation
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1
              ? "Update your task progress before the meeting"
              : "Share what you'd like to discuss in the session"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-muted-foreground">
              {currentStep === 1 ? "Task Updates" : "Meeting Prep"}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between">
            <div className="flex items-center gap-2 text-sm">
              {currentStep > 1 ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Circle className="h-4 w-4 text-primary" />
              )}
              <span className={currentStep === 1 ? "font-medium" : "text-muted-foreground"}>
                Tasks
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {currentStep === 2 ? (
                <Circle className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={currentStep === 2 ? "font-medium" : "text-muted-foreground"}>
                Prep
              </span>
            </div>
          </div>
        </div>

        {/* Step 1: Task Updates */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Review and update the status of your team&apos;s tasks.
              </p>
              {relevantTasks.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {relevantTasks.length} task{relevantTasks.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            {relevantTasks.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-green-600 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No pending tasks to update. Great job!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {visibleTasks.map((task) => {
                  const isExpanded = expandedTasks.has(task.id);
                  const hasUpdate = taskProgressUpdates[task.id]?.message?.trim();
                  const currentStatus = (taskStatusUpdates[task.id] || task.status || "Not Started") as TaskStatus;
                  const dueInfo = task.due ? formatDueDate(task.due) : null;

                  return (
                    <Card key={task.id} className={cn(hasUpdate && "ring-1 ring-primary/50")}>
                      <Collapsible open={isExpanded} onOpenChange={() => toggleTaskExpanded(task.id)}>
                        <CardContent className="py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{task.name}</p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {dueInfo && (
                                  <span className={cn("flex items-center gap-1 text-xs", dueInfo.className)}>
                                    <Calendar className="h-3 w-3" />
                                    {dueInfo.text}
                                  </span>
                                )}
                                {hasUpdate && (
                                  <Badge variant="secondary" className="text-xs">
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    Update added
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <StatusSelector
                                value={currentStatus}
                                onChange={(value) => handleTaskStatusChange(task.id, value)}
                              />
                            </div>
                          </div>

                          {/* Expand/collapse trigger for progress update */}
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <ChevronDown className={cn(
                                "h-4 w-4 mr-1 transition-transform",
                                isExpanded && "rotate-180"
                              )} />
                              {isExpanded ? "Hide progress update" : "Add progress update"}
                            </Button>
                          </CollapsibleTrigger>

                          {/* Progress Update Form */}
                          <CollapsibleContent className="mt-3">
                            <div className="border-t pt-3 space-y-3">
                              <div className="space-y-2">
                                <Label className="text-xs">How is this task progressing?</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  {(Object.keys(HEALTH_CONFIG) as HealthStatus[]).map((h) => {
                                    const config = HEALTH_CONFIG[h];
                                    const Icon = config.icon;
                                    const isSelected = (taskProgressUpdates[task.id]?.health || "On Track") === h;
                                    return (
                                      <Button
                                        key={h}
                                        type="button"
                                        variant={isSelected ? "default" : "outline"}
                                        size="sm"
                                        className="justify-start text-xs h-8"
                                        onClick={() => handleTaskProgressChange(task.id, "health", h)}
                                      >
                                        <Icon className={cn("h-3 w-3 mr-1", !isSelected && config.color)} />
                                        {h}
                                      </Button>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">What&apos;s the latest on this task?</Label>
                                <Textarea
                                  value={taskProgressUpdates[task.id]?.message || ""}
                                  onChange={(e) => handleTaskProgressChange(task.id, "message", e.target.value)}
                                  placeholder="Share progress, blockers, or next steps..."
                                  rows={2}
                                  className="text-sm"
                                  maxLength={500}
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                  {(taskProgressUpdates[task.id]?.message || "").length}/500
                                </p>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </CardContent>
                      </Collapsible>
                    </Card>
                  );
                })}

                {/* Show More button */}
                {hasMoreTasks && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleShowMoreTasks}
                  >
                    Show {Math.min(TASKS_PER_PAGE, remainingTaskCount)} more
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {remainingTaskCount} remaining
                    </Badge>
                  </Button>
                )}

                {tasksWithUpdates > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {tasksWithUpdates} task{tasksWithUpdates !== 1 ? "s" : ""} with progress updates
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Pre-Meeting Prep Fields */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share your thoughts and questions to help make the most of your session time.
            </p>

            <div className="space-y-2">
              <Label htmlFor="agendaItems">
                Agenda Items
                <span className="text-muted-foreground ml-1 font-normal">(Recommended)</span>
              </Label>
              <Textarea
                id="agendaItems"
                placeholder="What specific topics or goals would you like to cover in this session?"
                value={agendaItems}
                onChange={(e) => setAgendaItems(e.target.value)}
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="questions">
                Questions for Mentor
                <span className="text-muted-foreground ml-1 font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="questions"
                placeholder="What questions do you have for your mentor?"
                value={questions}
                onChange={(e) => setQuestions(e.target.value)}
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topicsToDiscuss">
                Topics to Discuss
                <span className="text-muted-foreground ml-1 font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="topicsToDiscuss"
                placeholder="Any challenges, blockers, or wins you want to share?"
                value={topicsToDiscuss}
                onChange={(e) => setTopicsToDiscuss(e.target.value)}
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="materialsLinks">
                Materials or Links
                <span className="text-muted-foreground ml-1 font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="materialsLinks"
                placeholder="Links to documents, designs, code, or other materials you'd like to review"
                value={materialsLinks}
                onChange={(e) => setMaterialsLinks(e.target.value)}
                rows={2}
                disabled={isSubmitting}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
          </div>

          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={handleNext}
                className="flex-1 sm:flex-none"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !canSubmit}
                className="flex-1 sm:flex-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Prep
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
