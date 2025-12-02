// Main component
export { TaskView, type TaskViewProps, type TaskViewVariant } from "./task-view";

// Detail sheet
export { TaskDetailSheet, type TaskDetailSheetProps } from "./task-detail-sheet";

// Controls
export { TaskViewControls, type TaskViewControlsProps } from "./task-view-controls";

// Views
export { TaskKanbanView, type TaskKanbanViewProps } from "./views/task-kanban-view";
export { TaskListView, type TaskListViewProps } from "./views/task-list-view";
export { TaskTableView, type TaskTableViewProps } from "./views/task-table-view";

// Item renderers
export { TaskKanbanCard, TaskKanbanCardCompact } from "./items/task-kanban-card";
export { TaskListItem, TaskListItemCompact } from "./items/task-list-item";
export { createTaskTableColumns } from "./items/task-table-columns";
export { TaskActions, type TaskActionsProps } from "./items/task-actions";

// Transformers and utilities
export {
  KANBAN_COLUMNS,
  PRIORITY_CONFIG,
  statusToColumnId,
  columnIdToStatus,
  filterTasks,
  sortTasks,
  groupTasks,
  getTaskStats,
  isTaskOverdue,
  formatDueDate,
  transformTaskToKanbanCard,
  transformTasksToKanbanData,
  type KanbanCardData,
  type ListItemData,
  type KanbanColumnId,
  type TaskStatus,
  type TaskPriority,
} from "./task-transformers";
