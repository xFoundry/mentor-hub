"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserType } from "@/hooks/use-user-type";
import { useSessions } from "@/hooks/use-sessions";
import { useUserTeam, useTeamMembers } from "@/hooks/use-team-members";
import { useTeams } from "@/hooks/use-teams";
import { useCohortContext } from "@/contexts/cohort-context";
import { ArrowLeft, Save, CheckSquare, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createTask as createTaskApi } from "@/lib/baseql";
import { hasPermission } from "@/lib/permissions";
import Link from "next/link";

export function CreateTaskForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSessionId = searchParams.get("session");

  const { userContext, userType, isLoading: isUserLoading } = useUserType();
  const { sessions, isLoading: isSessionsLoading } = useSessions(userContext?.email);

  // For students: get their team and team members
  const { teamId: studentTeamId, isLoading: isTeamLoading } = useUserTeam(userContext?.email);

  // For staff: get teams filtered by selected cohort
  const isStaff = userType === "staff";
  const { selectedCohortId } = useCohortContext();
  const { teams: allTeams, isLoading: isTeamsLoading } = useTeams(isStaff ? selectedCohortId : undefined);

  // Selected team ID - for students it's their team, for staff it's selected from dropdown
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  // Get team members based on selected team (for staff) or student's team
  const effectiveTeamId = isStaff ? selectedTeamId : studentTeamId;
  const { members: teamMembers, isLoading: isMembersLoading } = useTeamMembers(effectiveTeamId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("Medium");
  const [status, setStatus] = useState<string>("Not Started");
  const [levelOfEffort, setLevelOfEffort] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>(preselectedSessionId || "");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isStudent = userType === "student";

  const isLoading = isUserLoading || isSessionsLoading ||
    (isStudent && (isTeamLoading || isMembersLoading)) ||
    (isStaff && isTeamsLoading);

  // Get available assignees based on user type
  const availableAssignees = (() => {
    // Students and staff use team members
    if (isStudent || isStaff) {
      return teamMembers.map((m) => ({
        id: m.contact?.id || "",
        fullName: m.contact?.fullName || "Unknown",
        email: m.contact?.email,
        isSelf: m.contact?.email === userContext?.email,
      })).filter((a) => a.id);
    }
    // Mentors use students from their sessions
    return sessions
      .flatMap((s) => s.students || [])
      .filter((student, index, self) =>
        index === self.findIndex((s) => s.id === student.id)
      )
      .map((s) => ({
        id: s.id,
        fullName: s.fullName || "Unknown",
        email: s.email,
        isSelf: false,
      }));
  })();

  // Auto-select student if session is preselected (for mentors)
  useEffect(() => {
    if (preselectedSessionId && sessions.length > 0 && !isStudent) {
      const session = sessions.find((s) => s.id === preselectedSessionId);
      if (session && session.students && session.students.length > 0) {
        setSelectedAssigneeId(session.students[0].id);
      }
    }
  }, [preselectedSessionId, sessions, isStudent]);

  // Clear team and assignee when cohort changes (for staff)
  useEffect(() => {
    if (isStaff) {
      setSelectedTeamId("");
      setSelectedAssigneeId("");
    }
  }, [selectedCohortId, isStaff]);

  // Clear assignee when team changes (for staff)
  useEffect(() => {
    if (isStaff) {
      setSelectedAssigneeId("");
    }
  }, [selectedTeamId, isStaff]);

  // Auto-select self for students
  useEffect(() => {
    if (isStudent && userContext && teamMembers.length > 0) {
      const selfMember = teamMembers.find((m) => m.contact?.email === userContext.email);
      if (selfMember?.contact?.id) {
        setSelectedAssigneeId(selfMember.contact.id);
      }
    }
  }, [isStudent, userContext, teamMembers]);

  // Check permission
  if (!isLoading && userType && !hasPermission(userType, "task", "create")) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              You do not have permission to create tasks.
            </p>
            <Button asChild className="mt-4">
              <Link href="/tasks">Back to Tasks</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please provide a task name");
      return;
    }

    if (isStaff && !selectedTeamId) {
      toast.error("Please select a team");
      return;
    }

    if (!selectedAssigneeId) {
      toast.error(isStudent ? "Please select who to assign this task to" : "Please select a team member to assign the task to");
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
      router.push("/tasks");
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Action Item</h1>
        <p className="text-muted-foreground mt-2">
          {isStudent
            ? "Create a task for yourself or a teammate"
            : "Assign a new task to a mentee"}
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="space-y-6 py-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Task Details
              </CardTitle>
              <CardDescription>
                Provide information about the action item
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Task Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Task Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Complete project proposal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description
                  <span className="text-muted-foreground ml-1 font-normal">(Optional)</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Provide details about what needs to be done..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Team Selection - only for staff */}
              {isStaff && (
                <div className="space-y-2">
                  <Label htmlFor="team">
                    Team <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedTeamId}
                    onValueChange={setSelectedTeamId}
                    required
                  >
                    <SelectTrigger id="team">
                      <SelectValue placeholder="Select a team..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.teamName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Assign To */}
              <div className="space-y-2">
                <Label htmlFor="assignee">
                  Assign To <span className="text-destructive">*</span>
                </Label>
                {isStaff && selectedTeamId && isMembersLoading ? (
                  <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading team members...</span>
                  </div>
                ) : (
                  <Select
                    value={selectedAssigneeId}
                    onValueChange={setSelectedAssigneeId}
                    required
                    disabled={isStaff && !selectedTeamId}
                  >
                    <SelectTrigger id="assignee">
                      <SelectValue placeholder={
                        isStaff && !selectedTeamId
                          ? "Select a team first..."
                          : isStudent
                            ? "Select yourself or a teammate..."
                            : "Select a team member..."
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAssignees.map((assignee) => (
                        <SelectItem key={assignee.id} value={assignee.id}>
                          {assignee.fullName}
                          {assignee.isSelf && " (me)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {isStudent && (
                  <p className="text-xs text-muted-foreground">
                    You can assign tasks to yourself or any of your teammates
                  </p>
                )}
                {isStaff && selectedTeamId && teamMembers.length === 0 && !isMembersLoading && (
                  <p className="text-xs text-muted-foreground">
                    No members found in this team
                  </p>
                )}
              </div>

              {/* Related Session - only for mentors */}
              {!isStudent && (
                <div className="space-y-2">
                  <Label htmlFor="session">
                    Related Session
                    <span className="text-muted-foreground ml-1 font-normal">(Optional)</span>
                  </Label>
                  <Select
                    value={selectedSessionId}
                    onValueChange={setSelectedSessionId}
                  >
                    <SelectTrigger id="session">
                      <SelectValue placeholder="Select a session..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.sessionType} - {session.sessionId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                {/* Priority */}
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={setPriority}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={setStatus}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Blocked">Blocked</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Level of Effort */}
                <div className="space-y-2">
                  <Label htmlFor="effort">
                    Level of Effort
                    <span className="text-muted-foreground ml-1 font-normal">(Optional)</span>
                  </Label>
                  <Select
                    value={levelOfEffort}
                    onValueChange={setLevelOfEffort}
                  >
                    <SelectTrigger id="effort">
                      <SelectValue placeholder="Select effort..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XS">{"XS (< 30 min)"}</SelectItem>
                      <SelectItem value="S">S (30 min - 1 hour)</SelectItem>
                      <SelectItem value="M">M (1-4 hours)</SelectItem>
                      <SelectItem value="L">L (4-8 hours)</SelectItem>
                      <SelectItem value="XL">{"XL (> 8 hours)"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label htmlFor="dueDate">
                    Due Date
                    <span className="text-muted-foreground ml-1 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting || !name.trim() || !selectedAssigneeId || (isStaff && !selectedTeamId)}
                  className="flex-1"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Creating..." : "Create Task"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
