"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useCreateTaskDialog } from "@/contexts/create-task-dialog-context";
import { useUserType } from "@/hooks/use-user-type";
import { useSessions } from "@/hooks/use-sessions";
import { useUserTeam, useTeamMembers } from "@/hooks/use-team-members";
import { useTeams } from "@/hooks/use-teams";
import { useCohortContext } from "@/contexts/cohort-context";
import { createTask as createTaskApi } from "@/lib/baseql";
import { hasPermission } from "@/lib/permissions";

import { TaskNameInput } from "./task-name-input";
import { TaskDescriptionInput } from "./task-description-input";
import { PrioritySelector, type Priority } from "./priority-selector";
import { StatusSelector, type TaskStatus } from "./status-selector";
import { EffortSelector, type LevelOfEffort } from "./effort-selector";
import { DueDatePicker } from "./due-date-picker";
import { TeamCommandSelect } from "./team-command-select";
import { AssigneeCommandSelect, type Assignee } from "./assignee-command-select";
import { SessionCommandSelect } from "./session-command-select";

export function CreateTaskDialog() {
  const {
    isOpen,
    closeDialog,
    createAnother,
    setCreateAnother,
    defaultTeamId,
    defaultSessionId,
    defaultAssigneeId,
  } = useCreateTaskDialog();

  const { userContext, userType, isLoading: isUserLoading } = useUserType();
  const { sessions, isLoading: isSessionsLoading } = useSessions(userContext?.email);
  const { selectedCohortId } = useCohortContext();

  // For students: get their team
  const { teamId: studentTeamId, isLoading: isTeamLoading } = useUserTeam(
    userContext?.email
  );

  // For staff: get teams filtered by selected cohort
  const isStaff = userType === "staff";
  const isStudent = userType === "student";
  const { teams: allTeams, isLoading: isTeamsLoading } = useTeams(
    isStaff ? selectedCohortId : undefined
  );

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [status, setStatus] = useState<TaskStatus>("Not Started");
  const [levelOfEffort, setLevelOfEffort] = useState<LevelOfEffort | undefined>(undefined);
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Effective team ID - for students it's their team, for staff it's selected from dropdown
  const effectiveTeamId = isStaff ? selectedTeamId : studentTeamId;

  // Get team members based on effective team
  const { members: teamMembers, isLoading: isMembersLoading } = useTeamMembers(effectiveTeamId);

  // Get available assignees based on user type
  const availableAssignees: Assignee[] = (() => {
    // Students and staff use team members
    if (isStudent || isStaff) {
      return teamMembers
        .map((m) => ({
          id: m.contact?.id || "",
          fullName: m.contact?.fullName || "Unknown",
          email: m.contact?.email,
          headshot: m.contact?.headshot?.[0]?.url,
          isSelf: m.contact?.email === userContext?.email,
        }))
        .filter((a) => a.id);
    }
    // Mentors use students from their sessions
    return sessions
      .flatMap((s) => s.students || [])
      .filter((student, index, self) => index === self.findIndex((s) => s.id === student.id))
      .map((s) => ({
        id: s.id,
        fullName: s.fullName || "Unknown",
        email: s.email,
        headshot: s.headshot?.[0]?.url,
        isSelf: false,
      }));
  })();

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setPriority("Medium");
      setStatus("Not Started");
      setLevelOfEffort(undefined);
      setDueDate(undefined);
      setSelectedTeamId(defaultTeamId || "");
      setSelectedAssigneeId(defaultAssigneeId || "");
      setSelectedSessionId(defaultSessionId);
      // Focus name input after a short delay
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultTeamId, defaultAssigneeId, defaultSessionId]);

  // Auto-select self for students
  useEffect(() => {
    if (isOpen && isStudent && userContext && teamMembers.length > 0 && !selectedAssigneeId) {
      const selfMember = teamMembers.find((m) => m.contact?.email === userContext.email);
      if (selfMember?.contact?.id) {
        setSelectedAssigneeId(selfMember.contact.id);
      }
    }
  }, [isOpen, isStudent, userContext, teamMembers, selectedAssigneeId]);

  // Clear team and assignee when cohort changes (for staff)
  useEffect(() => {
    if (isOpen && isStaff) {
      setSelectedTeamId("");
      setSelectedAssigneeId("");
    }
  }, [selectedCohortId, isStaff, isOpen]);

  // Clear assignee when team changes (for staff)
  useEffect(() => {
    if (isStaff && selectedTeamId) {
      setSelectedAssigneeId("");
    }
  }, [selectedTeamId, isStaff]);

  // Check permission
  const canCreate = userType && hasPermission(userType, "task", "create");

  const isValid = name.trim() && selectedAssigneeId && (!isStaff || selectedTeamId);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPriority("Medium");
    setStatus("Not Started");
    setLevelOfEffort(undefined);
    setDueDate(undefined);
    // For staff, preserve team selection when creating another
    if (!isStaff) {
      setSelectedTeamId("");
    }
    setSelectedAssigneeId("");
    setSelectedSessionId(undefined);
    // Focus name input
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!name.trim()) {
      toast.error("Please provide a task name");
      return;
    }

    if (isStaff && !selectedTeamId) {
      toast.error("Please select a team");
      return;
    }

    if (!selectedAssigneeId) {
      toast.error(
        isStudent
          ? "Please select who to assign this task to"
          : "Please select a team member to assign the task to"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await createTaskApi({
        name: name.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        levelOfEffort: levelOfEffort || undefined,
        due: dueDate || undefined,
        assignedToId: selectedAssigneeId,
        teamId: effectiveTeamId || undefined,
        sessionId: selectedSessionId || undefined,
      });

      toast.success("Task created successfully");

      if (createAnother) {
        resetForm();
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && isValid && !isSubmitting) {
      handleSubmit();
    }
  };

  // Don't render if user doesn't have permission
  if (!isUserLoading && !canCreate) {
    return null;
  }

  const isLoading =
    isUserLoading ||
    isSessionsLoading ||
    (isStudent && isTeamLoading) ||
    (isStaff && isTeamsLoading);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && closeDialog()}>
      <DialogContent
        className="sm:max-w-[480px] gap-0"
        onKeyDown={handleKeyDown}
      >
        {/* Loading overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div>
                <p className="font-medium">Creating task...</p>
                <p className="text-sm text-muted-foreground">Please wait</p>
              </div>
            </div>
          </div>
        )}

        <DialogHeader className="pb-4">
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Task Name */}
            <TaskNameInput
              ref={nameInputRef}
              value={name}
              onChange={setName}
              placeholder="Task name"
            />

            {/* Description */}
            <TaskDescriptionInput
              value={description}
              onChange={setDescription}
            />

            {/* Pill selectors row */}
            <div className="flex flex-wrap gap-2 pt-2">
              <PrioritySelector value={priority} onChange={setPriority} />
              <StatusSelector value={status} onChange={setStatus} />
              <EffortSelector value={levelOfEffort} onChange={setLevelOfEffort} />
              <DueDatePicker value={dueDate} onChange={setDueDate} />
            </div>

            {/* Team selector - staff only */}
            {isStaff && (
              <TeamCommandSelect
                value={selectedTeamId}
                onChange={setSelectedTeamId}
                teams={allTeams}
                isLoading={isTeamsLoading}
                placeholder="Select team..."
              />
            )}

            {/* Assignee selector */}
            <AssigneeCommandSelect
              value={selectedAssigneeId}
              onChange={setSelectedAssigneeId}
              assignees={availableAssignees}
              isLoading={isStaff && !!selectedTeamId && isMembersLoading}
              disabled={isStaff && !selectedTeamId}
              placeholder={
                isStaff && !selectedTeamId
                  ? "Select a team first..."
                  : isStudent
                  ? "Assign to..."
                  : "Assign to..."
              }
              emptyMessage={
                isStaff && !selectedTeamId
                  ? "Select a team first"
                  : "No members available"
              }
            />

            {/* Session selector - non-students only */}
            {!isStudent && (
              <SessionCommandSelect
                value={selectedSessionId}
                onChange={setSelectedSessionId}
                sessions={sessions}
                isLoading={isSessionsLoading}
                placeholder="Link to session (optional)"
              />
            )}
          </form>
        )}

        <DialogFooter className="pt-4 flex-row items-center">
          <div className="flex items-center gap-2 mr-auto">
            <Checkbox
              id="create-another"
              checked={createAnother}
              onCheckedChange={(checked) => setCreateAnother(checked === true)}
            />
            <Label htmlFor="create-another" className="text-sm font-normal cursor-pointer">
              Create another
            </Label>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={closeDialog}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={() => handleSubmit()}
            disabled={!isValid || isSubmitting || isLoading}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
