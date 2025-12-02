import { parseISO, isPast, format } from "date-fns";
import type { Task } from "@/types/schema";
import type { TaskFilter, TaskSort, TaskSortDirection, TaskGroupBy } from "@/hooks/use-task-view-state";
import type { KanbanItemProps } from "@/components/kibo-ui/kanban";

/**
 * Kanban column definitions
 */
export const KANBAN_COLUMNS = [
  { id: "not-started", name: "Not Started", status: "Not Started" as const, color: "#6b7280" },
  { id: "in-progress", name: "In Progress", status: "In Progress" as const, color: "#3b82f6" },
  { id: "completed", name: "Completed", status: "Completed" as const, color: "#22c55e" },
  { id: "cancelled", name: "Cancelled", status: "Cancelled" as const, color: "#ef4444" },
] as const;

export type KanbanColumnId = typeof KANBAN_COLUMNS[number]["id"];
export type TaskStatus = typeof KANBAN_COLUMNS[number]["status"];

/**
 * Priority definitions with colors
 */
export const PRIORITY_CONFIG = {
  Urgent: { order: 0, color: "#ef4444", label: "Urgent" },
  High: { order: 1, color: "#f97316", label: "High" },
  Medium: { order: 2, color: "#eab308", label: "Medium" },
  Low: { order: 3, color: "#3b82f6", label: "Low" },
} as const;

export type TaskPriority = keyof typeof PRIORITY_CONFIG;

/**
 * Kanban card data structure for Kibo UI
 * Extends KanbanItemProps to ensure compatibility with KanbanProvider
 */
export type TaskHealth = "On Track" | "At Risk" | "Off Track" | "Completed";

export interface KanbanCardData extends KanbanItemProps {
  priority?: TaskPriority;
  dueDate?: string;
  isOverdue: boolean;
  assigneeName?: string;
  assigneeEmail?: string;
  teamName?: string;
  teamId?: string;
  sessionType?: string;
  levelOfEffort?: string;
  description?: string;
  latestHealth?: TaskHealth;
  originalTask: Task;
}

/**
 * List item data structure for Kibo UI
 */
export interface ListItemData {
  id: string;
  name: string;
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  isOverdue: boolean;
  assigneeName?: string;
  teamName?: string;
  levelOfEffort?: string;
  originalTask: Task;
}

/**
 * Convert task status to kanban column ID
 */
export function statusToColumnId(status?: string): KanbanColumnId {
  const column = KANBAN_COLUMNS.find(c => c.status === status);
  return column?.id ?? "not-started";
}

/**
 * Convert kanban column ID to task status
 */
export function columnIdToStatus(columnId: string): TaskStatus {
  const column = KANBAN_COLUMNS.find(c => c.id === columnId);
  return column?.status ?? "Not Started";
}

/**
 * Get column configuration by ID
 */
export function getColumnConfig(columnId: string) {
  return KANBAN_COLUMNS.find(c => c.id === columnId);
}

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "Completed" || task.status === "Cancelled") {
    return false;
  }
  try {
    return isPast(parseISO(task.dueDate));
  } catch {
    return false;
  }
}

/**
 * Format due date for display
 */
export function formatDueDate(dueDate?: string): string {
  if (!dueDate) return "";
  try {
    return format(parseISO(dueDate), "MMM d, yyyy");
  } catch {
    return dueDate;
  }
}

/**
 * Transform a Task to KanbanCardData
 */
export function transformTaskToKanbanCard(task: Task): KanbanCardData {
  return {
    id: task.id,
    name: task.name || "Untitled Task",
    column: statusToColumnId(task.status),
    priority: task.priority as TaskPriority | undefined,
    dueDate: task.dueDate,
    isOverdue: isTaskOverdue(task),
    assigneeName: task.assignedTo?.[0]?.fullName,
    assigneeEmail: task.assignedTo?.[0]?.email,
    teamName: task.team?.[0]?.teamName,
    teamId: task.team?.[0]?.id,
    sessionType: task.session?.[0]?.sessionType,
    levelOfEffort: task.levelOfEffort,
    description: task.description,
    latestHealth: task.updates?.[0]?.health as TaskHealth | undefined,
    originalTask: task,
  };
}

/**
 * Transform multiple tasks to KanbanCardData array
 */
export function transformTasksToKanbanData(tasks: Task[]): KanbanCardData[] {
  return tasks.map(transformTaskToKanbanCard);
}

/**
 * Transform a Task to ListItemData
 */
export function transformTaskToListItem(task: Task): ListItemData {
  return {
    id: task.id,
    name: task.name || "Untitled Task",
    status: (task.status as TaskStatus) || "Not Started",
    priority: task.priority as TaskPriority | undefined,
    dueDate: task.dueDate,
    isOverdue: isTaskOverdue(task),
    assigneeName: task.assignedTo?.[0]?.fullName,
    teamName: task.team?.[0]?.teamName,
    levelOfEffort: task.levelOfEffort,
    originalTask: task,
  };
}

/**
 * Filter tasks based on filter type
 */
export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  switch (filter) {
    case "open":
      return tasks.filter(task =>
        task.status === "Not Started" ||
        task.status === "In Progress" ||
        !task.status
      );
    case "completed":
      return tasks.filter(task =>
        task.status === "Completed" || task.status === "Cancelled"
      );
    case "all":
    default:
      return tasks;
  }
}

/**
 * Sort tasks based on sort field and direction
 */
export function sortTasks(
  tasks: Task[],
  sort: TaskSort,
  direction: TaskSortDirection
): Task[] {
  const sorted = [...tasks].sort((a, b) => {
    let comparison = 0;

    switch (sort) {
      case "priority": {
        const aOrder = PRIORITY_CONFIG[a.priority as TaskPriority]?.order ?? 4;
        const bOrder = PRIORITY_CONFIG[b.priority as TaskPriority]?.order ?? 4;
        comparison = aOrder - bOrder;
        break;
      }
      case "dueDate": {
        if (!a.dueDate && !b.dueDate) comparison = 0;
        else if (!a.dueDate) comparison = 1;
        else if (!b.dueDate) comparison = -1;
        else {
          comparison = parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
        }
        break;
      }
      case "created": {
        // Assuming tasks have a created field or we use id as proxy
        comparison = (a.id || "").localeCompare(b.id || "");
        break;
      }
      case "status": {
        const statusOrder = { "Not Started": 0, "In Progress": 1, "Completed": 2, "Cancelled": 3 };
        const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 0;
        const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 0;
        comparison = aOrder - bOrder;
        break;
      }
    }

    return direction === "asc" ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Group tasks by a field
 */
export function groupTasks(tasks: Task[], groupBy: TaskGroupBy): Map<string, Task[]> {
  const groups = new Map<string, Task[]>();

  if (groupBy === "none") {
    groups.set("all", tasks);
    return groups;
  }

  for (const task of tasks) {
    let key: string;

    switch (groupBy) {
      case "status":
        key = task.status || "Not Started";
        break;
      case "priority":
        key = task.priority || "No Priority";
        break;
      case "team":
        key = task.team?.[0]?.teamName || "No Team";
        break;
      case "assignee":
        key = task.assignedTo?.[0]?.fullName || "Unassigned";
        break;
      default:
        key = "all";
    }

    const existing = groups.get(key) || [];
    existing.push(task);
    groups.set(key, existing);
  }

  return groups;
}

/**
 * Get group color based on group type and name
 */
export function getGroupColor(groupBy: TaskGroupBy, groupName: string): string {
  if (groupBy === "status") {
    const column = KANBAN_COLUMNS.find(c => c.status === groupName);
    return column?.color ?? "#6b7280";
  }

  if (groupBy === "priority") {
    return PRIORITY_CONFIG[groupName as TaskPriority]?.color ?? "#6b7280";
  }

  // Default color for team/assignee groups
  return "#6b7280";
}

/**
 * Process tasks with filter, sort, and group
 */
export function processTasks(
  tasks: Task[],
  filter: TaskFilter,
  sort: TaskSort,
  sortDirection: TaskSortDirection,
  groupBy: TaskGroupBy
): { filtered: Task[]; sorted: Task[]; grouped: Map<string, Task[]> } {
  const filtered = filterTasks(tasks, filter);
  const sorted = sortTasks(filtered, sort, sortDirection);
  const grouped = groupTasks(sorted, groupBy);

  return { filtered, sorted, grouped };
}

/**
 * Count tasks by status
 */
export function countByStatus(tasks: Task[]): Record<TaskStatus, number> {
  const counts: Record<TaskStatus, number> = {
    "Not Started": 0,
    "In Progress": 0,
    "Completed": 0,
    "Cancelled": 0,
  };

  for (const task of tasks) {
    const status = (task.status as TaskStatus) || "Not Started";
    counts[status]++;
  }

  return counts;
}

/**
 * Get task statistics
 */
export function getTaskStats(tasks: Task[]) {
  const total = tasks.length;
  const open = tasks.filter(t => t.status !== "Completed" && t.status !== "Cancelled").length;
  const completed = tasks.filter(t => t.status === "Completed").length;
  const overdue = tasks.filter(t => isTaskOverdue(t)).length;
  const byStatus = countByStatus(tasks);

  return {
    total,
    open,
    completed,
    overdue,
    byStatus,
  };
}
